import { describe, it, expect } from "vitest";
import {
  extractMarketIdFromTx,
  parseMarketInfo,
  parsePoolInfo,
  estimateCloseBlockFromDate,
} from "@/lib/aleo";

describe("aleo parsing helpers", () => {
  it("parses MarketInfo from object payload", () => {
    const market = parseMarketInfo(
      {
        creator: "aleo1creatoraddress",
        title_hash: "123field",
        category: "2u8",
        close_block: "100u64",
        resolution_block: "120u64",
        is_resolved: "false",
        winning_outcome: "2u8",
        resolved_by_oracle: "false",
      },
      "999field",
    );

    expect(market.id).toBe("999field");
    expect(market.category).toBe(2);
    expect(market.is_resolved).toBe(false);
  });

  it("extracts market id from create_market transaction output", () => {
    const transaction = {
      execution: {
        transitions: [
          {
            function: "create_market",
            program: "veilmarkets_v3.aleo",
            outputs: [{ value: { arguments: ["987654field"] } }],
          },
        ],
      },
    };

    expect(extractMarketIdFromTx(transaction)).toBe("987654field");
  });

  it("parses pool state values and bool flags", () => {
    const pool = parsePoolInfo("{ total_no: 10u64, total_yes: 20u64, participant_count: 5u64, locked: true, escrowed_amount: 30u64 }");
    expect(pool.total_yes).toBe(20);
    expect(pool.locked).toBe(true);
  });

  it("estimates close block for future dates", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const yyyy = tomorrow.getFullYear();
    const mm = `${tomorrow.getMonth() + 1}`.padStart(2, "0");
    const dd = `${tomorrow.getDate()}`.padStart(2, "0");
    const estimate = estimateCloseBlockFromDate(`${yyyy}-${mm}-${dd}`, 1_000_000);
    expect(estimate).not.toBeNull();
    expect(estimate as number).toBeGreaterThan(1_000_000);
  });
});
