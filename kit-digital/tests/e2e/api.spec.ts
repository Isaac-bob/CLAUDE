import { test, expect, type APIRequestContext } from "@playwright/test";
import { ADMIN, pdfBlob, uniqueEmail } from "./helpers";

async function registerUser(request: APIRequestContext, email = uniqueEmail("api")) {
  const res = await request.post("/api/auth/register", {
    data: { name: "Prueba API", email, password: "Segura12345" },
  });
  expect(res.status()).toBe(201);
  return { email, id: (await res.json()).user.id as string };
}

test.describe("autenticación y sesiones", () => {
  test("anónimo: /api/auth/me devuelve user null", async ({ request }) => {
    const res = await request.get("/api/auth/me");
    expect(res.ok()).toBe(true);
    expect((await res.json()).user).toBeNull();
  });

  test("registro valida la contraseña en el servidor", async ({ request }) => {
    const res = await request.post("/api/auth/register", { data: { name: "Ana", email: uniqueEmail(), password: "corta" } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/10 caracteres/);
  });

  test("correo duplicado devuelve 409 con mensaje genérico", async ({ request }) => {
    const { email } = await registerUser(request);
    const res = await request.post("/api/auth/register", { data: { name: "Otra", email, password: "Segura12345" } });
    expect(res.status()).toBe(409);
    expect((await res.json()).error).toMatch(/inicia sesión/);
  });

  test("login incorrecto no revela si el correo existe", async ({ request }) => {
    const res = await request.post("/api/auth/login", { data: { email: "nadie@example.com", password: "Incorrecta123" } });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe("Correo o contraseña incorrectos.");
  });

  test("login correcto establece cookie httpOnly y /me reconoce la sesión", async ({ request }) => {
    const { email } = await registerUser(request);
    const login = await request.post("/api/auth/login", { data: { email, password: "Segura12345" } });
    expect(login.status()).toBe(200);
    const cookie = login.headers()["set-cookie"] ?? "";
    expect(cookie).toMatch(/kd_session=/);
    expect(cookie.toLowerCase()).toMatch(/httponly/);
    const me = await request.get("/api/auth/me");
    expect((await me.json()).user.email).toBe(email);
  });

  test("cerrar sesión invalida el token en servidor", async ({ request }) => {
    const { email } = await registerUser(request);
    await request.post("/api/auth/login", { data: { email, password: "Segura12345" } });
    await request.post("/api/auth/logout");
    const me = await request.get("/api/auth/me");
    expect((await me.json()).user).toBeNull();
  });

  test("recuperación de contraseña responde igual exista o no el correo", async ({ request }) => {
    const unknown = await request.post("/api/auth/forgot", { data: { email: uniqueEmail("nadie") } });
    const { email } = await registerUser(request);
    const known = await request.post("/api/auth/forgot", { data: { email } });
    expect(unknown.status()).toBe(200);
    expect(known.status()).toBe(200);
    expect((await unknown.json()).message).toBe((await known.json()).message);
  });

  test("token de recuperación inválido es rechazado", async ({ request }) => {
    const res = await request.post("/api/auth/reset", { data: { token: "x".repeat(40), password: "Nueva123456" } });
    expect(res.status()).toBe(400);
  });
});

test.describe("autorización del lado del servidor", () => {
  test("un usuario normal no accede a la API de administración", async ({ request }) => {
    await registerUser(request);
    const res = await request.get("/api/admin/stats");
    expect(res.status()).toBe(403);
  });

  test("anónimo recibe 401 en endpoints privados", async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({ baseURL });
    expect((await ctx.get("/api/admin/users")).status()).toBe(401);
    expect((await ctx.get("/api/jobs")).status()).toBe(401);
    await ctx.dispose();
  });

  test("administrador accede a estadísticas y listados", async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({ baseURL });
    const login = await ctx.post("/api/auth/login", { data: ADMIN });
    expect(login.status()).toBe(200);
    const stats = await ctx.get("/api/admin/stats");
    expect(stats.status()).toBe(200);
    expect((await stats.json()).admins).toBeGreaterThanOrEqual(1);
    expect((await ctx.get("/api/admin/users?q=admin")).status()).toBe(200);
    expect((await ctx.get("/api/admin/jobs?status=FAILED")).status()).toBe(200);
    await ctx.dispose();
  });

  test("el administrador no puede quitarse sus propios permisos", async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({ baseURL });
    const login = await ctx.post("/api/auth/login", { data: ADMIN });
    const me = (await login.json()).user;
    const res = await ctx.patch(`/api/admin/users/${me.id}`, { data: { role: "USER" } });
    expect(res.status()).toBe(400);
    await ctx.dispose();
  });

  test("desactivar un usuario revoca sus sesiones y bloquea el acceso", async ({ playwright, baseURL }) => {
    const admin = await playwright.request.newContext({ baseURL });
    await admin.post("/api/auth/login", { data: ADMIN });

    const victimCtx = await playwright.request.newContext({ baseURL });
    const { email, id } = await registerUser(victimCtx);
    expect((await victimCtx.get("/api/auth/me")).ok()).toBe(true);

    const patch = await admin.patch(`/api/admin/users/${id}`, { data: { isActive: false } });
    expect(patch.status()).toBe(200);

    expect((await victimCtx.get("/api/auth/me")).ok()).toBe(true);
    const me = await victimCtx.get("/api/auth/me");
    expect((await me.json()).user).toBeNull();
    const relogin = await victimCtx.post("/api/auth/login", { data: { email, password: "Segura12345" } });
    expect(relogin.status()).toBe(403);

    // Reactivar para no dejar la base en mal estado.
    await admin.patch(`/api/admin/users/${id}`, { data: { isActive: true } });
    await admin.dispose();
    await victimCtx.dispose();
  });
});

test.describe("herramientas PDF por API", () => {
  test("unir dos PDF devuelve un PDF válido", async ({ request }) => {
    const form = new FormData();
    form.append("files", await pdfBlob(2, "A"), "a.pdf");
    form.append("files", await pdfBlob(3, "B"), "b.pdf");
    const res = await request.post("/api/pdf/merge", { multipart: form });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
    expect(res.headers()["content-disposition"]).toContain("unido.pdf");
  });

  test("dividir por rangos devuelve un ZIP", async ({ request }) => {
    const form = new FormData();
    form.append("files", await pdfBlob(5, "C"), "c.pdf");
    form.append("mode", "ranges");
    form.append("ranges", "1-2, 4");
    const res = await request.post("/api/pdf/split", { multipart: form });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/zip");
    expect((await res.body()).subarray(0, 2).toString()).toBe("PK");
  });

  test("errores del usuario devuelven 400 con mensaje claro", async ({ request }) => {
    const single = new FormData();
    single.append("files", await pdfBlob(1, "A"), "a.pdf");
    const merge = await request.post("/api/pdf/merge", { multipart: single });
    expect(merge.status()).toBe(400);
    expect((await merge.json()).error).toMatch(/al menos 2/);

    const outOfRange = new FormData();
    outOfRange.append("files", await pdfBlob(2, "A"), "a.pdf");
    outOfRange.append("mode", "ranges");
    outOfRange.append("ranges", "1-9");
    const split = await request.post("/api/pdf/split", { multipart: outOfRange });
    expect(split.status()).toBe(400);
    expect((await split.json()).error).toMatch(/solo tiene 2/);
  });

  test("un archivo con extensión .pdf pero contenido no PDF es rechazado", async ({ request }) => {
    const form = new FormData();
    form.append("files", new Blob([new Uint8Array([1, 2, 3, 4, 5, 6])], { type: "application/pdf" }), "falso.pdf");
    form.append("files", await pdfBlob(1, "B"), "b.pdf");
    const res = await request.post("/api/pdf/merge", { multipart: form });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/no es un PDF válido/);
  });

  test("herramienta inexistente devuelve 404", async ({ request }) => {
    const form = new FormData();
    form.append("files", await pdfBlob(1, "A"), "a.pdf");
    expect((await request.post("/api/pdf/no-existe", { multipart: form })).status()).toBe(404);
  });

  test("el historial registra la operación y solo la ve su dueño", async ({ playwright, baseURL }) => {
    const owner = await playwright.request.newContext({ baseURL });
    const other = await playwright.request.newContext({ baseURL });
    const { email } = await registerUser(owner);
    await registerUser(other);
    await owner.post("/api/auth/login", { data: { email, password: "Segura12345" } });

    const form = new FormData();
    form.append("files", await pdfBlob(1, "R"), "r.pdf");
    form.append("angle", "90");
    form.append("pages", "");
    const res = await owner.post("/api/pdf/rotate", { multipart: form });
    expect(res.status()).toBe(200);
    const jobId = res.headers()["x-job-id"];
    expect(jobId).toBeTruthy();

    const mine = await (await owner.get("/api/jobs")).json();
    expect(mine.jobs.map((j: { id: string }) => j.id)).toContain(jobId);
    expect(mine.jobs[0].status).toBe("SUCCEEDED");

    const theirs = await (await other.get("/api/jobs")).json();
    expect(theirs.jobs.map((j: { id: string }) => j.id)).not.toContain(jobId);

    await owner.dispose();
    await other.dispose();
  });
});

test.describe("cabeceras de seguridad", () => {
  test("la aplicación no puede embeberse en iframes", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });
});
