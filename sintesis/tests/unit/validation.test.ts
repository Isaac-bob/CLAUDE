import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, resetSchema, adminUserUpdateSchema } from "@/lib/validation";

describe("registerSchema", () => {
  it("normaliza el correo y acepta datos válidos", () => {
    const r = registerSchema.parse({ name: " Ana ", email: "  ANA@Example.COM ", password: "Segura12345" });
    expect(r.email).toBe("ana@example.com");
    expect(r.name).toBe("Ana");
  });
  it("exige contraseña de 10+ caracteres con letras y números", () => {
    expect(() => registerSchema.parse({ name: "Ana", email: "a@b.co", password: "corta1" })).toThrow();
    expect(() => registerSchema.parse({ name: "Ana", email: "a@b.co", password: "solosletrasmuylargas" })).toThrow(/letras y números/);
  });
  it("rechaza correos y nombres inválidos", () => {
    expect(() => registerSchema.parse({ name: "Ana", email: "no-es-correo", password: "Segura12345" })).toThrow();
    expect(() => registerSchema.parse({ name: "A", email: "a@b.co", password: "Segura12345" })).toThrow(/mínimo 2/);
  });
});

describe("loginSchema y resetSchema", () => {
  it("login exige contraseña", () => {
    expect(() => loginSchema.parse({ email: "a@b.co", password: "" })).toThrow();
  });
  it("reset rechaza tokens cortos", () => {
    expect(() => resetSchema.parse({ token: "corto", password: "Segura12345" })).toThrow();
  });
});

describe("adminUserUpdateSchema", () => {
  it("requiere al menos un cambio", () => {
    expect(() => adminUserUpdateSchema.parse({})).toThrow(/Nada que actualizar/);
    expect(adminUserUpdateSchema.parse({ role: "ADMIN" })).toEqual({ role: "ADMIN" });
  });
  it("rechaza roles desconocidos", () => {
    expect(() => adminUserUpdateSchema.parse({ role: "ROOT" })).toThrow();
  });
});
