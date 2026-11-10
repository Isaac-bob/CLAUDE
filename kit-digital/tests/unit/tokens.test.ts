import { describe, it, expect } from "vitest";
import { newToken, hashToken } from "@/lib/tokens";

describe("tokens", () => {
  it("genera tokens únicos y de longitud suficiente", () => {
    const a = newToken();
    const b = newToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
  });
  it("el hash es determinista y no revela el token", () => {
    const t = newToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toContain(t);
    expect(hashToken(t)).toMatch(/^[a-f0-9]{64}$/);
  });
});
