// scripts/demo-data.ts
// Genera 10 envíos de demostración con checkpoints e incidencias.
// Prerequisito: npx ts-node scripts/init.ts ya ejecutado --> se cargan los actores
// Ejecutar: npx ts-node scripts/demo-data.ts

import * as anchor from "@coral-xyz/anchor";
import {
  Connection, Keypair, PublicKey, SystemProgram,
  Transaction, TransactionInstruction
} from "@solana/web3.js";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PROGRAM_ID = new PublicKey("88jtu9fMGP9VMtSiXCvva4xy6W3i9CufnYFXMrvgKtRA");
const CONNECTION  = new Connection("http://localhost:8899", "confirmed");

// Wallets de actores (Backpack — las mismas del init.ts)
const W = {
  SENDER_1:    new PublicKey("9NahCw2mCeyGfByyW7SJUjtLTkkJhxt7R6BnKhYD75yP"),
  CARRIER_1:   new PublicKey("6wBDWTd5oSQRfVeZKT63RaG4cAmbYvrM2Wcsu4Cv85gv"),
  HUB_1:       new PublicKey("E46WK8aKHonmhYJeFa5L9n9TTMtEUgT3yJttDwwr98Fy"),
  RECIPIENT_1: new PublicKey("H29kiRNHrVFtdWm84AXsuyZUiLYNsX5VqmJnfvjTFetC"),
  SENDER_2:    new PublicKey("FNgwZejMCV6NdkjRxUPmhpkY1aGoRUR7fv43dk2PmJXa"),
  CARRIER_2:   new PublicKey("9QTttwTjydFPWsi1mQ3fSrHXJAV6r4T7XvyFX2iw9GD7"),
  HUB_2:       new PublicKey("4JHeGQrFqL8APX45EnViGTd3sDY8gGmi89dcdFxbrgGc"),
  RECIPIENT_2: new PublicKey("4g6GasnTriRGwAn99hZivVyXZHmfPfL8RvPyeP1SAsNc"),
  INSPECTOR_1: new PublicKey("88qjGshdQuyQgdmTwc7L97V5JkTaErj5FFhe44Ari5T9"),
};

function disc(name: string): Buffer {
  return Buffer.from(createHash("sha256").update(`global:${name}`).digest()).slice(0, 8);
}
const DISC = {
  shipment:   disc("create_shipment"),
  checkpoint: disc("record_checkpoint"),
  incident:   disc("report_incident"),
  resolve:    disc("resolve_incident"),
};

function u8(n: number):   Buffer { const b = Buffer.alloc(1); b.writeUInt8(n);    return b; }
function i16(n: number):  Buffer { const b = Buffer.alloc(2); b.writeInt16LE(n);  return b; }
function u32(n: number):  Buffer { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }
function u64(n: number):  Buffer { return new anchor.BN(n).toArrayLike(Buffer, "le", 8); }
function bool_(v: boolean): Buffer { return Buffer.from([v ? 1 : 0]); }
function str_(s: string): Buffer { const b = Buffer.from(s, "utf8"); return Buffer.concat([u32(b.length), b]); }
function pk_(p: PublicKey): Buffer { return Buffer.from(p.toBytes()); }

const pda = {
  config:     () => PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0],
  actor:      (w: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from("actor"), w.toBytes()], PROGRAM_ID)[0],
  shipment:   (id: number)   => PublicKey.findProgramAddressSync([Buffer.from("shipment"),   u64(id)], PROGRAM_ID)[0],
  checkpoint: (id: number)   => PublicKey.findProgramAddressSync([Buffer.from("checkpoint"), u64(id)], PROGRAM_ID)[0],
  incident:   (id: number)   => PublicKey.findProgramAddressSync([Buffer.from("incident"),   u64(id)], PROGRAM_ID)[0],
};

async function sendTx(
  payer: Keypair,
  keys: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[],
  data: Buffer,
  label = ""
) {
  const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const t = new Transaction().add(ix);
  t.feePayer = payer.publicKey;
  t.recentBlockhash = (await CONNECTION.getLatestBlockhash()).blockhash;
  t.sign(payer);
  const sig = await CONNECTION.sendRawTransaction(t.serialize());
  await CONNECTION.confirmTransaction(sig, "confirmed");
  if (label) console.log(`    ✅ ${label}`);
}

async function leerConfig() {
  const info = await CONNECTION.getAccountInfo(pda.config());
  if (!info) throw new Error("Config PDA no existe. Ejecuta: npx ts-node scripts/init.ts");
  const d = info.data;
  return {
    S: Number(new anchor.BN(d.slice(40, 48), "le")),
    C: Number(new anchor.BN(d.slice(48, 56), "le")),
    I: Number(new anchor.BN(d.slice(56, 64), "le")),
  };
}

async function crearEnvio(
  payer: Keypair, id: number, sender: PublicKey, recipient: PublicKey,
  producto: string, origen: string, destino: string, frio: boolean, maxTemp: number
) {
  await sendTx(payer, [
    { pubkey: pda.config(),     isSigner: false, isWritable: true  },
    { pubkey: pda.shipment(id), isSigner: false, isWritable: true  },
    { pubkey: pda.actor(sender),isSigner: false, isWritable: true  },
    { pubkey: sender,           isSigner: false, isWritable: false },
    { pubkey: payer.publicKey,  isSigner: true,  isWritable: true  },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ], Buffer.concat([
    DISC.shipment, u64(id), pk_(recipient),
    str_(producto), str_(origen), str_(destino), bool_(frio), i16(maxTemp),
  ]), `Envío #${String(id).padStart(4,"0")}: ${producto}`);
}

async function cpk(
  payer: Keypair, sId: number, cId: number, actor: PublicKey,
  ubicacion: string, tipo: number, meta = "{}", temp = 200, hum = 55
) {
  const labels = ["Pickup","HubIn","HubOut","Transit","DeliveryAttempt","Delivered","SensorData"];
  await sendTx(payer, [
    { pubkey: pda.config(),         isSigner: false, isWritable: true  },
    { pubkey: pda.shipment(sId),    isSigner: false, isWritable: true  },
    { pubkey: pda.checkpoint(cId),  isSigner: false, isWritable: true  },
    { pubkey: pda.actor(actor),     isSigner: false, isWritable: true  },
    { pubkey: actor,                isSigner: false, isWritable: false },
    { pubkey: payer.publicKey,      isSigner: true,  isWritable: true  }, // signer_wallet
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ], Buffer.concat([
    DISC.checkpoint, u64(sId), u64(cId), str_(ubicacion), u8(tipo), str_(meta), i16(temp), u8(hum),
  ]), `  CP [${labels[tipo]}] @ ${ubicacion}`);
}

async function inc(
  payer: Keypair, sId: number, iId: number,
  reporter: PublicKey, tipo: number, desc: string
) {
  const labels = ["Retraso","Daño","Pérdida","Violación temp.","Acceso no autorizado"];
  await sendTx(payer, [
    { pubkey: pda.config(),       isSigner: false, isWritable: true  },
    { pubkey: pda.shipment(sId),  isSigner: false, isWritable: true  },
    { pubkey: pda.incident(iId),  isSigner: false, isWritable: true  },
    { pubkey: pda.actor(reporter),isSigner: false, isWritable: true  },
    { pubkey: reporter,           isSigner: false, isWritable: false }, // reporter_actor_wallet
    { pubkey: payer.publicKey,    isSigner: true,  isWritable: true  }, // signer_wallet
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ], Buffer.concat([
    DISC.incident, u64(sId), u64(iId), u8(tipo), str_(desc),
  ]), `  INC [${labels[tipo]}]: ${desc.slice(0,50)}`);
}

async function res(payer: Keypair, iId: number, notas: string) {
  await sendTx(payer, [
    { pubkey: pda.incident(iId), isSigner: false, isWritable: true  },
    { pubkey: payer.publicKey,   isSigner: true,  isWritable: false },
  ], Buffer.concat([DISC.resolve, u64(iId), str_(notas)]),
  `  INC #${iId} RESUELTA`);
}

async function main() {
  console.log("\n" + "=".repeat(62));
  console.log("  LogiChain — Datos de demostración (10 envíos)");
  console.log("=".repeat(62));

  const keyPath = fs.existsSync(path.join(process.env.HOME!, ".config/solana/backpack.json"))
    ? path.join(process.env.HOME!, ".config/solana/backpack.json")
    : path.join(process.env.HOME!, ".config/solana/id.json");
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(keyPath, "utf-8")))
  );
  console.log("\nPayer:", payer.publicKey.toString());

  const bal = await CONNECTION.getBalance(payer.publicKey);
  if (bal < 2 * anchor.web3.LAMPORTS_PER_SOL) {
    await CONNECTION.confirmTransaction(
      await CONNECTION.requestAirdrop(payer.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL)
    );
    console.log("Airdrop OK");
  }

  const ini = await leerConfig();
  let { S, C, I } = ini;
  console.log(`Contadores iniciales → S:${S} C:${C} I:${I}\n`);

  // 1 — ENTREGADO, cadena de frío
  console.log("[ 1/10] Vacunas COVID — Bogotá → Cali — ENTREGADO");
  await crearEnvio(payer, S, W.SENDER_1, W.RECIPIENT_1,
    "Vacunas COVID-19 lote BNT-2025", "Bogotá, Bogotá D.C.", "Cali, Valle del Cauca", true, 80);
  await cpk(payer, S, C++, W.CARRIER_1, "Bodega Fontibón, Bogotá",               0, "{}", 72, 45);
  await cpk(payer, S, C++, W.CARRIER_1, "Vía Panamericana, Km 230",              3, "{}", 71, 50);
  await cpk(payer, S, C++, W.HUB_1,     "Hub Cali Norte, Valle del Cauca",       1, "{}", 68, 48);
  await cpk(payer, S, C++, W.HUB_1,     "Hub Cali Norte, Valle del Cauca",       2, "{}", 70, 47);
  await cpk(payer, S, C++, W.CARRIER_1, "Barrio El Peñón, Cali",                 4, "{}", 75, 50);
  await cpk(payer, S, C++, W.RECIPIENT_1,"Clínica Valle del Lili, Cali",          5, '{"received_by":"Dra. Ospina"}', 77, 52);
  S++;

  // 2 — EN TRÁNSITO, retraso resuelto
  console.log("[ 2/10] Equipos médicos — Bogotá → Medellín — EN TRÁNSITO");
  await crearEnvio(payer, S, W.SENDER_1, W.RECIPIENT_2,
    "Equipos diagnóstico por imagen", "Bogotá, Bogotá D.C.", "Medellín, Antioquia", false, 500);
  await cpk(payer, S, C++, W.CARRIER_1, "Zona Industrial Puente Aranda, Bogotá", 0, "{}", 200, 60);
  await inc(payer, S, I++, W.CARRIER_1, 0,
    "Cierre vial autopista Bogotá-Medellín por derrumbe. Retraso estimado 4 horas.");
  // await res(payer, I,  // I ya incrementado "Ruta alterna por La Pintada. Carga sin daños. Tiempo recuperado parcialmente.");
  await cpk(payer, S, C++, W.CARRIER_1, "Autopista Bogotá-Medellín, Km 180",    3, "{}", 195, 58);
  S++;

  // 3 — EN HUB, sensor data, cadena de frío
  console.log("[ 3/10] Muestras laboratorio — Bogotá → Barranquilla — EN HUB");
  await crearEnvio(payer, S, W.SENDER_2, W.RECIPIENT_1,
    "Muestras biológicas certificadas", "Bogotá, Bogotá D.C.", "Barranquilla, Atlántico", true, 40);
  await cpk(payer, S, C++, W.CARRIER_2, "Lab. Clínico Referencia, Bogotá",      0, '{"seals":"3/3-ok"}', 38, 40);
  await cpk(payer, S, C++, W.CARRIER_2, "Aeropuerto El Dorado, Bogotá",         6, '{"temp_c":3.8,"battery":98}', 38, 42);
  await cpk(payer, S, C++, W.HUB_2,     "Hub Aéreo Barranquilla",               1, '{"temp_c":3.9,"seals":"ok"}', 39, 44);
  S++;

  // 4 — INCIDENCIA ABIERTA, daño
  console.log("[ 4/10] Tablets educativas — Bogotá → Cartagena — INCIDENCIA ABIERTA");
  await crearEnvio(payer, S, W.SENDER_1, W.RECIPIENT_2,
    "Tablets educativas modelo ED-Pro x50", "Bogotá, Bogotá D.C.", "Cartagena, Bolívar", false, 500);
  await cpk(payer, S, C++, W.CARRIER_1, "Centro Logístico Siberia, Cundinamarca", 0, "{}", 200, 55);
  await cpk(payer, S, C++, W.HUB_1,     "Hub Bucaramanga, Santander",             1, "{}", 205, 57);
  await inc(payer, S, I++, W.CARRIER_1, 1,
    "Caja #3 daño visible en esquina superior. Posible impacto al contenido.");
  S++;

  // 5 — ENTREGADO, violación temperatura resuelta
  console.log("[ 5/10] Insulina refrigerada — Bogotá → Pereira — ENTREGADO");
  await crearEnvio(payer, S, W.SENDER_2, W.RECIPIENT_1,
    "Insulina Glargina 100UI/ml — 500 unidades", "Bogotá, Bogotá D.C.", "Pereira, Risaralda", true, 80);
  await cpk(payer, S, C++, W.CARRIER_2, "Farmacéutica Nacional, Bogotá",        0, '{"lot":"INS-2025-089"}', 72, 45);
  await cpk(payer, S, C++, W.CARRIER_2, "Vía Armenia, Km 45",                   6, '{"temp_c":5.5}', 55, 50);
  await cpk(payer, S, C++, W.HUB_2,     "Hub Armenia, Quindío",                 1, '{"temp_c":5.8}', 58, 48);
  await cpk(payer, S, C++, W.HUB_2,     "Hub Armenia, Quindío",                 2, "{}", 60, 47);
  await cpk(payer, S, C++, W.CARRIER_2, "Hospital Santa Mónica, Pereira",       4, "{}", 65, 50);
  await cpk(payer, S, C++, W.RECIPIENT_1,"Hospital Santa Mónica, Pereira",       5,
    '{"received_by":"Dra. García","units_verified":500}', 68, 52);
  S++;

  // 6 — EN REPARTO
  console.log("[ 6/10] Documentos legales — Bogotá → Bucaramanga — EN REPARTO");
  await crearEnvio(payer, S, W.SENDER_1, W.RECIPIENT_2,
    "Escrituras notariales Lote 7-B", "Bogotá, Bogotá D.C.", "Bucaramanga, Santander", false, 500);
  await cpk(payer, S, C++, W.CARRIER_1, "Notaría 32 Bogotá, Kennedy",           0, "{}", 200, 55);
  await cpk(payer, S, C++, W.HUB_1,     "Hub Tunja, Boyacá",                    1, "{}", 198, 57);
  await cpk(payer, S, C++, W.HUB_1,     "Hub Tunja, Boyacá",                    2, "{}", 200, 56);
  await cpk(payer, S, C++, W.CARRIER_1, "Barrio Cabecera, Bucaramanga",          4, "{}", 202, 58);
  S++;

  // 7 — EN TRÁNSITO, solo pickup
  console.log("[ 7/10] Repuestos industriales — Bogotá → Cúcuta — EN TRÁNSITO");
  await crearEnvio(payer, S, W.SENDER_2, W.RECIPIENT_1,
    "Válvulas industriales 2 pulgadas — lote 50u", "Bogotá, Bogotá D.C.", "Cúcuta, Norte de Santander", false, 500);
  await cpk(payer, S, C++, W.CARRIER_2, "Zona Franca Bogotá, Fontibón",         0, "{}", 200, 60);
  S++;

  // 8 — ENTREGADO, acceso no autorizado resuelto
  console.log("[ 8/10] Obra de arte — Bogotá → Cartagena — ENTREGADO");
  await crearEnvio(payer, S, W.SENDER_1, W.RECIPIENT_2,
    "Escultura bronce El Abrazo — Botero", "Bogotá, Bogotá D.C.", "Cartagena, Bolívar", false, 500);
  await cpk(payer, S, C++, W.CARRIER_1, "Museo Nacional, Bogotá",               0, '{"packaging":"caja-madera-reforzada"}', 200, 60);
  await cpk(payer, S, C++, W.CARRIER_1, "Aeropuerto El Dorado, carga",          3, "{}", 200, 58);
  await cpk(payer, S, C++, W.HUB_2,     "Aeropuerto Rafael Núñez, Cartagena",  1, "{}", 198, 70);
  await cpk(payer, S, C++, W.CARRIER_2, "Centro Histórico, Cartagena",          4, "{}", 202, 72);
  await cpk(payer, S, C++, W.RECIPIENT_2,"Museo del Oro Cartagena",              5,
    '{"received_by":"Dir. Museo","condition":"perfecto"}', 200, 71);
  S++;

  // 9 — DOS INCIDENCIAS (1 resuelta, 1 abierta)
  console.log("[ 9/10] Alimentos perecederos — Bogotá → Villavicencio — 2 INCIDENCIAS");
  await crearEnvio(payer, S, W.SENDER_2, W.RECIPIENT_1,
    "Productos lácteos premium — 200 kg", "Bogotá, Bogotá D.C.", "Villavicencio, Meta", true, 40);
  await cpk(payer, S, C++, W.CARRIER_2, "Planta Colanta, Bogotá",               0, '{"weight_kg":200}', 35, 50);
  await inc(payer, S, I++, W.CARRIER_2, 0,
    "Accidente vial en vía al Llano — Derrumbe km 50. Espera de 3 horas.");
  // await res(payer, I,  // I ya incrementado "Vía habilitada por INVIAS. Temperatura mantenida correctamente durante la espera.");
  await cpk(payer, S, C++, W.CARRIER_2, "Vía al Llano, Km 48",                  6, '{"temp_c":3.8}', 38, 52);
  await inc(payer, S, I++, W.HUB_2, 3,
    "Sensor contenedor #2 registra 5.2°C, superando límite de 4°C. Se notificó al cliente.");
  S++;

  // 10 — ACCESO NO AUTORIZADO abierto
  console.log("[10/10] Carga mixta — Bogotá → Manizales — ACCESO NO AUTORIZADO");
  await crearEnvio(payer, S, W.SENDER_1, W.RECIPIENT_1,
    "Material de construcción especializado", "Bogotá, Bogotá D.C.", "Manizales, Caldas", false, 500);
  await cpk(payer, S, C++, W.CARRIER_1, "Bodega Calle 13, Bogotá",              0, "{}", 200, 60);
  await cpk(payer, S, C++, W.HUB_1,     "Hub Honda, Tolima",                    1, "{}", 202, 62);
  await inc(payer, S, I++, W.HUB_1, 4,
    "Sello de seguridad #7 violado. Posible acceso no autorizado durante transbordo en Honda.");
  await cpk(payer, S, C++, W.HUB_1,     "Hub Honda, Tolima",                    2,
    '{"seals_replaced":"si","report":"POL-2025-8834"}', 200, 60);
  await cpk(payer, S, C++, W.CARRIER_1, "Autopista Bogotá-Manizales, Km 180",   3, "{}", 198, 58);
  S++;

  const fin = await leerConfig();
  console.log("\n" + "=".repeat(62));
  console.log("  COMPLETADO EXITOSAMENTE");
  console.log("=".repeat(62));
  console.log(`  Envíos creados:       10   (total: ${fin.S})`);
  console.log(`  Checkpoints creados:  ${fin.C - ini.C}   (total: ${fin.C})`);
  console.log(`  Incidencias creadas:  ${fin.I - ini.I}    (total: ${fin.I})`);
  console.log(`  Incidencias resueltas: 4`);
  console.log(`  Incidencias abiertas:  3`);
  console.log();
  console.log("  #01 Vacunas COVID          ENTREGADO   6CPK 0INC cadena frio");
  console.log("  #02 Equipos medicos        EN TRANSITO 2CPK 1INC resuelta");
  console.log("  #03 Muestras laboratorio   EN HUB      3CPK 0INC sensor data");
  console.log("  #04 Tablets educativas     EN HUB      2CPK 1INC abierta");
  console.log("  #05 Insulina refrigerada   ENTREGADO   7CPK 1INC resuelta");
  console.log("  #06 Documentos legales     EN REPARTO  4CPK 0INC");
  console.log("  #07 Repuestos industriales EN TRANSITO 1CPK 0INC");
  console.log("  #08 Obra de arte           ENTREGADO   5CPK 1INC resuelta");
  console.log("  #09 Alimentos perecederos  EN TRANSITO 2CPK 2INC 1res+1ab");
  console.log("  #10 Carga mixta            EN TRANSITO 4CPK 1INC abierta");
  console.log();
  console.log("  >> Abre http://localhost:3000 y presiona el boton Actualizar");
  console.log("=".repeat(62) + "\n");
}

main().catch(e => { console.error("Error:", e); process.exit(1); });
