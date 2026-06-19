import { Connection, PublicKey, GetProgramAccountsFilter } from "@solana/web3.js";
import * as borsh from "@coral-xyz/borsh";
import { sha256 } from "@noble/hashes/sha256";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "88jtu9fMGP9VMtSiXCvva4xy6W3i9CufnYFXMrvgKtRA"
);

export const RPC_ENDPOINT = "http://localhost:8899";

export interface ShipmentData {
  publicKey: string;
  id: number;
  sender: string;
  recipient: string;
  product: string;
  origin: string;
  destination: string;
  dateCreated: Date;
  dateDelivered: Date | null;
  status: string;
  checkpointCount: number;
  incidentCount: number;
  openIncidentCount: number;
  requiresColdChain: boolean;
  maxTemperature: number;
}

export interface CheckpointData {
  publicKey: string;
  id: number;
  shipmentId: number;
  actor: string;
  location: string;
  checkpointType: string;
  timestamp: Date;
  metadata: string;
  temperature: number;
  humidity: number;
}

export interface IncidentData {
  publicKey: string;
  id: number;
  shipmentId: number;
  incidentType: string;
  reporter: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  resolutionNotes: string;
}

// Calcula el discriminador igual que Anchor:
// sha256("account:NombreTipo")[0..8]
function discriminator(name: string): Buffer {
  const hash = sha256(new TextEncoder().encode("account:" + name));
  return Buffer.from(hash.slice(0, 8));
}

const SHIPMENT_DISC = discriminator("Shipment");
const CHECKPOINT_DISC = discriminator("Checkpoint");
const INCIDENT_DISC = discriminator("Incident");

// Esquemas Borsh — deben coincidir EXACTAMENTE con state.rs
const SHIPMENT_SCHEMA = borsh.struct([
  borsh.u64("id"),
  borsh.publicKey("sender"),
  borsh.publicKey("recipient"),
  borsh.str("product"),
  borsh.str("origin"),
  borsh.str("destination"),
  borsh.i64("dateCreated"),
  borsh.i64("dateDelivered"),
  borsh.u8("status"),
  borsh.u32("checkpointCount"),
  borsh.u32("incidentCount"),
  borsh.bool("requiresColdChain"),
  borsh.i16("maxTemperature"),
  borsh.u8("bump"),
]);

const CHECKPOINT_SCHEMA = borsh.struct([
  borsh.u64("id"),
  borsh.u64("shipmentId"),
  borsh.publicKey("actor"),
  borsh.str("location"),
  borsh.u8("checkpointType"),
  borsh.i64("timestamp"),
  borsh.str("metadata"),
  borsh.i16("temperature"),
  borsh.u8("humidity"),
  borsh.u8("bump"),
]);

const INCIDENT_SCHEMA = borsh.struct([
  borsh.u64("id"),
  borsh.u64("shipmentId"),
  borsh.u8("incidentType"),
  borsh.publicKey("reporter"),
  borsh.str("description"),
  borsh.i64("timestamp"),
  borsh.bool("resolved"),
  borsh.str("resolutionNotes"),
  borsh.u8("bump"),
]);

export async function getAllShipments(
  connection: Connection
): Promise<ShipmentData[]> {
  try {
    const filter: GetProgramAccountsFilter = {
      memcmp: {
        offset: 0,
        bytes: SHIPMENT_DISC.toString("base64"),
        encoding: "base64" as const,
      },
    };

    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [filter],
      commitment: "confirmed",
    });

    console.log("Shipment accounts encontradas:", accounts.length);

    const result: ShipmentData[] = [];
    for (const { pubkey, account } of accounts) {
      try {
        const data = account.data.slice(8);
        const d = SHIPMENT_SCHEMA.decode(data);
        result.push({
          publicKey: pubkey.toString(),
          id: Number(d.id),
          sender: d.sender.toString(),
          recipient: d.recipient.toString(),
          product: d.product,
          origin: d.origin,
          destination: d.destination,
          dateCreated: (() => { const n = Number(d.dateCreated); console.log('dateCreated raw:', d.dateCreated, 'Number:', n); return new Date(n > 1e11 ? n : n * 1000); })(),
          dateDelivered: Number(d.dateDelivered) === 0
            ? null
            : (() => { const n = Number(d.dateDelivered); return new Date(n > 1e11 ? n : n * 1000); })(),
          status: parseStatusU8(d.status),
          checkpointCount: d.checkpointCount,
          incidentCount: d.incidentCount,
          openIncidentCount: 0,
          requiresColdChain: d.requiresColdChain,
          maxTemperature: d.maxTemperature,
        });
      } catch (e) {
        console.warn("Error decodificando Shipment:", pubkey.toString(), e);
      }
    }
    return result.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.error("Error en getAllShipments:", error);
    return [];
  }
}

export async function getShipmentCheckpoints(
  connection: Connection,
  shipmentId: number
): Promise<CheckpointData[]> {
  try {
    const idBytes = Buffer.alloc(8);
    idBytes.writeBigUInt64LE(BigInt(shipmentId));

    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      commitment: "confirmed",
      filters: [
        { memcmp: { offset: 0, bytes: CHECKPOINT_DISC.toString("base64"), encoding: "base64" as const } },
        { memcmp: { offset: 16, bytes: idBytes.toString("base64"), encoding: "base64" as const } },
      ],
    });

    const result: CheckpointData[] = [];
    for (const { pubkey, account } of accounts) {
      try {
        const d = CHECKPOINT_SCHEMA.decode(account.data.slice(8));
        result.push({
          publicKey: pubkey.toString(),
          id: Number(d.id),
          shipmentId: Number(d.shipmentId),
          actor: d.actor.toString(),
          location: d.location,
          checkpointType: parseCheckpointTypeU8(d.checkpointType),
          timestamp: new Date(Number(d.timestamp) * 1000),
          metadata: d.metadata,
          temperature: d.temperature,
          humidity: d.humidity,
        });
      } catch (e) {
        console.warn("Error decodificando Checkpoint:", pubkey.toString(), e);
      }
    }
    return result.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.error("Error en getShipmentCheckpoints:", error);
    return [];
  }
}

export async function getShipmentIncidents(
  connection: Connection,
  shipmentId: number
): Promise<IncidentData[]> {
  try {
    const idBytes = Buffer.alloc(8);
    idBytes.writeBigUInt64LE(BigInt(shipmentId));

    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      commitment: "confirmed",
      filters: [
        { memcmp: { offset: 0, bytes: INCIDENT_DISC.toString("base64"), encoding: "base64" as const } },
        { memcmp: { offset: 16, bytes: idBytes.toString("base64"), encoding: "base64" as const } },
      ],
    });

    const result: IncidentData[] = [];
    for (const { pubkey, account } of accounts) {
      try {
        const d = INCIDENT_SCHEMA.decode(account.data.slice(8));
        result.push({
          publicKey: pubkey.toString(),
          id: Number(d.id),
          shipmentId: Number(d.shipmentId),
          incidentType: parseIncidentTypeU8(d.incidentType),
          reporter: d.reporter.toString(),
          description: d.description,
          timestamp: new Date(Number(d.timestamp) * 1000),
          resolved: d.resolved,
          resolutionNotes: d.resolutionNotes ?? "",
        });
      } catch (e) {
        console.warn("Error decodificando Incident:", pubkey.toString(), e);
      }
    }
    return result;
  } catch (error) {
    console.error("Error en getShipmentIncidents:", error);
    return [];
  }
}

export function getShipmentPda(shipmentId: number): [PublicKey, number] {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(shipmentId));
  return PublicKey.findProgramAddressSync([Buffer.from("shipment"), b], PROGRAM_ID);
}

export function getActorPda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("actor"), wallet.toBuffer()], PROGRAM_ID);
}

export function getConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
}

function parseStatusU8(v: number): string {
  return ["Created","InTransit","AtHub","OutForDelivery","Delivered","Returned","Cancelled"][v] ?? "Unknown";
}
function parseCheckpointTypeU8(v: number): string {
  return ["Pickup","HubIn","HubOut","Transit","DeliveryAttempt","Delivered","SensorData"][v] ?? "Unknown";
}
function parseIncidentTypeU8(v: number): string {
  return ["Delay","Damage","Lost","TempViolation","Unauthorized"][v] ?? "Unknown";
}

export function formatTemperature(tempX10: number): string {
  return `${(tempX10 / 10).toFixed(1)}°C`;
}
export function isTempViolation(tempX10: number, maxTempX10: number, coldChain: boolean): boolean {
  return coldChain && tempX10 > maxTempX10;
}
export function getStatusColor(status: string): string {
  const c: Record<string, string> = {
    Created: "#3B82F6", InTransit: "#F59E0B", AtHub: "#8B5CF6",
    OutForDelivery: "#10B981", Delivered: "#059669",
    Returned: "#EF4444", Cancelled: "#6B7280",
  };
  return c[status] || "#6B7280";
}
export function getStatusLabel(status: string): string {
  const l: Record<string, string> = {
    Created: "Creado", InTransit: "En Transito", AtHub: "En Hub",
    OutForDelivery: "En Ruta de Entrega", Delivered: "Entregado",
    Returned: "Devuelto", Cancelled: "Cancelado",
  };
  return l[status] || status;
}
export function getCheckpointIcon(type: string): string {
  const i: Record<string, string> = {
    Pickup: "📦", HubIn: "🏭", HubOut: "🚛", Transit: "✈️",
    DeliveryAttempt: "🔔", Delivered: "✅", SensorData: "📡",
  };
  return i[type] || "📍";
}

export function getCheckpointPda(checkpointId: number): [PublicKey, number] {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(checkpointId));
  return PublicKey.findProgramAddressSync([Buffer.from("checkpoint"), b], PROGRAM_ID);
}

export function getIncidentPda(incidentId: number): [PublicKey, number] {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(incidentId));
  return PublicKey.findProgramAddressSync([Buffer.from("incident"), b], PROGRAM_ID);
}
