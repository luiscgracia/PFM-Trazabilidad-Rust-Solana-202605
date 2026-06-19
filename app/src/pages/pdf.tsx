// app/src/pages/pdf.tsx
// Página para exportar PDF de cualquier envío dado su ID.

import { useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  getAllShipments, getShipmentCheckpoints, getShipmentIncidents,
  getConfigPda, type ShipmentData, type CheckpointData, type IncidentData
} from "../lib/logistics";

const CONNECTION = new Connection("http://localhost:8899", "confirmed");

const STATUS_LABELS: Record<string, string> = {
  Created: "Creado", InTransit: "En tránsito", AtHub: "En hub",
  OutForDelivery: "En reparto", Delivered: "Entregado",
  Returned: "Devuelto", Cancelled: "Cancelado",
};

const CP_LABELS: Record<string, string> = {
  Pickup: "Recogida", HubIn: "Entrada hub", HubOut: "Salida hub",
  Transit: "En tránsito", DeliveryAttempt: "Intento entrega",
  Delivered: "Entregado", SensorData: "Sensor",
};

const INC_LABELS: Record<string, string> = {
  Delay: "Retraso", Damage: "Daño", Lost: "Pérdida",
  TempViolation: "Temperatura fuera de rango", Unauthorized: "Acceso no autorizado",
};

const CP_TYPE_STATUS: Record<string, string> = {
  Pickup: "InTransit", HubIn: "AtHub", HubOut: "InTransit",
  Transit: "InTransit", DeliveryAttempt: "OutForDelivery", Delivered: "Delivered",
};

function fmt(ts: number) {
  return new Date(ts * 1000).toLocaleString("es-CO");
}

function generarPDF(
  shipment: ShipmentData,
  checkpoints: CheckpointData[],
  incidents: IncidentData[],
  status: string
) {
  const cpRows = checkpoints.map(c => `
    <tr>
      <td>${CP_LABELS[c.checkpointType] ?? c.checkpointType}</td>
      <td>${c.location}</td>
      <td>${fmt(c.timestamp)}</td>
      <td>${c.metadata && c.metadata !== "{}" ? c.metadata : "-"}</td>
    </tr>`).join("") || '<tr><td colspan="4" style="text-align:center;color:#888">Sin checkpoints registrados</td></tr>';

  const incRows = incidents.map(i => `
    <tr>
      <td>${INC_LABELS[i.incidentType] ?? i.incidentType}</td>
      <td>${i.description}</td>
      <td>${i.resolved ? "✅ Resuelta" : "⚠ Abierta"}</td>
      <td>${i.resolved && i.resolutionNotes ? i.resolutionNotes : "-"}</td>
    </tr>`).join("") || '<tr><td colspan="4" style="text-align:center;color:#888">Sin incidencias registradas</td></tr>';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Envío #${String(shipment.id).padStart(4,"0")} — LogiChain</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: letter; margin: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: white; padding: 1cm; max-width: 1250px; margin: 0 auto; }
  .header { border-bottom: 2px solid #185FA5; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
  .header h1 { font-size: 18px; color: #185FA5; }
  .header .meta { text-align: right; font-size: 10px; color: #555; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-weight: bold; font-size: 11px; background: #E8F5E9; color: #2E7D32; margin-left: 8px; }
  .section { margin-bottom: 16px; }
  .section-title { font-size: 12px; font-weight: bold; color: #185FA5; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
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
    <div style="margin-top:4px">${shipment.product} <span class="status-badge">${STATUS_LABELS[status] ?? status}</span></div>
  </div>
  <div class="meta">Generado: ${new Date().toLocaleString("es-CO")}<br>Blockchain: Solana Localnet</div>
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
  <table><thead><tr><th>Tipo</th><th>Ubicación</th><th>Fecha/Hora</th><th>Metadata</th></tr></thead>
  <tbody>${cpRows}</tbody></table>
</div>
<div class="section">
  <div class="section-title">Incidencias</div>
  <table><thead><tr><th>Tipo</th><th>Descripción</th><th>Estado</th><th>Resolución</th></tr></thead>
  <tbody>${incRows}</tbody></table>
</div>
<div class="footer">Documento generado automáticamente por LogiChain — Sistema de Trazabilidad Logística en Blockchain Solana</div>
</body></html>`;

  const win = window.open("", "_blank", "width=1200,height=900");
  if (!win) { alert("Permite ventanas emergentes para generar el PDF."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

export default function PdfPage() {
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerar = async () => {
    const num = parseInt(id.trim());
    if (!num || num < 1) { setError("Ingresa un ID de envío válido."); return; }
    setError("");
    setLoading(true);
    try {
      const shipments = await getAllShipments(CONNECTION);
      const shipment = shipments.find(s => s.id === num);
      if (!shipment) { setError(`Envío #${String(num).padStart(4,"0")} no encontrado en la cadena.`); setLoading(false); return; }

      const [checkpoints, incidents] = await Promise.all([
        getShipmentCheckpoints(CONNECTION, num),
        getShipmentIncidents(CONNECTION, num),
      ]);

      let status = shipment.status;
      if (checkpoints.length > 0) {
        const lastType = checkpoints[checkpoints.length - 1].checkpointType;
        status = CP_TYPE_STATUS[lastType] ?? status;
      }

      generarPDF(shipment, checkpoints, incidents, status);
    } catch (e) {
      setError("Error al leer la blockchain: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#E2E8F0", fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "url('/fondo_TFM2_solana.png')", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.2, zIndex: 0, pointerEvents: "none" }} />
      <div style={{ background: "rgba(10,22,40,0.85)", border: "1px solid #1E293B", borderRadius: 16, padding: 40, width: 480, maxWidth: "95vw", boxShadow: "0 8px 32px #00000040" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/icono_TFM2_solana.png" alt="LogiChain" style={{ width: 56, height: 56, objectFit: "contain", marginBottom: 12 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Exportar PDF de envío</h1>
          <p style={{ fontSize: 13, opacity: 0.6, marginTop: 8 }}>Ingresa el ID del envío para generar el documento de trazabilidad.</p>
        </div>

        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>ID del envío</label>
          <input
            type="number"
            min={1}
            placeholder="Ej: 1, 5, 10..."
            value={id}
            onChange={e => setId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleGenerar()}
            style={{ width: "200px", background: "#0F172A", border: "1px solid #1E293B", borderRadius: 8, padding: "12px 14px", color: "#E2E8F0", fontSize: 16, outline: "none" }}
          />
        </div>

        {error && (
          <div style={{ background: "#FCEBEB", color: "#791F1F", border: "0.5px solid #F09595", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleGenerar}
          disabled={loading || !id}
          style={{ width: "100%", background: "#185FA5", color: "white", border: "none", borderRadius: 10, padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: loading || !id ? "not-allowed" : "pointer", opacity: loading || !id ? 0.6 : 1 }}
        >
          {loading ? "⏳ Cargando datos..." : "📄 Generar PDF"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, opacity: 0.4 }}>
          LogiChain · Trazabilidad Logística en Solana
        </div>
      </div>
    </div>
  );
}
