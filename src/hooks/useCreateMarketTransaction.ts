import { useCallback, useState } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { toast } from "sonner";
import { fetchTransaction, extractMarketIdFromTx } from "@/lib/aleo";
import { PROGRAM_ID } from "@/lib/constants";
import { saveMarketMetadata } from "@/lib/metadata";
import { useRefresh } from "@/context/RefreshContext";

const formatU64 = (value: number): string => `${Math.max(0, Math.floor(value))}u64`;
const formatU8 = (value: number): string => `${Math.max(0, Math.floor(value))}u8`;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

export const useCreateMarketTransaction = () => {
  const { address, wallet, executeTransaction, requestTransactionHistory } = useWallet();
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
    ): Promise<{ transactionId: string; marketId: string } | null> => {
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
        const existingHistory = await requestTransactionHistory(PROGRAM_ID);
        const existingAtIds = new Set(
          (existingHistory?.transactions ?? [])
            .map((tx: any) => tx.transactionId)
            .filter((id: string) => id?.startsWith("at1")),
        );

        const shieldApi = (window as Window & {
          shield?: {
            requestTransaction?: (payload: {
              programId: string;
              functionName: string;
              inputs: string[];
              fee: number | bigint;
              privateFee?: boolean;
              recordIndices?: number[];
            }) => Promise<string | { transactionId?: string }>;
          };
        }).shield;
        const isShieldWallet = wallet?.adapter?.name?.toLowerCase().includes("shield");

        const result = isShieldWallet && shieldApi?.requestTransaction
          ? await (async () => {
            const shieldResult = await shieldApi.requestTransaction({
              programId: PROGRAM_ID,
              functionName: "create_market",
              inputs,
              fee: 2_500_000,
              privateFee: false,
            });

            return {
              transactionId:
                typeof shieldResult === "string"
                  ? shieldResult
                  : (shieldResult?.transactionId ?? ""),
            };
          })()
          : await executeTransaction({
            program: PROGRAM_ID,
            function: "create_market",
            inputs,
            fee: 2_500_000,
            privateFee: false,
          } as Parameters<typeof executeTransaction>[0]);

        if (!result?.transactionId) return null;

        toast.info("Create market submitted. Waiting for confirmation...");

        let actualTxId = result.transactionId.startsWith("at1") ? result.transactionId : undefined;

        for (let i = 0; i < 15 && !actualTxId; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
          const history = await requestTransactionHistory(PROGRAM_ID);
          const txs = history?.transactions ?? [];

          const shieldMatch = txs.find((tx: any) => tx.id === result.transactionId);
          if (shieldMatch?.transactionId?.startsWith("at1")) {
            actualTxId = shieldMatch.transactionId;
            break;
          }

          actualTxId = txs
            .map((tx: any) => tx.transactionId)
            .find((id: string) => id?.startsWith("at1") && !existingAtIds.has(id));
        }

        const confirmedTxId = actualTxId ?? result.transactionId;
        const txData = await fetchTransaction(confirmedTxId);
        const marketId = extractMarketIdFromTx(txData);

        if (!marketId) {
          toast.error("Create market confirmed, but market ID could not be parsed.");
          return null;
        }

        try {
          await saveMarketMetadata({
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
            toast.warning("Market created on-chain, but metadata save was blocked by Supabase RLS for markets_v12.");
          } else {
            toast.warning("Market created on-chain, but metadata save failed.");
          }
        }

        triggerRefresh();
        toast.success("Create market confirmed!");
        return { transactionId: confirmedTxId, marketId };
      } catch (error) {
        console.error("Create market direct execution failed:", error, {
          program: PROGRAM_ID,
          function: "create_market",
          inputs,
          wallet: wallet?.adapter?.name,
        });
        toast.error(`Create market failed: ${getErrorMessage(error)}`);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [address, executeTransaction, requestTransactionHistory, triggerRefresh, wallet],
  );

  return {
    createMarket,
    loading,
  };
};
