import { describe, it, expect } from "vitest";
import {
  extractMarketIdFromTx,
  parseMarketInfo,
  parsePoolInfo,
  getTimestampFromDate,
} from "@/lib/aleo";

describe("aleo parsing helpers", () => {
  it("parses MarketInfo from object payload", () => {
    const market = parseMarketInfo(
      {
        creator: "aleo1creatoraddress",
        title_hash: "123field",
        category: "2u8",
        close_time: "100u64",
        resolution_time: "120u64",
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
            program: "veilmarkets_core_v15.aleo",
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

  it("builds timestamp from date/time", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const yyyy = tomorrow.getFullYear();
    const mm = `${tomorrow.getMonth() + 1}`.padStart(2, "0");
    const dd = `${tomorrow.getDate()}`.padStart(2, "0");
    const ts = getTimestampFromDate(`${yyyy}-${mm}-${dd}`, "12:00");
    expect(ts).not.toBeNull();
    expect(ts as number).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
