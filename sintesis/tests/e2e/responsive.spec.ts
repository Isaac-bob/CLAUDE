import { test, expect } from "@playwright/test";

// En móvil no debe haber desplazamiento horizontal en las pantallas principales.
const pages = ["/", "/pdf", "/pdf/unir", "/pdf/dividir", "/pdf/marca-de-agua", "/pdf/firmar", "/pdf/censurar", "/pdf/editar", "/grabacion", "/cuenta", "/recuperar", "/marca"];

for (const path of pages) {
  test(`sin scroll horizontal en ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("las pestañas de servicios se pueden deslizar en móvil", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Servicios" }).locator("ul");
  const canScroll = await nav.evaluate((el) => el.scrollWidth >= el.clientWidth);
  expect(canScroll).toBe(true);
});
