import { getAllActors } from "../../lib/actors";
import { PROGRAM_ID } from "../../lib/logistics";
import { useState, useCallback, useEffect, useRef } from "react";
import { useWallet, useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  getAllShipments, getShipmentCheckpoints, getShipmentIncidents,
  getConfigPda, getActorPda, getShipmentPda, getCheckpointPda, getIncidentPda,
  getStatusColor, getStatusLabel, getCheckpointIcon, formatTemperature, isTempViolation,
  type ShipmentData, type CheckpointData, type IncidentData,
} from "../../lib/logistics";
import { loadProgram } from "../../lib/program";
import { useS } from "../styles";
import { LocationSearch } from "../LocationSearch";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

// ============================================================
// Props
// ============================================================
interface ShipmentsTabProps {
  notify: (msg: string, ok?: boolean) => void;
  onShipmentsChange?: (count: number, inTransit: number, incidents: number, delivered?: number) => void;
  searchShipmentId?: number | null;
  onSearchDone?: () => void;
  openCreate?: boolean;
  onOpenCreateDone?: () => void;
}

type View = "list" | "detail" | "create";
type ModalType = "checkpoint" | "incident" | "resolve" | null;

// ============================================================
// Subcomponente: Formulario de checkpoint
// ============================================================
function CheckpointModal({
  shipment,
  onClose,
  onSuccess,
  notify,
}: {
  shipment: ShipmentData;
  onClose: () => void;
  onSuccess: () => void;
  notify: (msg: string, ok?: boolean) => void;
}) {
  const S = useS();
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const [form, setForm] = useState({ location: "", type: "pickup", temperature: "3.0", humidity: "45", metadata: "" });

  const handleSubmit = async () => {
    if (!anchorWallet || !publicKey) return notify("Conecta tu wallet", false);
    notify("Registrando checkpoint — firma con Backpack...");
    try {
      // Si es Delivered, solo el recipient puede registrarlo
      if (form.type === "delivered") {
        if (publicKey.toString() !== shipment.recipient) {
          notify("Solo el destinatario del envío puede registrar la entrega.", false);
          onClose();
          return;
        }
        // Verificar siempre si hay incidencias sin resolver
        const incs = await getShipmentIncidents(connection, shipment.id);
        const openIncs = incs.filter(i => !i.resolved);
        if (openIncs.length > 0) {
          notify(`No se puede marcar como entregado: hay ${openIncs.length} incidencia(s) sin resolver.`, false);
          onClose();
          return;
        }
      }
      const program = await loadProgram(anchorWallet as anchor.Wallet, connection);
      const [configPda] = getConfigPda();
      const config = await program.account.programConfig.fetch(configPda);
      const checkpointId = config.nextCheckpointId as anchor.BN;
      const [shipmentPda] = getShipmentPda(shipment.id);
      const [checkpointPda] = getCheckpointPda(checkpointId.toNumber());
      const [actorPda] = getActorPda(publicKey);
      const cpTypes: Record<string, object> = {
        pickup: { pickup: {} }, hubIn: { hubIn: {} }, hubOut: { hubOut: {} },
        transit: { transit: {} }, deliveryAttempt: { deliveryAttempt: {} },
        delivered: { delivered: {} }, sensorData: { sensorData: {} },
      };
      await program.methods.recordCheckpoint(
        new anchor.BN(shipment.id), checkpointId, form.location,
        cpTypes[form.type], form.metadata || "{}",
        new anchor.BN(Math.round(parseFloat(form.temperature) * 10)), parseInt(form.humidity)
      ).accounts({
        config: configPda, shipment: shipmentPda, checkpoint: checkpointPda,
        actor: actorPda, actorWallet: publicKey, signerWallet: publicKey, systemProgram: anchor.web3.SystemProgram.programId,
      }).rpc();
      notify("Checkpoint registrado");
      onSuccess();
      onClose();
    } catch (e: unknown) {
      notify("Error: " + (e instanceof Error ? e.message : String(e)), false);
    }
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span style={S.cardTitle}>📍 Checkpoint — Envío #{String(shipment.id).padStart(4,"0")}</span>
          <button onClick={onClose} style={S.iconBtn}>✕</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <LocationSearch
            label="Ubicación"
            value={form.location}
            onChange={(v) => setForm({ ...form, location: v })}
            placeholder="Buscar municipio del checkpoint..."
          />
          <div>
            <label style={S.fLabel}>Tipo de checkpoint</label>
            <select style={S.fInput} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {[["pickup","📦 Pickup"],["hubIn","🏭 Hub In"],["hubOut","🚛 Hub Out"],
                ["transit","✈ Tránsito"],["deliveryAttempt","🔔 Intento de entrega"],
                ["delivered","✅ Entregado"],["sensorData","📡 Sensor IoT"]].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          {shipment.requiresColdChain && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={S.fLabel}>Temperatura (°C)</label>
              <input style={S.fInput} type="number" step="0.1" placeholder="Ej: 3.0" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
            </div>
            <div>
              <label style={S.fLabel}>Humedad (%)</label>
              <input style={S.fInput} type="number" min="0" max="100" value={form.humidity} onChange={(e) => setForm({ ...form, humidity: e.target.value })} />
            </div>
          </div>
          )}
          <div>
            <label style={S.fLabel}>Metadata JSON (opcional)</label>
            <input style={S.fInput} placeholder='{"operador":"hub_01"}' value={form.metadata} onChange={(e) => setForm({ ...form, metadata: e.target.value })} />
          </div>
          <button onClick={handleSubmit} disabled={!form.location} style={{ ...S.submitBtn, opacity: !form.location ? 0.5 : 1 }}>
            ✅ Registrar on-chain
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Subcomponente: Formulario de incidencia
// ============================================================
function IncidentModal({
  shipment, onClose, onSuccess, notify,
}: {
  shipment: ShipmentData;
  onClose: () => void;
  onSuccess: () => void;
  notify: (msg: string, ok?: boolean) => void;
}) {
  const S = useS();
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const [form, setForm] = useState({ type: "delay", description: "" });

  const handleSubmit = async () => {
    if (!anchorWallet || !publicKey) return notify("Conecta tu wallet", false);
    try {
      // Verificar rol del actor
      const [actorCheckPda] = getActorPda(publicKey);
      const actorInfo = await connection.getAccountInfo(actorCheckPda);
      if (!actorInfo) { notify("Tu wallet no está registrada como actor en el sistema.", false); return; }
      // role offset: 8disc+32address+4+name_len+1role
      const d = actorInfo.data; let off = 8+32; const nlen = d.readUInt32LE(off); off+=4+nlen;
      const role = d[off];
      if (role !== 1 && role !== 2 && role !== 3) { notify("Solo Carrier, Hub y Recipient pueden reportar incidencias.", false); return; }
      notify("Reportando incidencia — firma con Backpack...");
      const program = await loadProgram(anchorWallet as anchor.Wallet, connection);
      const [configPda] = getConfigPda();
      const config = await program.account.programConfig.fetch(configPda);
      const incidentId = config.nextIncidentId as anchor.BN;
      const [shipmentPda] = getShipmentPda(shipment.id);
      const [incidentPda] = getIncidentPda(incidentId.toNumber());
      const [actorPda] = getActorPda(publicKey);
      const incTypes: Record<string, object> = {
        delay: { delay: {} }, damage: { damage: {} }, lost: { lost: {} },
        tempViolation: { tempViolation: {} }, unauthorized: { unauthorized: {} },
      };
      await program.methods.reportIncident(
        new anchor.BN(shipment.id), incidentId, incTypes[form.type], form.description
      ).accounts({
        config: configPda, shipment: shipmentPda, incident: incidentPda,
        reporterActor: actorPda, reporterActorWallet: publicKey, signerWallet: publicKey, systemProgram: anchor.web3.SystemProgram.programId,
      }).rpc();
      notify("Incidencia reportada");
      onSuccess();
      onClose();
    } catch (e: unknown) {
      notify("Error: " + (e instanceof Error ? e.message : String(e)), false);
    }
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span style={S.cardTitle}>⚠ Incidencia — Envío #{String(shipment.id).padStart(4,"0")}</span>
          <button onClick={onClose} style={S.iconBtn}>✕</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={S.fLabel}>Tipo de incidencia</label>
            <select style={S.fInput} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {[["delay","⏱ Retraso"],["damage","💥 Daño físico"],["lost","❌ Extraviado"],
                ["tempViolation","🌡 Violación de temperatura"],["unauthorized","🚨 Acceso no autorizado"]].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={S.fLabel}>Descripción (máx 256 chars)</label>
            <textarea style={{ ...S.fInput, height: 80, resize: "vertical" as const }}
              placeholder="Describe la incidencia en detalle..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <button onClick={handleSubmit} disabled={!form.description} style={{ ...S.submitBtn, background: "#EF4444", opacity: !form.description ? 0.5 : 1 }}>
            🚨 Reportar on-chain
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Subcomponente: Detalle del envio con timeline e incidencias
// ============================================================

function exportShipmentPDF(
  shipment: ShipmentData,
  checkpoints: CheckpointData[],
  incidents: IncidentData[],
  status: string
) {
  const statusLabels: Record<string, string> = {
    Created: "Creado", InTransit: "En tránsito", AtHub: "En hub",
    OutForDelivery: "En reparto", Delivered: "Entregado",
    Returned: "Devuelto", Cancelled: "Cancelado",
  };
  const cpLabels: Record<string, string> = {
    Pickup: "Recogida", HubIn: "Entrada hub", HubOut: "Salida hub",
    Transit: "En tránsito", DeliveryAttempt: "Intento entrega",
    Delivered: "Entregado", SensorData: "Sensor",
  };
  const incLabels: Record<string, string> = {
    Delay: "Retraso", Damage: "Daño", Lost: "Pérdida",
    TempViolation: "Temp. fuera de rango", Unauthorized: "Acceso no autorizado",
  };
  const fmt = (ts: any) => (ts instanceof Date ? ts : new Date(Number(ts) * 1000)).toLocaleString("es-CO");

  const cpRows = checkpoints.map(c => `
    <tr>
      <td>${cpLabels[c.checkpointType] ?? c.checkpointType}</td>
      <td>${c.location}</td>
      <td>${fmt(c.timestamp)}</td>
      <td>${c.metadata && c.metadata !== "{}" ? c.metadata : "-"}</td>
    </tr>`).join("") || '<tr><td colspan="4" style="text-align:center;color:#888">Sin checkpoints</td></tr>';

  const incRows = incidents.map(i => `
    <tr>
      <td>${incLabels[i.incidentType] ?? i.incidentType}</td>
      <td>${i.description}</td>
      <td>${i.resolved ? "✅ Resuelta" : "⚠ Abierta"}</td>
      <td>${i.resolved ? (i.resolutionNotes || "-") : "-"}</td>
    </tr>`).join("") || '<tr><td colspan="4" style="text-align:center;color:#888">Sin incidencias</td></tr>';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Envío #${String(shipment.id).padStart(4,"0")}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: letter; margin: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: white; margin: 0 auto; padding: 1cm; max-width: 1100px; width: 100%; }
  .header { border-bottom: 2px solid #185FA5; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
  .header h1 { font-size: 18px; color: #185FA5; }
  .header .meta { text-align: right; font-size: 10px; color: #555; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-weight: bold; font-size: 11px; background: #E8F5E9; color: #2E7D32; margin-left: 8px; }
  .section { margin-bottom: 16px; }
  .section-title { font-size: 12px; font-weight: bold; color: #185FA5; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
  .field { margin-bottom: 4px; }
  .field label { font-size: 9px; color: #888; text-transform: uppercase; display: block; }
  .field span { font-size: 11px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #185FA5; color: white; padding: 5px 8px; text-align: left; }
  td { padding: 4px 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .footer { margin-top: 20px; font-size: 9px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
  .addr { font-size: 9px; word-break: break-all; color: #555; }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>LogiChain — Envío #${String(shipment.id).padStart(4,"0")}</h1>
    <div style="margin-top:4px">${shipment.product} <span class="status-badge">${statusLabels[status] ?? status}</span></div>
  </div>
  <div class="meta">
    Generado: ${new Date().toLocaleString("es-CO")}<br>
    Blockchain: Solana Localnet
  </div>
</div>

<div class="section">
  <div class="section-title">Información del Envío</div>
  <div class="grid">
    <div class="field"><label>Origen</label><span>${shipment.origin}</span></div>
    <div class="field"><label>Destino</label><span>${shipment.destination}</span></div>
    <div class="field"><label>Remitente</label><span class="addr">${shipment.sender}</span></div>
    <div class="field"><label>Destinatario</label><span class="addr">${shipment.recipient}</span></div>
    <div class="field"><label>Cadena de frío</label><span>${shipment.requiresColdChain ? "Sí — Máx. " + (shipment.maxTemperature / 10).toFixed(1) + "°C" : "No requerida"}</span></div>
    <div class="field"><label>Checkpoints / Incidencias</label><span>${checkpoints.length} / ${incidents.length}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Timeline de Checkpoints</div>
  <table>
    <thead><tr><th>Tipo</th><th>Ubicación</th><th>Fecha/Hora</th><th>Metadata</th></tr></thead>
    <tbody>${cpRows}</tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">Incidencias</div>
  <table>
    <thead><tr><th>Tipo</th><th>Descripción</th><th>Estado</th><th>Resolución</th></tr></thead>
    <tbody>${incRows}</tbody>
  </table>
</div>

<div class="footer">
  Documento generado automáticamente por LogiChain — Sistema de Trazabilidad Logística en Blockchain Solana
</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}

function ShipmentDetail({
  shipment, onBack, notify, onShipmentUpdated,
}: {
  shipment: ShipmentData;
  onBack: () => void;
  notify: (msg: string, ok?: boolean) => void;
  onShipmentUpdated?: (id: number, checkpointCount: number, incidentCount: number, status?: string, openIncidentCount?: number) => void;
}) {
  const S = useS();
  const { publicKey, connected } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const [checkpoints, setCheckpoints] = useState<CheckpointData[]>([]);
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [modal, setModal] = useState<ModalType>(null);
  const [selInc, setSelInc] = useState<IncidentData | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [detailLoading, setDetailLoading] = useState(true);
  const inferredStatusRef = useRef(shipment.status);
  const [inferredStatus, setInferredStatus] = useState(shipment.status);
  const updateInferredStatus = (s: string) => { inferredStatusRef.current = s; setInferredStatus(s); };

  const cpTypeToStatus: Record<string, string> = {
    Pickup:"InTransit", HubIn:"AtHub", HubOut:"InTransit",
    Transit:"InTransit", DeliveryAttempt:"OutForDelivery", Delivered:"Delivered",
  };

  const loadDetail = useCallback(async () => {
    const [chks, incs] = await Promise.all([
      getShipmentCheckpoints(connection, shipment.id),
      getShipmentIncidents(connection, shipment.id),
    ]);
    setCheckpoints(chks);
    setIncidents(incs);
    if (chks.length > 0) {
      const lastType = chks[chks.length - 1].checkpointType;
      const newStatus = cpTypeToStatus[lastType];
      if (newStatus) updateInferredStatus(newStatus);
      const openCount = incs.filter(i => !i.resolved).length;
      onShipmentUpdated?.(shipment.id, chks.length, incs.length, newStatus, openCount);
    } else {
      const openCount = incs.filter(i => !i.resolved).length;
      onShipmentUpdated?.(shipment.id, chks.length, incs.length, undefined, openCount);
    }
    setDetailLoading(false);
  }, [connection, shipment.id, onShipmentUpdated]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  // Verifica el rol del actor conectado leyendo su account on-chain.
  // Roles permitidos para checkpoint: Carrier(1), Hub(2), Recipient(3)
  // El schema Borsh del Actor tiene: address(32) + name(str) + role(u8) + ...
  // role está en offset: 8(disc) + 32(address) + 4+name_len
  const checkActorRole = async (): Promise<{ allowed: boolean; role: string }> => {
    if (!publicKey) return { allowed: false, role: "" };
    try {
      const [actorPda] = getActorPda(publicKey);
      const info = await connection.getAccountInfo(actorPda);
      if (!info) return { allowed: false, role: "no_registered" };
      // Leer el rol: offset 8(disc) + 32(pubkey) + 4(str_len) + name_bytes + role(u8)
      const data = info.data.slice(8); // skip discriminator
      // address = 32 bytes
      const nameLen = data.readUInt32LE(32);
      const roleOffset = 32 + 4 + nameLen;
      const role = data[roleOffset];
      const ROLE_LABELS = ["Sender", "Carrier", "Hub", "Recipient", "Inspector"];
      const roleName = ROLE_LABELS[role] ?? "Unknown";
      // Carrier=1, Hub=2, Recipient=3 pueden registrar checkpoints
      const allowed = role === 1 || role === 2 || role === 3;
      return { allowed, role: roleName };
    } catch {
      return { allowed: false, role: "" };
    }
  };

  const handleOpenCheckpoint = async () => {
    if (!connected) { notify("Conecta tu wallet para registrar un checkpoint", false); return; }
    const { allowed, role } = await checkActorRole();
    if (role === "no_registered") {
      notify("Tu wallet no está registrada como actor en el sistema.", false);
      return;
    }
    if (!allowed) {
      notify("Solo transportistas, hubs y destinatarios pueden registrar checkpoints.", false);
      return;
    }
    setModal("checkpoint");
  };

  const handleOpenIncident = async () => {
    if (!connected) { notify("Conecta tu wallet para reportar una incidencia", false); return; }
    const { allowed: _, role } = await checkActorRole();
    if (role === "no_registered") {
      notify("Tu wallet no está registrada como actor en el sistema.", false);
      return;
    }
    // Solo Carrier, Hub y Recipient pueden reportar incidencias
    if (!["Carrier", "Hub", "Recipient"].includes(role)) {
      notify("Solo Carrier, Hub y Recipient pueden reportar incidencias.", false);
      return;
    }
    setModal("incident");
  };

  const handleResolve = async (inc: IncidentData) => {
    if (!anchorWallet || !publicKey) return notify("Conecta tu wallet", false);
    // Verificar si la cuenta activa corresponde al reporter
    const [actorPdaCheck] = getActorPda(publicKey);
    const actorInfoCheck = await connection.getAccountInfo(actorPdaCheck);
    const actorAddress = actorInfoCheck ? new PublicKey(actorInfoCheck.data.slice(8, 40)).toString() : publicKey.toString();
    if (actorAddress !== inc.reporter) {
      notify("Solo quien reportó la incidencia puede resolverla.", false);
      setModal(null);
      setSelInc(null);
      setResolveNotes("");
      return;
    }
    notify("Resolviendo incidencia...");
    try {
      const program = await loadProgram(anchorWallet as anchor.Wallet, connection);
      const [incidentPda] = getIncidentPda(inc.id);
      await program.methods.resolveIncident(new anchor.BN(inc.id), resolveNotes)
        .accounts({ incident: incidentPda, resolverWallet: publicKey })
        .rpc();
      notify("Incidencia resuelta");
      setSelInc(null);
      setModal(null);
      await loadDetail();
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e);
      const match = raw.match(/Error Message: ([^.]+)/); 
      notify(match ? match[1] : raw, false);
    }
  };

  return (
    <>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <button onClick={onBack} style={{
            ...S.iconBtn,
            fontWeight: 700, fontSize: 13, padding: "7px 16px",
            display: "flex", alignItems: "center", gap: 6,
            background: S.navActive.background as string,
            color: S.logoTitle.color as string,
            border: `1px solid ${S.logoTitle.color as string}40`,
          }}>← Volver a la lista</button>
          <span style={S.cardTitle}>
            Envío #{String(shipment.id).padStart(4,"0")} — {shipment.product}
          </span>
          <span style={{ ...S.badge, background: getStatusColor(inferredStatus)+"22", color: getStatusColor(inferredStatus), marginLeft: "auto" }}>
            {getStatusLabel(inferredStatus)}
          </span>
          <button onClick={() => exportShipmentPDF(shipment, checkpoints, incidents, inferredStatus)} style={{ ...S.iconBtn, fontSize: 12 }} title="Exportar PDF">📄 PDF</button>
        </div>

        {/* Info del envio */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr", padding: 16, gap: "4px 16px", alignItems: "baseline" }}>
          {([
            ["Producto", shipment.product],
            ["Remitente", shipment.sender.slice(0,8)+"..."+shipment.sender.slice(-4)],
            ["Origen", shipment.origin],
            ["Destinatario", shipment.recipient.slice(0,8)+"..."+shipment.recipient.slice(-4)],
            ["Destino", shipment.destination],
            ["Creado", shipment.dateCreated.toLocaleString("es-CO")],
            ["Cadena frío", shipment.requiresColdChain ? `Sí · Máx ${formatTemperature(shipment.maxTemperature)}` : "No requerida"],
            ["Entregado", shipment.dateDelivered ? shipment.dateDelivered.toLocaleString("es-CO") : "Pendiente"],
          ] as [string,string][]).flatMap(([l, v]) => [
            <span key={l+"-l"} style={{ color: "#64748B", fontSize: 12, textAlign: "right", whiteSpace: "nowrap", padding: "3px 0", borderBottom: "0.5px solid #1E293B" }}>{l}</span>,
            <span key={l+"-v"} style={{ fontSize: 13, fontWeight: 500, padding: "3px 0", borderBottom: "0.5px solid #1E293B" }}>{v}</span>,
          ]).map(el => el)
          }
        </div>

        <div style={{ display: "flex", gap: 8, padding: "0 16px 16px", flexWrap: "wrap" }}>
          {inferredStatus !== "Delivered" && inferredStatus !== "Returned" && inferredStatus !== "Cancelled" && (<>
          <button onClick={handleOpenCheckpoint} style={S.addBtn}>+ Checkpoint</button>
          <button
            onClick={handleOpenIncident}
            style={{ ...S.addBtn, background: "#FCEBEB22", color: "#EF4444", border: "0.5px solid #EF444440" }}
          >
            ⚠ Reportar incidencia
          </button>
          </>)}
          <a
            href={`https://explorer.solana.com/address/${shipment.publicKey}?cluster=custom&customUrl=http://localhost:8899`}
            target="_blank" rel="noreferrer"
            style={{ ...S.addBtn, textDecoration: "none" }}
          >
            🔗 Explorer
          </a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* TIMELINE */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>📍 Timeline ({checkpoints.length} checkpoints)</span>
          </div>
          <div style={{ padding: 16 }}>
            {detailLoading ? (
              <div style={S.empty}>⏳ Cargando...</div>
            ) : checkpoints.length === 0 ? (
              <div style={S.empty}>Sin checkpoints registrados</div>
            ) : checkpoints.map((chk, i) => {
              const viol = isTempViolation(chk.temperature, shipment.maxTemperature, shipment.requiresColdChain);
              return (
                <div key={chk.id} style={{ display: "flex", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: viol ? "#FCEBEB" : "#EAF3DE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
                      {getCheckpointIcon(chk.checkpointType)}
                    </div>
                    {i < checkpoints.length - 1 && <div style={{ width: 1.5, flex: 1, background: "#1E293B", minHeight: 12 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{chk.checkpointType} — {chk.location}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: S.logoTitle.color as string, background: (S.logoTitle.color as string) + "15", padding: "2px 8px", borderRadius: 6, fontFamily: "monospace" }}>
                        🕐 {chk.timestamp.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                      Actor: {chk.actor.slice(0,8)}...{chk.actor.slice(-4)}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <span style={{ ...S.sensorPill, ...(viol ? { background: "#FAEEDA", color: "#633806" } : {}) }}>
                        🌡 {formatTemperature(chk.temperature)}{viol ? " ⚠" : ""}
                      </span>
                      <span style={S.sensorPill}>💧 {chk.humidity}%</span>
                    </div>
                    {viol && (
                      <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>
                        Violación de temperatura · máx {formatTemperature(shipment.maxTemperature)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* INCIDENCIAS */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>⚠ Incidencias ({incidents.length})</span>
          </div>
          <div style={{ padding: 16 }}>
            {incidents.length === 0 ? (
              <div style={S.empty}>Sin incidencias registradas</div>
            ) : incidents.map((inc) => (
              <div key={inc.id} style={{ borderBottom: "0.5px solid #1E293B", paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ ...S.badge, background: inc.resolved ? "#EAF3DE" : "#FCEBEB", color: inc.resolved ? "#27500A" : "#791F1F" }}>
                      {inc.resolved ? "✓ Resuelta" : "⚠ Activa"}
                    </span>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{inc.incidentType}</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{inc.description}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", background: "#EF444415", padding: "2px 8px", borderRadius: 6, fontFamily: "monospace" }}>
                        🕐 {inc.timestamp.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>
                      <span style={{ color: "#94A3B8", fontWeight: 600 }}>Reportado por:</span> <span style={{ fontWeight: 700, letterSpacing: 1, color: "#14F195", background: "#14F19515", padding: "1px 6px", borderRadius: 4 }}>...{inc.reporter.slice(-4)}</span>
                    </div>
                    {inc.resolved && inc.resolutionNotes && (
                      <div style={{ fontSize: 11, marginTop: 4, color: "#27500A", background: "#EAF3DE", borderRadius: 6, padding: "4px 8px" }}>
                        <span style={{ fontWeight: 600 }}>Resolución:</span> {inc.resolutionNotes}
                      </div>
                    )}
                  </div>
                  {!inc.resolved && connected && (
                    <button
                      onClick={() => { setSelInc(inc); setResolveNotes(""); setModal("resolve"); }}
                      style={{ ...S.iconBtn, fontSize: 11, padding: "4px 10px", flexShrink: 0 }}
                    >
                      Resolver
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modales */}
      {modal === "checkpoint" && (
        <CheckpointModal
          shipment={shipment}
          onClose={() => setModal(null)}
          onSuccess={loadDetail}
          notify={notify}
        />
      )}
      {modal === "incident" && (
        <IncidentModal
          shipment={shipment}
          onClose={() => setModal(null)}
          onSuccess={loadDetail}
          notify={notify}
        />
      )}
      {modal === "resolve" && selInc && (
        <div style={S.overlay} onClick={() => { setModal(null); setSelInc(null); setResolveNotes(""); }}>
          <div style={{ ...S.modalBox, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.cardTitle}>✅ Resolver incidencia</span>
              <button onClick={() => { setModal(null); setSelInc(null); setResolveNotes(""); }} style={S.iconBtn}>✕</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#FAEEDA", borderRadius: 8, padding: "12px 14px", fontSize: 13 }}>
                <div style={{ fontWeight: 500, color: "#633806", marginBottom: 4 }}>{selInc.incidentType}</div>
                <div style={{ color: "#854F0B" }}>{selInc.description}</div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>Acciones tomadas para resolver *</label>
                <textarea
                  rows={3}
                  style={{ ...S.fInput, resize: "vertical" as const }}
                  placeholder="Describe las acciones tomadas para resolver la incidencia..."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                />
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>Esta acción es irreversible on-chain.</div>
              <button onClick={() => handleResolve(selInc)} disabled={!resolveNotes.trim()} style={{ ...S.submitBtn, opacity: resolveNotes.trim() ? 1 : 0.5 }}>
                ✅ Confirmar resolución on-chain
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// Subcomponente: Formulario de creación de envío
// ============================================================
function CreateShipment({
  onSuccess, onCancel, notify,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  notify: (msg: string, ok?: boolean) => void;
}) {
  const S = useS();
  const { publicKey, connected } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const [form, setForm] = useState({ product: "", origin: "", destination: "", recipient: "", coldChain: false, maxTemp: "4.5", maxHumidity: "60" });

  const handleSubmit = async () => {
    if (!anchorWallet || !publicKey) return notify("Conecta tu wallet", false);
    notify("Creando envío — firma con Backpack...");
    try {
      const program = await loadProgram(anchorWallet as anchor.Wallet, connection);
      const [configPda] = getConfigPda();
      const config = await program.account.programConfig.fetch(configPda);
      const shipmentId = config.nextShipmentId as anchor.BN;
      const [shipmentPda] = getShipmentPda(shipmentId.toNumber());
      // Buscar actor Sender activo (la cuenta puede ser efímera con Backpack)
      const allActors = await getAllActors(connection);
      const senderActor = allActors.find(a => a.role === "Sender" && a.isActive && a.address === publicKey.toString())
        ?? allActors.find(a => a.role === "Sender" && a.isActive);
      if (!senderActor) {
        notify("Error: No hay actores Sender activos registrados en el sistema.", false);
        return;
      }
      const actorWalletPk = new PublicKey(senderActor.address);
      const [senderActorPda] = getActorPda(actorWalletPk);

      // Construir transacción manualmente para pasar actor_wallet correctamente
      const disc = Buffer.from([67, 64, 17, 114, 30, 143, 249, 247]);
      const recipientBytes = new PublicKey(form.recipient).toBytes();
      const maxTemp = form.coldChain ? Math.round(parseFloat(form.maxTemp) * 10) : 500;

      function writeU64(n: anchor.BN): Buffer {
        return Buffer.from(n.toArrayLike(Buffer, "le", 8));
      }
      function writeStr(s: string): Buffer {
        const b = Buffer.from(s, "utf8");
        const len = Buffer.alloc(4); len.writeUInt32LE(b.length); return Buffer.concat([len, b]);
      }
      function writeI16(n: number): Buffer {
        const b = Buffer.alloc(2); b.writeInt16LE(n); return b;
      }
      function writeBool(v: boolean): Buffer {
        return Buffer.from([v ? 1 : 0]);
      }

      const data = Buffer.concat([
        disc,
        writeU64(shipmentId),
        Buffer.from(recipientBytes),
        writeStr(form.product),
        writeStr(form.origin),
        writeStr(form.destination),
        writeBool(form.coldChain),
        writeI16(maxTemp),
      ]);

      const ix = new anchor.web3.TransactionInstruction({
        programId: new PublicKey(PROGRAM_ID),
        keys: [
          { pubkey: configPda, isSigner: false, isWritable: true },
          { pubkey: shipmentPda, isSigner: false, isWritable: true },
          { pubkey: senderActorPda, isSigner: false, isWritable: true },
          { pubkey: actorWalletPk, isSigner: false, isWritable: false },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      });

      const tx = new anchor.web3.Transaction().add(ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const signedTx = await (anchorWallet as anchor.Wallet).signTransaction(tx);
      const sig = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(sig, "confirmed");
      notify("Envío creado correctamente");
      setForm({ product: "", origin: "", destination: "", recipient: "", coldChain: false, maxTemp: "4.5" });
      onSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("AccountNotInitialized") || msg.includes("sender_actor")) {
        notify("Error: Tu wallet no está registrada como Sender. Ve a 👥 Actores y registra esta wallet con rol Sender primero.", false);
      } else {
        notify("Error: " + msg, false);
      }
    }
  };

  const isValid = form.product && form.origin && form.destination && form.recipient.length > 30;

  return (
    <div style={{ ...S.card, maxWidth: 580, margin: "0 auto" }}>
      <div style={S.cardHeader}>
        <span style={S.cardTitle}>📦 Crear nuevo envío</span>
        <button onClick={onCancel} style={{ ...S.iconBtn, marginLeft: "auto" }} title="Cancelar">✕</button>
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={S.fLabel}>Producto</label>
          <input style={S.fInput} placeholder="Ej: Vacunas COVID-19 (máx 64 chars)" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
        </div>
        <LocationSearch
          label="Origen"
          value={form.origin}
          onChange={(v) => setForm({ ...form, origin: v })}
          placeholder="Buscar municipio de origen..."
        />
        <LocationSearch
          label="Destino"
          value={form.destination}
          onChange={(v) => setForm({ ...form, destination: v })}
          placeholder="Buscar municipio de destino..."
        />
        <div>
          <label style={S.fLabel}>Wallet del destinatario (Pubkey)</label>
          <input style={S.fInput} placeholder="Base58 de la wallet del destinatario" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={form.coldChain} onChange={(e) => setForm({ ...form, coldChain: e.target.checked })} />
          ❄ Requiere cadena de frío
        </label>

        {form.coldChain && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={S.fLabel}>Temperatura máxima (°C) — Ej: 4.5 para vacunas, -20 para congelados</label>
              <input
                style={S.fInput}
                type="number"
                step="0.1"
                placeholder="Ej: 4.5"
                value={form.maxTemp}
                onChange={(e) => setForm({ ...form, maxTemp: e.target.value })}
              />
            </div>
            <div>
              <label style={S.fLabel}>Humedad máxima (%)</label>
              <input
                style={S.fInput}
                type="number"
                min="0"
                max="100"
                placeholder="Ej: 60"
                value={form.maxHumidity}
                onChange={(e) => setForm({ ...form, maxHumidity: e.target.value })}
              />
            </div>
          </div>
        )}

        <div style={{ background: "#14F19508", border: "0.5px solid #14F19530", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#64748B", lineHeight: 1.6 }}>
          💰 Costo estimado: ~0.000005 SOL ($0.00025)<br/>
          ⚠ Tu wallet debe estar registrada como <strong style={{ color: "#E2E8F0" }}>Sender</strong> en la pestaña 👥 Actores
        </div>

        {!connected && (
          <div style={{ color: "#EF4444", fontSize: 13 }}>Conecta tu wallet para crear envíos</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!connected || !isValid}
          style={{ ...S.submitBtn, opacity: (!connected || !isValid) ? 0.5 : 1 }}
        >
          🚀 Crear envío on-chain
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Componente principal: ShipmentsTab
// Lista + Crear + Detalle en un solo componente
// ============================================================
export function ShipmentsTab({ notify, onShipmentsChange, searchShipmentId, onSearchDone, openCreate, onOpenCreateDone }: ShipmentsTabProps) {
  const S = useS();
  const { connection } = useConnection();
  const [view, setView] = useState<View>("list");
  const [shipments, setShipments] = useState<ShipmentData[]>([]);
  const inferredStatusMap = useRef<Map<number, string>>(new Map());
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const COOLDOWN_MS = 30000; // 30 segundos

  const refreshWithStatus = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefresh < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastRefresh)) / 1000);
      notifyRef.current(`Espera ${remaining}s antes de refrescar de nuevo`, false);
      return;
    }
    setLastRefresh(now);
    setLoading(true);
    try {
      const data = await getAllShipments(connectionRef.current);
      const cpTypeToStatus: Record<string, string> = {
        Pickup:"InTransit", HubIn:"AtHub", HubOut:"InTransit",
        Transit:"InTransit", DeliveryAttempt:"OutForDelivery", Delivered:"Delivered",
      };
      const updated = await Promise.all(data.map(async (s) => {
        try {
          const chks = await getShipmentCheckpoints(connectionRef.current, s.id);
          if (chks.length > 0) {
            const lastType = chks[chks.length - 1].checkpointType;
            const newStatus = cpTypeToStatus[lastType];
            if (newStatus) {
              inferredStatusMap.current.set(s.id, newStatus);
              return { ...s, status: newStatus, checkpointCount: chks.length };
            }
          }
          return inferredStatusMap.current.has(s.id) ? { ...s, status: inferredStatusMap.current.get(s.id)! } : s;
        } catch { return s; }
      }));
      setShipments(updated);
      const inTransitCount = updated.filter(s => ["InTransit","AtHub","OutForDelivery"].includes(s.status)).length;
      const incidentCount = updated.reduce((a, s) => a + s.incidentCount, 0);
      const deliveredCount = updated.filter(s => s.status === "Delivered").length;
      onShipmentsChangeRef.current?.(updated.length, inTransitCount, incidentCount, deliveredCount);
      notifyRef.current("Estados actualizados");
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRefresh]);
  const [selected, setSelected] = useState<ShipmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const connectionRef = useRef(connection);
  useEffect(() => { connectionRef.current = connection; }, [connection]);

  const onShipmentsChangeRef = useRef(onShipmentsChange);
  const notifyRef = useRef(notify);
  useEffect(() => { onShipmentsChangeRef.current = onShipmentsChange; }, [onShipmentsChange]);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  const loadShipments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllShipments(connectionRef.current);
      const cpTypeToStatus: Record<string, string> = {
        Pickup:"InTransit", HubIn:"AtHub", HubOut:"InTransit",
        Transit:"InTransit", DeliveryAttempt:"OutForDelivery", Delivered:"Delivered",
      };
      const withStatus = await Promise.all(data.map(async (s) => {
        // Leer checkpoints para inferir estado y contador real
        try {
          const chks = await getShipmentCheckpoints(connectionRef.current, s.id);
          s = { ...s, checkpointCount: chks.length };
          if (chks.length > 0) {
            const ns = cpTypeToStatus[chks[chks.length - 1].checkpointType];
            if (ns) { inferredStatusMap.current.set(s.id, ns); s = { ...s, status: ns }; }
          } else if (inferredStatusMap.current.has(s.id)) {
            s = { ...s, status: inferredStatusMap.current.get(s.id)! };
          }
        } catch {
          if (inferredStatusMap.current.has(s.id)) s = { ...s, status: inferredStatusMap.current.get(s.id)! };
        }
        // Leer incidencias para contador real y estado abierto/resuelto
        try {
          const incs = await getShipmentIncidents(connectionRef.current, s.id);
          s = { ...s, incidentCount: incs.length, openIncidentCount: incs.filter(i => !i.resolved).length };
        } catch {}
        return s;
      }));
      setShipments(withStatus);
      const inTransitCount = withStatus.filter(s => ["InTransit","AtHub","OutForDelivery"].includes(s.status)).length;
      const incidentCount = withStatus.reduce((a, s) => a + s.incidentCount, 0);
      const deliveredCount = withStatus.filter(s => s.status === "Delivered").length;
      onShipmentsChangeRef.current?.(withStatus.length, inTransitCount, incidentCount, deliveredCount);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []); // Sin dependencias — usa refs estables

  useEffect(() => {
    loadShipments();
  }, []); // Solo al montar

  const handleShipmentUpdated = (id: number, checkpointCount: number, incidentCount: number, status?: string, openIncidentCount?: number) => {
    if (status) inferredStatusMap.current.set(id, status);
    setShipments(prev => {
      const updated = prev.map(s =>
        s.id === id ? { ...s, checkpointCount, incidentCount, ...(status ? { status } : {}), ...(openIncidentCount !== undefined ? { openIncidentCount } : {}) } : s
      );
      const inTransitCount = updated.filter(s => ["InTransit","AtHub","OutForDelivery"].includes(s.status)).length;
      const totalIncidents = updated.reduce((a, s) => a + s.incidentCount, 0);
      const deliveredCount = updated.filter(s => s.status === "Delivered").length;
      onShipmentsChangeRef.current?.(updated.length, inTransitCount, totalIncidents, deliveredCount);
      return updated;
    });
  };

  // Abrir formulario de crear cuando viene de la página de inicio
  useEffect(() => {
    if (openCreate && initialized) { setView("create"); onOpenCreateDone?.(); }
  }, [openCreate, initialized]);

  // Abrir detalle cuando se busca desde la página de inicio
  useEffect(() => {
    if (searchShipmentId && initialized) {
      const found = shipments.find(s => s.id === searchShipmentId);
      if (found) { setSelected(found); setView("detail"); onSearchDone?.(); }
    }
  }, [searchShipmentId, initialized, shipments]);

  const handleSelect = (s: ShipmentData) => {
    setSelected(s);
    setView("detail");
  };

  const handleCreateSuccess = () => {
    loadShipments();
    setView("list");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Sub-navegación */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => setView("list")}
          style={{
            ...S.navBtn,
            ...(view === "list" || view === "detail" ? S.navActive : {}),
            border: "1px solid #1E293B", borderRadius: 8,
            fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", fontSize: 12,
          }}
        >
          📋 Lista de envíos
        </button>
        {(view === "list" || view === "detail") && (
          <button onClick={refreshWithStatus} style={S.iconBtn} title="Actualizar estados (cooldown 30s)">🔄</button>
        )}
        <button
          onClick={() => setView("create")}
          style={{
            ...S.addBtn,
            marginLeft: "auto",
            fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em",
            fontSize: 13, padding: "8px 18px",
            background: "linear-gradient(135deg,#14F195,#9945FF)",
            color: "#000", border: "none", borderRadius: 8,
          }}
        >
          + Nuevo envío
        </button>
      </div>

      {/* Vista: lista */}
      {view === "list" && (
        <div style={S.card}>
          {/* Spinner solo en carga inicial, no en recargas para evitar parpadeo */}
          {loading && !initialized ? (
            <div style={S.empty}>Cargando desde Solana...</div>
          ) : shipments.length === 0 ? (
            <div style={S.empty}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div>No hay envíos registrados</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                Usa el botón <strong>&quot;+ Nuevo envío&quot;</strong> para crear el primero
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "70vh" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {["ID","Producto","Origen → Destino","Remitente / Destinatario","Checkpoint","Incidencia","Estado","Ver"].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id} style={S.tr} onClick={() => handleSelect(s)}>
                    <td style={S.td}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: S.logoTitle.color as string, fontFamily: "monospace" }}>
                        #{String(s.id).padStart(4,"0")}
                      </span>
                      {s.requiresColdChain && (
                        <div style={{ marginTop: 3 }}>
                          <span style={{ ...S.badge, background: "#E1F5EE", color: "#085041", fontSize: 10 }}>❄ {formatTemperature(s.maxTemperature)}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ ...S.td, fontWeight: 500 }}>{s.product}</td>
                    <td style={S.td}>
                      <div style={{ fontSize: 12 }}>{s.origin.split(",")[0]}</div>
                      <div style={{ fontSize: 11, color: "#64748B" }}>→ {s.destination.split(",")[0]}</div>
                    </td>
                    <td style={S.td}>
                      <div><code style={S.code}>{s.sender.slice(0,6)}...{s.sender.slice(-4)}</code></div>
                      <div><code style={{ ...S.code, color: "#94A3B8" }}>{s.recipient.slice(0,6)}...{s.recipient.slice(-4)}</code></div>
                    </td>
                    <td style={{ ...S.td, textAlign: "center" }}>{s.checkpointCount}</td>
                    <td style={{ ...S.td, textAlign: "center" }}>
                      {s.incidentCount > 0
                        ? <span style={{ ...S.badge, background: s.openIncidentCount > 0 ? "#FCEBEB" : "#EAF3DE", color: s.openIncidentCount > 0 ? "#791F1F" : "#27500A" }}>{s.openIncidentCount > 0 ? "⚠" : "✓"} {s.incidentCount}</span>
                        : <span style={{ color: "#64748B" }}>0</span>
                      }
                    </td>
                    <td style={S.td}>
                      <span style={{ ...S.badge, background: getStatusColor(s.status)+"22", color: getStatusColor(s.status) }}>
                        {getStatusLabel(s.status)}
                      </span>
                      <div style={{ fontSize: 10, color: S.code.color as string, marginTop: 3 }}>
                        {s.dateDelivered
                          ? dayjs(s.dateDelivered).format("DD MMM YYYY HH:mm")
                          : dayjs(s.dateCreated).format("DD MMM YYYY HH:mm")}
                      </div>
                    </td>
                    <td style={S.td} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleSelect(s)} style={S.iconBtn}>👁</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {/* Vista: detalle */}
      {view === "detail" && selected && (
        <ShipmentDetail
          shipment={selected}
          onBack={() => { setView("list"); setSelected(null); }}
          notify={notify}
          onShipmentUpdated={handleShipmentUpdated}
        />
      )}

      {/* Vista: crear */}
      {view === "create" && (
        <CreateShipment onSuccess={handleCreateSuccess} onCancel={() => setView("list")} notify={notify} />
      )}
    </div>
  );
}
