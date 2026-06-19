import { Connection, PublicKey } from "@solana/web3.js";
import * as borsh from "@coral-xyz/borsh";
import { sha256 } from "@noble/hashes/sha256";
import { PROGRAM_ID } from "./logistics";

// ============================================================
// Tipos
// ============================================================
export interface ActorData {
  publicKey: string;
  address: string;
  name: string;
  role: string;
  location: string;
  isActive: boolean;
  createdAt: Date;
  shipmentsCreated: number;
  checkpointsRecorded: number;
}

// ============================================================
// Discriminador y schema Borsh
// ============================================================
function discriminator(name: string): Buffer {
  const hash = sha256(new TextEncoder().encode("account:" + name));
  return Buffer.from(hash.slice(0, 8));
}

const ACTOR_DISC = discriminator("Actor");

const ACTOR_SCHEMA = borsh.struct([
  borsh.publicKey("address"),
  borsh.str("name"),
  borsh.u8("role"),
  borsh.str("location"),
  borsh.bool("isActive"),
  borsh.i64("createdAt"),
  borsh.u32("shipmentsCreated"),
  borsh.u32("checkpointsRecorded"),
  borsh.u8("bump"),
]);

export const ROLE_LABELS = ["Sender", "Carrier", "Hub", "Recipient", "Inspector"];

export const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  Sender:    { bg: "#E6F1FB", text: "#0C447C" },
  Carrier:   { bg: "#E1F5EE", text: "#085041" },
  Hub:       { bg: "#EEEDFE", text: "#3C3489" },
  Recipient: { bg: "#FAEEDA", text: "#633806" },
  Inspector: { bg: "#F1EFE8", text: "#444441" },
};

// ============================================================
// Leer todos los Actors on-chain
// ============================================================
export async function getAllActors(connection: Connection): Promise<ActorData[]> {
  try {
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      commitment: "confirmed",
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: ACTOR_DISC.toString("base64"),
            encoding: "base64" as const,
          },
        },
      ],
    });

    const result: ActorData[] = [];
    for (const { pubkey, account } of accounts) {
      try {
        const d = ACTOR_SCHEMA.decode(account.data.slice(8));
        result.push({
          publicKey: pubkey.toString(),
          address: d.address.toString(),
          name: d.name,
          role: ROLE_LABELS[d.role] ?? "Unknown",
          location: d.location,
          isActive: d.isActive,
          createdAt: new Date(Number(d.createdAt) * 1000),
          shipmentsCreated: d.shipmentsCreated,
          checkpointsRecorded: d.checkpointsRecorded,
        });
      } catch {
        // skip malformed accounts
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.error("Error leyendo actores:", e);
    return [];
  }
}
