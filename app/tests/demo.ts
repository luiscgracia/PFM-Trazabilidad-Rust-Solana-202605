import { chromium } from "playwright";
import type { BrowserContext, Page } from "playwright";

const pausa = (ms: number) => new Promise(r => setTimeout(r, ms));
const CORTA = 1200;
const MEDIA = 2500;
const LARGA = 3500;

// Wallet de RECIPIENT 1 para el nuevo envio
const RECIPIENT_1 = "H29kiRNHrVFtdWm84AXsuyZUiLYNsX5VqmJnfvjTFetC";

// Espera que el usuario apruebe manualmente en Backpack
async function aprobarBackpack(_context: BrowserContext) {
  console.log("  → Aprueba en Backpack ahora (8 segundos)...");
  await pausa(8000);
  console.log("  ✅ Continuando...");
}

// Selecciona un municipio en LocationSearch
async function seleccionarMunicipio(page: Page, placeholder: string, municipio: string) {
  const input = page.locator(`input[placeholder*="${placeholder}"]`).first();
  await input.click();
  await input.fill(municipio);
  await pausa(600);
  // Hacer clic en el primer resultado del dropdown
  const opcion = page.locator(`[role="option"], li`).filter({ hasText: municipio }).first();
  if (await opcion.isVisible({ timeout: 3000 }).catch(() => false)) {
    await opcion.click();
  } else {
    // Intentar con el primer elemento de la lista
    const lista = page.locator("ul li, .suggestion, [data-suggestion]").first();
    if (await lista.isVisible({ timeout: 2000 }).catch(() => false)) {
      await lista.click();
    } else {
      // Presionar Enter como fallback
      await input.press("Enter");
    }
  }
  await pausa(300);
}

async function main() {
  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = pages.find(p => p.url().includes("localhost:3000")) || pages[0];

  console.log("Conectado. URL:", page.url());
  await page.bringToFront();

  // Inyectar cursor visual visible en pantalla
  await page.addStyleTag({ content: `
    #pw-cursor {
      position: fixed; width: 20px; height: 20px; border-radius: 50%;
      background: rgba(255,100,100,0.8); border: 2px solid white;
      pointer-events: none; z-index: 999999; transform: translate(-50%,-50%);
      transition: left 0.1s, top 0.1s; box-shadow: 0 0 6px rgba(0,0,0,0.5);
    }
  ` });
  await page.evaluate(() => {
    const dot = document.createElement("div");
    dot.id = "pw-cursor";
    document.body.appendChild(dot);
    document.addEventListener("mousemove", e => {
      dot.style.left = e.clientX + "px";
      dot.style.top = e.clientY + "px";
    });
  });


  // ── ESCENA 1: Página de inicio ───────────────────────────────────────────
  console.log("\n[1/8] Pagina de inicio...");
  await page.goto("http://localhost:3000");
  await pausa(LARGA);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await pausa(MEDIA);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pausa(CORTA);

  // ── ESCENA 2: Actores ────────────────────────────────────────────────────
  console.log("[2/8] Pestana Actores...");
  await page.locator("text=👥 Actores").click();
  await page.waitForSelector("table", { timeout: 10000 });
  await pausa(MEDIA);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await pausa(MEDIA);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pausa(CORTA);

  // ── ESCENA 3: Lista de envíos ────────────────────────────────────────────
  console.log("[3/8] Lista de envios...");
  await page.locator("text=📦 Envíos").click();
  await page.waitForSelector("table", { timeout: 15000 });
  await pausa(LARGA);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await pausa(MEDIA);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await pausa(MEDIA);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pausa(CORTA);

  // ── ESCENA 4: Detalle envío ENTREGADO (#1 Vacunas COVID) ─────────────────
  console.log("[4/8] Detalle envio ENTREGADO (Vacunas COVID)...");
  await page.locator("button:has-text('👁')").first().click();
  await page.waitForSelector("text=Timeline", { timeout: 10000 });
  await pausa(LARGA);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await pausa(MEDIA);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await pausa(MEDIA);
  // Exportar PDF
  const [popup] = await Promise.all([
    page.waitForEvent("popup").catch(() => null),
    page.locator("button:has-text('PDF')").click(),
  ]);
  if (popup) { await pausa(8000); await popup.close(); }
  await pausa(CORTA);
  await page.locator("button:has-text('← Volver')").click();
  await pausa(CORTA);

  // ── ESCENA 5: Detalle envío con incidencia (#2 Equipos médicos) ──────────
  console.log("[5/8] Detalle envio con incidencia...");
  await page.locator("button:has-text('👁')").nth(1).click();
  await page.waitForSelector("text=Timeline", { timeout: 10000 });
  await pausa(LARGA);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await pausa(MEDIA);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await pausa(MEDIA);
  await page.locator("button:has-text('← Volver')").click();
  await pausa(CORTA);

  // ── ESCENA 6: CREAR ENVÍO EN VIVO ────────────────────────────────────────
  console.log("\n[6/8] Creando envio en vivo...");
  console.log("  ⚠ CAMBIAR BACKPACK A CUENTA: SENDER 1 (...75yP)");
  await pausa(8000); // Pausa para que el usuario cambie de cuenta

  // Ir al formulario de crear envío desde inicio
  await page.locator("text=🏠 Inicio").click();
  await pausa(CORTA);
  await page.locator("text=CREAR ENVÍO").click();
  await pausa(CORTA);
  await page.waitForSelector("text=Crear nuevo envío", { timeout: 10000 });
  await pausa(MEDIA);

  // Llenar el formulario
  await page.locator("input[placeholder*='Vacunas']").fill("Repuestos mecánicos de precisión");
  await pausa(CORTA);

  await seleccionarMunicipio(page, "origen", "Bogotá");
  await pausa(CORTA);

  await seleccionarMunicipio(page, "destino", "Medellín");
  await pausa(CORTA);

  await page.locator("input[placeholder*='Base58']").fill(RECIPIENT_1);
  await pausa(CORTA);

  await pausa(MEDIA);

  // Enviar y aprobar en Backpack
  console.log("  Enviando transaccion create_shipment...");
  const aprobarPromise = aprobarBackpack(context);
  await page.locator("button:has-text('Crear envío on-chain')").click();
  await aprobarPromise;
  await pausa(LARGA);

  // ── ESCENA 7: Registrar checkpoints e incidencia ─────────────────────────
  console.log("\n[7/8] Registrando checkpoints e incidencia...");
  console.log("  ⚠ CAMBIAR BACKPACK A CUENTA: CARRIER 1 (...85gv)");
  await pausa(8000);

  // Buscar el nuevo envío en la lista
  await page.locator("text=📦 Envíos").click();
  await page.waitForSelector("table", { timeout: 15000 });
  await pausa(LARGA);

  // Abrir el último envío (el recién creado)
  const botones = page.locator("button:has-text('👁')");
  const count = await botones.count();
  await botones.nth(count - 1).click();
  await page.waitForSelector("text=Timeline", { timeout: 10000 });
  await pausa(LARGA);

  // Checkpoint 1: PICKUP
  console.log("  Checkpoint 1: Pickup...");
  await page.locator("button:has-text('+ Checkpoint')").click();
  await pausa(2000);
  await pausa(CORTA);
  await seleccionarMunicipio(page, "checkpoint", "Bogotá");
  await page.locator("select").selectOption("pickup");
  await pausa(CORTA);
  const ap1 = aprobarBackpack(context);
  await page.locator("button:has-text('Registrar on-chain')").click();
  await ap1;
  await pausa(LARGA);

  // Checkpoint 2: HUB IN
  console.log("  Checkpoint 2: Hub In...");
  await page.locator("button:has-text('+ Checkpoint')").click();
  await pausa(2000);
  await pausa(CORTA);
  await seleccionarMunicipio(page, "checkpoint", "Medellín");
  await page.locator("select").selectOption("hubIn");
  await pausa(CORTA);
  const ap2 = aprobarBackpack(context);
  await page.locator("button:has-text('Registrar on-chain')").click();
  await ap2;
  await pausa(LARGA);

  // Checkpoint 3: HUB OUT
  console.log("  Checkpoint 3: Hub Out...");
  await page.locator("button:has-text('+ Checkpoint')").click();
  await pausa(2000);
  await pausa(CORTA);
  await seleccionarMunicipio(page, "checkpoint", "Medellín");
  await page.locator("select").selectOption("hubOut");
  await pausa(CORTA);
  const ap3 = aprobarBackpack(context);
  await page.locator("button:has-text('Registrar on-chain')").click();
  await ap3;
  await pausa(LARGA);

  // Checkpoint 4: TRANSIT (En carretera)
  console.log("  Checkpoint 4: Transit (carretera)...");
  await page.locator("button:has-text('+ Checkpoint')").click();
  await pausa(2000);
  await pausa(CORTA);
  await seleccionarMunicipio(page, "checkpoint", "Bucaramanga");
  await page.locator("select").selectOption("transit");
  await pausa(CORTA);
  const ap4 = aprobarBackpack(context);
  await page.locator("button:has-text('Registrar on-chain')").click();
  await ap4;
  await pausa(LARGA);

  // Incidencia en carretera
  console.log("  Reportando incidencia...");
  await page.locator("button:has-text('Reportar incidencia')").click();
  await page.waitForSelector("text=Incidencia —", { timeout: 5000 });
  await pausa(CORTA);
  // Seleccionar tipo Retraso
  await page.locator("select").first().selectOption("delay");
  await pausa(CORTA);
  // Llenar descripción
  await page.locator("textarea, input[placeholder*='Describe']").fill(
    "Cierre vial en autopista Medellín-Bogotá por derrumbe en Km 120. Retraso estimado 3 horas."
  );
  await pausa(CORTA);
  const ap5 = aprobarBackpack(context);
  await page.locator("button:has-text('Reportar on-chain')").click();
  await ap5;
  await pausa(LARGA);

  // Scroll para ver el resultado
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await pausa(MEDIA);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await pausa(LARGA);

  // ── ESCENA 8: Página de inicio final ─────────────────────────────────────
  console.log("\n[8/8] Pagina de inicio final...");
  await page.locator("text=🏠 Inicio").click();
  await pausa(CORTA);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pausa(LARGA);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await pausa(LARGA);

  console.log("\n✅ Demo completada exitosamente.");
  await browser.close();
}

main().catch(console.error);
