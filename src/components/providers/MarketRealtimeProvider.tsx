import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

interface MarketRealtimeProviderProps {
  children: ReactNode;
}

export function MarketRealtimeProvider({ children }: MarketRealtimeProviderProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("markets_v11_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "markets_v11" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.markets });
          queryClient.invalidateQueries({ queryKey: ["market"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return <>{children}</>;
}
