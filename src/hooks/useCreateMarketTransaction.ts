import { useCallback, useState } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { toast } from "sonner";
import { fetchTransaction, extractMarketIdFromTx } from "@/lib/aleo";
import { CREATE_PROGRAM_ID, LIQUIDITY_PROGRAM_ID } from "@/lib/constants";
import { saveMarketMetadata } from "@/lib/metadata";
import { useRefresh } from "@/context/RefreshContext";

const formatU64 = (value: number): string => `${Math.max(0, Math.floor(value))}u64`;
const formatU8 = (value: number): string => `${Math.max(0, Math.floor(value))}u8`;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

const waitForConfirmedTransaction = async (
  requestTransactionHistory: (programId: string) => Promise<any>,
  programId: string,
  submittedTransactionId: string,
  expectedFunction: string,
  existingAtIds: Set<string>,
): Promise<string | null> => {
  let actualTxId = submittedTransactionId.startsWith("at1") ? submittedTransactionId : null;

  for (let attempt = 0; attempt < 15; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 4000));

    if (!actualTxId) {
      const history = await requestTransactionHistory(programId);
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
        transition.function === expectedFunction &&
        (transition.program === programId || String(transition.program).startsWith(programId.split(".")[0])),
    );
    if (transitionMatch) return actualTxId;
  }

  return actualTxId;
};

export const useCreateMarketTransaction = () => {
  const { address, executeTransaction, requestTransactionHistory } = useWallet();
  const { triggerRefresh } = useRefresh();
  const [loading, setLoading] = useState(false);

  const createMarket = useCallback(
    async (
      title: string,
      description: string,
      category: number,
      marketType: number,
      outcomeCount: number,
      outcomeLabels: string[],
      closeTime: number,
      resolutionTime: number,
      resolutionSource: string,
      tokenId: string,
    ): Promise<{ transactionId: string; marketId: string | null } | null> => {
      if (!address) {
        toast.error("Please connect your wallet first");
        return null;
      }

      setLoading(true);
      const randomSeed = crypto.getRandomValues(new Uint32Array(2));
      const randomHash = (BigInt(randomSeed[0]) << 32n) + BigInt(randomSeed[1]);
      const titleHash = `${randomHash}field`;
      const inputs = [
        titleHash,
        formatU8(category),
        formatU8(marketType),
        formatU8(outcomeCount),
        formatU64(closeTime),
        formatU64(resolutionTime),
        tokenId.trim(),
      ];

      try {
        const existingHistory = await requestTransactionHistory(CREATE_PROGRAM_ID);
        const existingAtIds = new Set(
          (existingHistory?.transactions ?? [])
            .map((tx: any) => tx.transactionId)
            .filter((id: string) => id?.startsWith("at1")),
        );
        const result = await executeTransaction({
          program: CREATE_PROGRAM_ID,
          function: "create_market",
          inputs,
          fee: 1_500_000,
          privateFee: false,
        } as Parameters<typeof executeTransaction>[0]);

        if (!result?.transactionId) return null;

        toast.info("Stage 1 create transaction submitted. Waiting for confirmation...");

        const confirmedTxId =
          (await waitForConfirmedTransaction(
            requestTransactionHistory,
            CREATE_PROGRAM_ID,
            result.transactionId,
            "create_market",
            existingAtIds,
          )) ?? result.transactionId;
        const txData = await fetchTransaction(confirmedTxId);
        const marketId = extractMarketIdFromTx(txData, CREATE_PROGRAM_ID);

        if (!marketId) {
          toast.error("Stage 1 create confirmed, but the market ID could not be parsed.");
          return null;
        }

        try {
          const liquidityHistory = await requestTransactionHistory(LIQUIDITY_PROGRAM_ID);
          const existingLiquidityAtIds = new Set(
            (liquidityHistory?.transactions ?? [])
              .map((tx: any) => tx.transactionId)
              .filter((id: string) => id?.startsWith("at1")),
          );
          const liquidityResult = await executeTransaction({
            program: LIQUIDITY_PROGRAM_ID,
            function: "register_market",
            inputs: [
              marketId,
              formatU8(outcomeCount),
              formatU64(closeTime),
              tokenId.trim(),
            ],
            fee: 1_000_000,
            privateFee: false,
          } as Parameters<typeof executeTransaction>[0]);

          if (liquidityResult?.transactionId) {
            await waitForConfirmedTransaction(
              requestTransactionHistory,
              LIQUIDITY_PROGRAM_ID,
              liquidityResult.transactionId,
              "register_market",
              existingLiquidityAtIds,
            );
          }
        } catch (registrationError) {
          console.warn("Stage 4 liquidity registration failed after market creation:", registrationError, {
            marketId,
            program: LIQUIDITY_PROGRAM_ID,
          });
          toast.warning("Market was created, but liquidity registration did not complete. Funding may stay unavailable until it is retried.");
        }

        try {
          await saveMarketMetadata({
            program_id: CREATE_PROGRAM_ID,
            transaction_id: confirmedTxId,
            market_id: marketId,
            title,
            description,
            source: resolutionSource || "Creator",
            category,
            market_type: marketType,
            outcome_count: outcomeCount,
            outcome_labels: outcomeLabels,
            token_id: tokenId,
            close_time: closeTime,
            resolution_time: resolutionTime,
            created_by: address,
          });
        } catch (metadataError) {
          const maybeError = metadataError as { code?: string };
          if (maybeError?.code === "42501") {
            toast.warning("Stage 1 market was created on-chain, but metadata save was blocked by Supabase RLS for markets_v13.");
          } else {
            toast.warning("Stage 1 market was created on-chain, but metadata save failed.");
          }
        }

        triggerRefresh();
        toast.success("Stage 1 create transaction confirmed!");
        return { transactionId: confirmedTxId, marketId };
      } catch (error) {
        console.error("Create market stage-1 execution failed:", error, {
          program: CREATE_PROGRAM_ID,
          function: "create_market",
          inputs,
        });
        toast.error(`Create market failed: ${getErrorMessage(error)}`);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [address, executeTransaction, requestTransactionHistory, triggerRefresh],
  );

  return {
    createMarket,
    loading,
  };
};
