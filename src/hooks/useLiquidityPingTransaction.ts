import { useCallback, useState } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { toast } from "sonner";
import { fetchTransaction } from "@/lib/aleo";
import { LIQUIDITY_PROGRAM_ID } from "@/lib/constants";

const randomField = (): string => {
  const seed = crypto.getRandomValues(new Uint32Array(2));
  const value = (BigInt(seed[0]) << 32n) + BigInt(seed[1]);
  return `${value}field`;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

const waitForConfirmedPing = async (
  requestTransactionHistory: (programId: string) => Promise<any>,
  submittedTransactionId: string,
  existingAtIds: Set<string>,
): Promise<string | null> => {
  let actualTxId = submittedTransactionId.startsWith("at1") ? submittedTransactionId : null;

  for (let attempt = 0; attempt < 15; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

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
        transition.function === "ping" &&
        (transition.program === LIQUIDITY_PROGRAM_ID ||
          String(transition.program).startsWith(LIQUIDITY_PROGRAM_ID.split(".")[0])),
    );
    if (transitionMatch) return actualTxId;
  }

  return actualTxId;
};

export const useLiquidityPingTransaction = () => {
  const { address, executeTransaction, requestTransactionHistory } = useWallet();
  const [loading, setLoading] = useState(false);

  const runPing = useCallback(async (): Promise<string | null> => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return null;
    }

    setLoading(true);
    const nonce = randomField();

    try {
      const existingHistory = await requestTransactionHistory(LIQUIDITY_PROGRAM_ID);
      const existingAtIds = new Set(
        (existingHistory?.transactions ?? [])
          .map((tx: any) => tx.transactionId)
          .filter((id: string) => id?.startsWith("at1")),
      );

      const result = await executeTransaction({
        program: LIQUIDITY_PROGRAM_ID,
        function: "ping",
        inputs: [nonce],
        fee: 300_000,
        privateFee: false,
      } as Parameters<typeof executeTransaction>[0]);

      if (!result?.transactionId) return null;

      toast.info("Liquidity ping submitted. Waiting for confirmation...");

      const confirmedTxId = await waitForConfirmedPing(
        requestTransactionHistory,
        result.transactionId,
        existingAtIds,
      );

      if (!confirmedTxId) {
        toast.error("Liquidity ping did not confirm in time.");
        return null;
      }

      toast.success("Liquidity ping confirmed.");
      return confirmedTxId;
    } catch (error) {
      console.error("Liquidity ping failed:", error, {
        program: LIQUIDITY_PROGRAM_ID,
        function: "ping",
        nonce,
      });
      toast.error(`Liquidity ping failed: ${getErrorMessage(error)}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [address, executeTransaction, requestTransactionHistory]);

  return {
    runPing,
    loading,
  };
};
