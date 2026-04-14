import { useCallback, useState } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { toast } from "sonner";
import { fetchMappingValue, fetchTransaction } from "@/lib/aleo";
import { CREATE_PROGRAM_ID, LIQUIDITY_PROGRAM_ID, resolveTokenKind } from "@/lib/constants";
import { useRefresh } from "@/context/RefreshContext";

interface WalletRecord {
  spent?: boolean;
  data?: Record<string, unknown>;
  recordPlaintext?: string;
  plaintext?: string;
  [key: string]: unknown;
}

const formatU64 = (value: number): string => `${Math.max(0, Math.floor(value))}u64`;
const normalizeFieldId = (marketId: string): string =>
  marketId.includes("field") ? marketId.replace(/\s+/g, "") : `${marketId.replace(/\s+/g, "")}field`;
const toMicrocredits = (credits: number): number => Math.max(1_000_000, Math.floor(credits * 1_000_000));

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

const isWalletNoResponse = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return error.message.toLowerCase().includes("no response");
};

const requestRecordsWithRetry = async (
  requestRecords: (programId: string, includeUnspent: boolean) => Promise<unknown[]>,
  programId: string,
  retries = 2,
): Promise<unknown[]> => {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestRecords(programId, true);
    } catch (error) {
      if (isWalletNoResponse(error) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      throw error;
    }
  }
  return [];
};

const cleanAleoPrimitive = (value: unknown): string => {
  if (typeof value === "string") {
    return value
      .replace(/u8|u64|u128|field|group|address|\.private|\.public/g, "")
      .replace(/["']/g, "")
      .trim();
  }
  return String(value ?? "");
};

const parseRecordField = (record: WalletRecord, field: string): string => {
  const rawData = record.data ?? record;
  if (typeof rawData === "object" && rawData !== null && (rawData as Record<string, unknown>)[field] !== undefined) {
    return cleanAleoPrimitive((rawData as Record<string, unknown>)[field]);
  }

  const searchPattern = new RegExp(`${field}\\s*:\\s*([^,\\n}]+)`, "i");
  const candidates: unknown[] = [record.recordPlaintext, record.plaintext, record.data, JSON.stringify(record)];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const match = candidate.match(searchPattern);
    if (match) return cleanAleoPrimitive(match[1]);
  }

  return "";
};

const extractRecordAmount = (record: WalletRecord): number => {
  const raw = parseRecordField(record, "microcredits");
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isLikelyRecordPlaintext = (value: string, requiredFields: string[]): boolean =>
  value.includes("{") &&
  value.includes("}") &&
  requiredFields.every((field) => new RegExp(`${field}\\s*:`).test(value));

const extractRecordPlaintextInput = (
  record: WalletRecord,
  requiredFields: string[],
): string | null => {
  const candidates: unknown[] = [record.recordPlaintext, record.plaintext];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const text = candidate.trim();
    if (isLikelyRecordPlaintext(text, requiredFields)) return text;
  }
  return null;
};

const waitForConfirmedTransaction = async (
  requestTransactionHistory: (programId: string) => Promise<any>,
  submittedTransactionId: string,
  existingAtIds: Set<string>,
): Promise<string | null> => {
  let actualTxId = submittedTransactionId.startsWith("at1") ? submittedTransactionId : null;

  for (let attempt = 0; attempt < 15; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 4000));

    if (!actualTxId) {
      const history = await requestTransactionHistory(LIQUIDITY_PROGRAM_ID);
      const txs = history?.transactions ?? [];
      const shieldMatch = txs.find((tx: any) => tx.id === submittedTransactionId);
      if (shieldMatch?.transactionId?.startsWith("at1")) {
        actualTxId = shieldMatch.transactionId;
      }

      if (!actualTxId) {
        actualTxId =
          txs
            .map((tx: any) => tx.transactionId)
            .find((id: string) => id?.startsWith("at1") && !existingAtIds.has(id)) ?? null;
      }
    }

    if (!actualTxId) continue;

    const txData = await fetchTransaction(actualTxId);
    const transitions = txData?.execution?.transitions ?? [];
    const transitionMatch = transitions.find(
      (transition: any) =>
        transition.function === "fund_pool" &&
        (transition.program === LIQUIDITY_PROGRAM_ID ||
          String(transition.program).startsWith(LIQUIDITY_PROGRAM_ID.split(".")[0])),
    );
    if (transitionMatch) return actualTxId;
  }

  return actualTxId;
};

export const useFundPoolTransaction = () => {
  const { address, executeTransaction, requestRecords, requestTransactionHistory } = useWallet();
  const { triggerRefresh } = useRefresh();
  const [loading, setLoading] = useState(false);

  const fundPool = useCallback(
    async (
      marketId: string,
      amountCredits: number,
      tokenId: string,
      marketProgramId?: string,
    ): Promise<string | null> => {
      if (!address) {
        toast.error("Please connect your wallet first");
        return null;
      }

      if (marketProgramId !== CREATE_PROGRAM_ID) {
        toast.error("This funding lane only supports Stage 1 markets.");
        return null;
      }

      if (resolveTokenKind(tokenId) !== "credits") {
        toast.error("This funding experiment currently supports Aleo Credits only.");
        return null;
      }

      setLoading(true);
      const cleanMarketId = normalizeFieldId(marketId);
      const amountMicro = toMicrocredits(amountCredits);

      try {
        const marketConfig = await fetchMappingValue(LIQUIDITY_PROGRAM_ID, "markets", cleanMarketId);
        if (!marketConfig) {
          toast.error("This market is not registered in liquidity_v4 yet.");
          return null;
        }

        const rawRecords = await requestRecordsWithRetry(requestRecords, "credits.aleo");
        const records = rawRecords.filter(
          (entry): entry is WalletRecord => typeof entry === "object" && entry !== null,
        );
        const creditsRecord =
          records.filter((record) => !record.spent).find((record) => extractRecordAmount(record) >= amountMicro) ?? null;

        if (!creditsRecord) {
          toast.error("Insufficient private Aleo Credits balance.");
          return null;
        }

        const creditsInput = extractRecordPlaintextInput(creditsRecord, ["owner", "microcredits"]);
        if (!creditsInput) {
          toast.error("Unable to prepare private credits record input.");
          return null;
        }

        const existingHistory = await requestTransactionHistory(LIQUIDITY_PROGRAM_ID);
        const existingAtIds = new Set(
          (existingHistory?.transactions ?? [])
            .map((tx: any) => tx.transactionId)
            .filter((id: string) => id?.startsWith("at1")),
        );

        const result = await executeTransaction({
          program: LIQUIDITY_PROGRAM_ID,
          function: "fund_pool",
          inputs: [creditsInput, cleanMarketId, formatU64(amountMicro)],
          fee: 1_500_000,
          privateFee: false,
        } as Parameters<typeof executeTransaction>[0]);

        if (!result?.transactionId) return null;

        toast.info("Liquidity funding submitted. Waiting for confirmation...");

        const confirmedTxId = await waitForConfirmedTransaction(
          requestTransactionHistory,
          result.transactionId,
          existingAtIds,
        );

        if (!confirmedTxId) {
          toast.error("Liquidity funding did not confirm in time.");
          return null;
        }

        triggerRefresh();
        toast.success("Liquidity funding confirmed.");
        return confirmedTxId;
      } catch (error) {
        console.error("Liquidity_v4 fund_pool failed:", error, {
          program: LIQUIDITY_PROGRAM_ID,
          function: "fund_pool",
          marketId: cleanMarketId,
          amountMicro,
        });
        toast.error(`Fund pool failed: ${getErrorMessage(error)}`);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [address, executeTransaction, requestRecords, requestTransactionHistory, triggerRefresh],
  );

  return {
    fundPool,
    loading,
  };
};
