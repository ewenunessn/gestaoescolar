import { describe, expect, it } from "vitest";
import { getNextIdByDirection } from "./keyboardNavigation";

describe("keyboardNavigation", () => {
  it("moves to the next id and stops at the last item", () => {
    expect(getNextIdByDirection([10, 20, 30], 10, 1)).toBe(20);
    expect(getNextIdByDirection([10, 20, 30], 30, 1)).toBe(30);
  });

  it("moves to the previous id and stops at the first item", () => {
    expect(getNextIdByDirection([10, 20, 30], 30, -1)).toBe(20);
    expect(getNextIdByDirection([10, 20, 30], 10, -1)).toBe(10);
  });
});
