import { test, expect } from "@playwright/test";
import { ADMIN, pdfBytes, uniqueEmail } from "./helpers";

test.describe("navegación por servicios (pestañas)", () => {
  test("la portada muestra las pestañas de servicios y sus estados", async ({ page }) => {
    await page.goto("/");
    const tabs = page.getByRole("navigation", { name: "Servicios" });
    await expect(tabs.getByRole("link", { name: /PDF/ })).toBeVisible();
    await expect(tabs.getByRole("link", { name: /Grabación de pantalla/ })).toBeVisible();
    await expect(tabs.getByRole("link", { name: /Transcripción/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Todo lo que necesitas");
  });

  test("cambiar de pestaña lleva a su sección y marca la activa", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Servicios" }).getByRole("link", { name: /Grabación de pantalla/ }).click();
    await expect(page).toHaveURL(/\/grabacion$/);
    await expect(page.getByRole("heading", { level: 1, name: "Grabación de pantalla" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Servicios" }).getByRole("link", { name: /Grabación/ })).toHaveAttribute("aria-current", "page");
  });

  test("una ruta inexistente muestra la página 404 amigable", async ({ page }) => {
    const res = await page.goto("/no-existe-nada");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /No encontramos esta página/ })).toBeVisible();
  });
});

test.describe("servicio PDF", () => {
  test("elegir herramienta, subir dos PDF, unir y descargar", async ({ page }) => {
    await page.goto("/pdf");
    await page.getByRole("link", { name: /Unir PDF/ }).first().click();
    await expect(page).toHaveURL(/\/pdf\/unir$/);

    const submit = page.getByRole("button", { name: "Unir PDF", exact: true });
    await expect(submit).toBeDisabled();

    await page.locator('input[type="file"]').first().setInputFiles([
      { name: "primero.pdf", mimeType: "application/pdf", buffer: await pdfBytes(2, "P") },
      { name: "segundo.pdf", mimeType: "application/pdf", buffer: await pdfBytes(1, "S") },
    ]);
    await expect(page.getByRole("list", { name: /Archivos:/ }).getByRole("listitem")).toHaveCount(2);
    await expect(submit).toBeEnabled();

    await submit.click();
    const download = page.waitForEvent("download");
    await expect(page.getByRole("status")).toContainText("¡Listo!");
    await page.getByRole("link", { name: "Descargar" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("primero-unido.pdf");
  });

  test("validación: rango de páginas obligatorio al dividir por rangos", async ({ page }) => {
    await page.goto("/pdf/dividir");
    await page.locator('input[type="file"]').first().setInputFiles({ name: "doc.pdf", mimeType: "application/pdf", buffer: await pdfBytes(3, "D") });
    const submit = page.getByRole("button", { name: "Dividir PDF", exact: true });
    await expect(submit).toBeDisabled();
    await page.getByLabel("Rangos de páginas").fill("1-2");
    await expect(submit).toBeEnabled();
    await page.getByLabel("Cómo dividir").selectOption("each");
    await expect(page.getByLabel("Rangos de páginas")).toBeDisabled();
    await expect(submit).toBeEnabled();
  });

  test("rechaza archivos que no son PDF en la herramienta de PDF", async ({ page }) => {
    await page.goto("/pdf/rotar");
    await page.locator('input[type="file"]').first().setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgo=", "base64") });
    await expect(page.getByText(/no son de tipo válido/)).toBeVisible();
  });

  test("muestra el error del servidor cuando el PDF no se puede procesar", async ({ page }) => {
    await page.goto("/pdf/organizar");
    await page.locator('input[type="file"]').first().setInputFiles({ name: "x.pdf", mimeType: "application/pdf", buffer: await pdfBytes(2, "X") });
    await page.getByLabel(/Orden final de las páginas/).fill("9");
    await page.getByRole("button", { name: "Organizar páginas", exact: true }).click();
    await expect(page.locator("main [role=\"alert\"]")).toContainText("La página 9 no existe");
  });
});

test.describe("herramientas visuales", () => {
  test("censurar: marcar una zona sobre la página y descargar el resultado", async ({ page }) => {
    await page.goto("/pdf/censurar");
    await page.locator('input[type="file"]').first().setInputFiles({ name: "contrato.pdf", mimeType: "application/pdf", buffer: await pdfBytes(2, "C") });
    const preview = page.getByRole("img", { name: /Vista previa de la página 1/ });
    await expect(preview).toBeVisible();
    await preview.scrollIntoViewIfNeeded();
    const box = await preview.boundingBox();
    await page.mouse.move(box!.x + box!.width * 0.1, box!.y + box!.height * 0.15);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.22, { steps: 6 });
    await page.mouse.up();
    await expect(page.getByText("1 zona marcada")).toBeVisible();
    const submit = page.getByRole("button", { name: "Censurar PDF", exact: true });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByRole("status")).toContainText("¡Listo!", { timeout: 60_000 });
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Descargar" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("contrato-censurado.pdf");
  });

  test("firmar: dibujar la firma, elegir un punto en la página y descargar", async ({ page }) => {
    await page.goto("/pdf/firmar");
    await page.locator('input[type="file"]').first().setInputFiles({ name: "carta.pdf", mimeType: "application/pdf", buffer: await pdfBytes(1, "F") });
    const preview = page.getByRole("img", { name: /Vista previa de la página 1/ });
    await expect(preview).toBeVisible();
    const canvas = page.getByRole("img", { name: "Área para dibujar tu firma" }).or(page.locator("canvas")).first();
    await canvas.scrollIntoViewIfNeeded();
    const cbox = await canvas.boundingBox();
    await page.mouse.move(cbox!.x + 30, cbox!.y + cbox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(cbox!.x + cbox!.width - 40, cbox!.y + 20, { steps: 10 });
    await page.mouse.up();
    await preview.scrollIntoViewIfNeeded();
    const box = await preview.boundingBox();
    await page.mouse.click(box!.x + box!.width * 0.7, box!.y + box!.height * 0.85);
    const submit = page.getByRole("button", { name: "Firmar PDF", exact: true });
    await expect(submit).toBeEnabled({ timeout: 10_000 });
    await submit.click();
    await expect(page.getByRole("status")).toContainText("¡Listo!", { timeout: 60_000 });
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Descargar" }).click();
    expect((await download).suggestedFilename()).toBe("carta-firmado.pdf");
  });

  test("la sección PDF muestra las 48 herramientas agrupadas", async ({ page }) => {
    await page.goto("/pdf");
    await expect(page.getByRole("heading", { name: "Editar", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "IA y lenguaje", exact: true })).toBeVisible();
    const links = page.locator('main a[href^="/pdf/"]');
    const hrefs = new Set(await links.evaluateAll((els) => els.map((e) => e.getAttribute("href"))));
    expect(hrefs.size).toBeGreaterThanOrEqual(48);
  });
});

test.describe("cuenta y administración", () => {
  test("registro, historial y cierre de sesión", async ({ page }) => {
    const email = uniqueEmail("ui");
    await page.goto("/cuenta");
    await page.getByRole("tab", { name: "Crear cuenta" }).click();
    await page.locator("#name").fill("Persona Prueba");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("Segura12345");
    await page.getByRole("button", { name: "Crear mi cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Historial de operaciones" })).toBeVisible();

    await page.goto("/pdf/imagen-a-pdf");
    await page.locator('input[type="file"]').first().setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64") });
    await page.getByRole("button", { name: "Imagen a PDF", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("¡Listo!");

    await page.goto("/cuenta");
    await expect(page.getByText("Imagen a PDF", { exact: false }).first()).toBeVisible();

    await page.getByRole("button", { name: "Cerrar sesión" }).first().click();
    await expect(page.getByRole("link", { name: /Entrar/ })).toBeVisible();
  });

  test("login con contraseña incorrecta muestra error accesible", async ({ page }) => {
    await page.goto("/cuenta");
    await page.locator("#email").fill("nadie@example.com");
    await page.locator("#password").fill("Incorrecta123");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.locator("main [role=\"alert\"]")).toContainText("Correo o contraseña incorrectos.");
  });

  test("un usuario normal no puede entrar al panel de administración", async ({ page }) => {
    await page.goto("/cuenta");
    await page.getByRole("tab", { name: "Crear cuenta" }).click();
    await page.locator("#name").fill("Usuario Normal");
    await page.locator("#email").fill(uniqueEmail("normal"));
    await page.locator("#password").fill("Segura12345");
    await page.getByRole("button", { name: "Crear mi cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Historial de operaciones" })).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Panel de administración" })).toHaveCount(0);
  });

  test("el administrador ve indicadores, usuarios y operaciones", async ({ page }) => {
    await page.goto("/cuenta");
    await page.locator("#email").fill(ADMIN.email);
    await page.locator("#password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByRole("link", { name: /Administración/ })).toBeVisible();

    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Panel de administración" })).toBeVisible();
    await expect(page.getByText("Usuarios", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operaciones recientes" })).toBeVisible();
    await expect(page.getByRole("table").first()).toBeVisible();
  });
});
