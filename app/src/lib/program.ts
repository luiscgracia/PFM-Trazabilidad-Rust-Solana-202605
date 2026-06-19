import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./logistics";

// Construye el objeto Program de Anchor.
// Se llama antes de cualquier instruccion on-chain.
// Incluye airdrop automatico en localnet si el balance es bajo.
export async function loadProgram(
  wallet: anchor.Wallet,
  connection: anchor.web3.Connection
) {
  if (wallet.publicKey) {
    const balance = await connection.getBalance(wallet.publicKey);
    if (balance < 0.05 * anchor.web3.LAMPORTS_PER_SOL) {
      console.log("Balance bajo, solicitando airdrop en localnet...");
      try {
        const sig = await connection.requestAirdrop(
          wallet.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(sig);
        console.log("Airdrop OK — 2 SOL");
      } catch (e) {
        console.warn("Airdrop fallido (normal en devnet/mainnet):", e);
      }
    }
  }

  const res = await fetch("/idl.json");
  if (!res.ok)
    throw new Error(
      "No se encontro /idl.json. Ejecuta: cp target/idl/logistics_traceability.json app/public/idl.json"
    );
  const idl = await res.json();
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  try {
    return new anchor.Program(idl, provider);
  } catch {
    // Anchor 0.31 a veces necesita el programId explicito
    return new anchor.Program(idl, PROGRAM_ID, provider);
  }
}

// Tipo de notificacion de estado de transaccion
export interface TxStatus {
  msg: string;
  ok: boolean;
}

// Tipos de roles disponibles
export const ROLE_OPTIONS = [
  { value: "0", label: "📦 Sender — Remitente (crea envíos)" },
  { value: "1", label: "🚛 Carrier — Transportista (registra checkpoints)" },
  { value: "2", label: "🏭 Hub — Hub logístico (registra checkpoints)" },
  { value: "3", label: "🏥 Recipient — Destinatario (confirma entrega)" },
  { value: "4", label: "🔍 Inspector — Solo lectura (auditoría)" },
];

export const ROLE_ANCHOR_OBJS = [
  { sender: {} },
  { carrier: {} },
  { hub: {} },
  { recipient: {} },
  { inspector: {} },
] as const;
