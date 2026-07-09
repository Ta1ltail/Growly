import { describe, it, expect } from "vitest";
import { nextStatus } from "./marks";

describe("nextStatus", () => {
  it("cycles from undefined → done", () => {
    expect(nextStatus(undefined)).toBe("done");
  });

  it("cycles from done → missed", () => {
    expect(nextStatus("done")).toBe("missed");
  });

  it("cycles from missed → skipped", () => {
    expect(nextStatus("missed")).toBe("skipped");
  });

  it("cycles from skipped → undefined (back to none)", () => {
    expect(nextStatus("skipped")).toBe(undefined);
  });

  it("completes a full 4-step cycle back to start", () => {
    const cycle = [undefined, "done", "missed", "skipped", undefined] as const;
    let cur: typeof cycle[number] = undefined;
    for (const expected of cycle) {
      expect(cur).toBe(expected);
      cur = nextStatus(cur);
    }
  });
});
