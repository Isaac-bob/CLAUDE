import { describe, it, expect } from "vitest";
import { parsePageSpec, parseOrderedPages } from "@/lib/pdf/pages";
import { PdfInputError } from "@/lib/pdf/errors";

describe("parsePageSpec", () => {
  it("expande rangos y páginas sueltas en índices base 0", () => {
    expect(parsePageSpec("1-3, 5", 10)).toEqual([0, 1, 2, 4]);
  });
  it("elimina duplicados y ordena", () => {
    expect(parsePageSpec("3,1-2,2", 5)).toEqual([0, 1, 2]);
  });
  it("rechaza páginas fuera del documento", () => {
    expect(() => parsePageSpec("1-9", 5)).toThrow(PdfInputError);
  });
  it("rechaza rangos invertidos y formatos absurdos", () => {
    expect(() => parsePageSpec("5-2", 10)).toThrow(/al revés/);
    expect(() => parsePageSpec("a-b", 10)).toThrow(/no válido/);
    expect(() => parsePageSpec("0", 10)).toThrow(PdfInputError);
  });
  it("exige al menos una página", () => {
    expect(() => parsePageSpec("   ", 10)).toThrow(/al menos una página/);
  });
});

describe("parseOrderedPages", () => {
  it("respeta el orden exacto y permite repetir", () => {
    expect(parseOrderedPages("3,1,1", 3)).toEqual([2, 0, 0]);
  });
  it("valida que cada página exista", () => {
    expect(() => parseOrderedPages("4", 3)).toThrow(/no existe/);
  });
  it("rechaza texto que no es número", () => {
    expect(() => parseOrderedPages("uno", 3)).toThrow(PdfInputError);
  });
});
