// scripts/init.ts
// Inicializa el programa, registra actores y transfiere admin a Backpack.
// Usa transacciones directas sin anchor.Program para evitar incompatibilidad de IDL.
// Ejecutar: npx ts-node scripts/init.ts

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import * as borsh from "@coral-xyz/borsh";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROGRAM_ID = new PublicKey("88jtu9fMGP9VMtSiXCvva4xy6W3i9CufnYFXMrvgKtRA");
const ADMIN = new PublicKey("6irouK8iDnxD22trbKddM3s1KhfHgF3CYHPPG8zy6tfp");
const CONNECTION = new Connection("http://localhost:8899", "confirmed");

const ACTORES = [
  { name: "SENDER 1",    wallet: "9NahCw2mCeyGfByyW7SJUjtLTkkJhxt7R6BnKhYD75yP", roleIdx: 0, location: "Bogotá, Bogotá D.C." },
  { name: "CARRIER 1",   wallet: "6wBDWTd5oSQRfVeZKT63RaG4cAmbYvrM2Wcsu4Cv85gv", roleIdx: 1, location: "Bogotá, Bogotá D.C." },
  { name: "HUB 1",       wallet: "E46WK8aKHonmhYJeFa5L9n9TTMtEUgT3yJttDwwr98Fy", roleIdx: 2, location: "Bogotá, Bogotá D.C." },
  { name: "RECIPIENT 1", wallet: "H29kiRNHrVFtdWm84AXsuyZUiLYNsX5VqmJnfvjTFetC", roleIdx: 3, location: "Cali, Valle del Cauca" },
  { name: "SENDER 2",    wallet: "FNgwZejMCV6NdkjRxUPmhpkY1aGoRUR7fv43dk2PmJXa", roleIdx: 0, location: "Bogotá, Bogotá D.C." },
  { name: "CARRIER 2",   wallet: "9QTttwTjydFPWsi1mQ3fSrHXJAV6r4T7XvyFX2iw9GD7", roleIdx: 1, location: "Bogotá, Bogotá D.C." },
  { name: "HUB 2",       wallet: "4JHeGQrFqL8APX45EnViGTd3sDY8gGmi89dcdFxbrgGc", roleIdx: 2, location: "Facatativá, Cundinamarca" },
  { name: "RECIPIENT 2", wallet: "4g6GasnTriRGwAn99hZivVyXZHmfPfL8RvPyeP1SAsNc", roleIdx: 3, location: "Medellín, Antioquia" },
  { name: "INSPECTOR 1", wallet: "88qjGshdQuyQgdmTwc7L97V5JkTaErj5FFhe44Ari5T9", roleIdx: 4, location: "Bogotá, Bogotá D.C." },
];

// Calcular discriminador Anchor: sha256("global:nombre")[0..8]
function disc(name: string): Buffer {
  return Buffer.from(createHash("sha256").update(`global:${name}`).digest()).slice(0, 8);
}

function writeU8(n: number): Buffer { const b = Buffer.alloc(1); b.writeUInt8(n); return b; }
function writeU32(n: number): Buffer { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }
function writeStr(s: string): Buffer {
  const bytes = Buffer.from(s, "utf8");
  return Buffer.concat([writeU32(bytes.length), bytes]);
}
function writePubkey(pk: PublicKey): Buffer { return Buffer.from(pk.toBytes()); }

async function sendTx(payer: Keypair, keys: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[], data: Buffer) {
  const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
  const tx = new Transaction().add(ix);
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await CONNECTION.getLatestBlockhash()).blockhash;
  tx.sign(payer);
  const sig = await CONNECTION.sendRawTransaction(tx.serialize());
  await CONNECTION.confirmTransaction(sig, "confirmed");
  return sig;
}

async function main() {
  console.log("Program ID:", PROGRAM_ID.toString());

  const backpackPath = path.join(process.env.HOME!, ".config/solana/backpack.json");
  const defaultPath = path.join(process.env.HOME!, ".config/solana/id.json");
  const keyPath = fs.existsSync(backpackPath) ? backpackPath : defaultPath;
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keyPath, "utf-8"))));
  console.log("Payer:", payer.publicKey.toString());

  const balance = await CONNECTION.getBalance(payer.publicKey);
  console.log("Balance:", balance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
  if (balance < anchor.web3.LAMPORTS_PER_SOL) {
    await CONNECTION.confirmTransaction(await CONNECTION.requestAirdrop(payer.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL));
  }
  const adminBal = await CONNECTION.getBalance(ADMIN);
  if (adminBal < anchor.web3.LAMPORTS_PER_SOL) {
    await CONNECTION.confirmTransaction(await CONNECTION.requestAirdrop(ADMIN, 5 * anchor.web3.LAMPORTS_PER_SOL));
    console.log("Airdrop admin OK");
  }

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  console.log("Config PDA:", configPda.toString());

  const existing = await CONNECTION.getAccountInfo(configPda);
  if (!existing) {
    console.log("Inicializando programa...");
    const data = disc("initialize");
    await sendTx(payer, [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ], data);
    console.log("Inicializado OK");
  } else {
    const currentAdmin = new PublicKey(existing.data.slice(8, 40));
    console.log("Config ya existe. Admin:", currentAdmin.toString());
    if (currentAdmin.equals(ADMIN)) {
      console.log("Backpack ya es admin. Solo registrando actores faltantes...");
      await registrarActores(payer, configPda, true);
      return;
    }
  }

  // Registrar actores antes de transferir
  await registrarActores(payer, configPda, false);

  // Transferir autoridad a Backpack
  console.log("Transfiriendo autoridad a Backpack...");
  const transferData = Buffer.concat([disc("transfer_authority"), writePubkey(ADMIN)]);
  await sendTx(payer, [
    { pubkey: configPda, isSigner: false, isWritable: true },
    { pubkey: payer.publicKey, isSigner: true, isWritable: false },
  ], transferData);
  console.log("Autoridad transferida a Backpack");

  const info = await CONNECTION.getAccountInfo(configPda);
  const finalAdmin = new PublicKey(info!.data.slice(8, 40));
  console.log("\n=== LISTO ===");
  console.log("Admin on-chain:", finalAdmin.toString());
  console.log("Es Backpack:", finalAdmin.equals(ADMIN));
  console.log("Conecta Backpack en el frontend.");
}

async function registrarActores(payer: Keypair, configPda: PublicKey, adminEsBackpack: boolean) {
  console.log("\n=== Registrando actores ===");
  let registrados = 0; let omitidos = 0;

  for (const actor of ACTORES) {
    const actorWallet = new PublicKey(actor.wallet);
    const [actorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("actor"), actorWallet.toBytes()], PROGRAM_ID
    );
    const existe = await CONNECTION.getAccountInfo(actorPda);
    if (existe) { console.log(`  ⏭  ${actor.name} ya registrado`); omitidos++; continue; }
    if (adminEsBackpack) {
      console.log(`  ⚠  ${actor.name} no registrado. Hazlo desde el frontend con Backpack.`);
      continue;
    }
    try {
      const data = Buffer.concat([
        disc("register_actor"),
        writePubkey(actorWallet),
        writeStr(actor.name),
        writeU8(actor.roleIdx),
        writeStr(actor.location),
      ]);
      await sendTx(payer, [
        { pubkey: configPda, isSigner: false, isWritable: false },
        { pubkey: actorPda, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ], data);
      console.log(`  ✅ ${actor.name} registrado`);
      registrados++;
    } catch (e: unknown) {
      console.error(`  ❌ ${actor.name}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`Registrados: ${registrados}, omitidos: ${omitidos}`);
}

main().catch(e => { console.error(e); process.exit(1); });
