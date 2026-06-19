import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAllActors } from "../lib/actors";
import { getAllShipments, getConfigPda } from "../lib/logistics";
import { loadProgram, type TxStatus } from "../lib/program";
import { ActorsTab } from "../components/actors/ActorsTab";
import { ShipmentsTab } from "../components/shipments/ShipmentsTab";
import { DARK, LIGHT, ThemeProvider } from "../components/styles";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false, loading: () => <button>Conectar wallet</button> }
);

type Tab = "home" | "actors" | "shipments";

export default function App() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();

  const [tab, setTab] = useState<Tab>("home");
  const [buscarId, setBuscarId] = useState("");
  const [searchShipmentId, setSearchShipmentId] = useState<number | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [buscarError, setBuscarError] = useState("");
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({ newAuthority: "", confirm: "" });
  const [stats, setStats] = useState({ actors: 0, shipments: 0, inTransit: 0, incidents: 0, delivered: 0 });
  const [dark, setDark] = useState(true);
  const S = dark ? DARK : LIGHT;

  const notify = (msg: string, ok = true) => setTxStatus({ msg, ok });

  // Auto-cerrar notificaciones después de 10 segundos
  useEffect(() => {
    if (!txStatus) return;
    const timer = setTimeout(() => setTxStatus(null), 10000);
    return () => clearTimeout(timer);
  }, [txStatus]);

  // Verificar si la wallet es admin y cargar stats globales
  const checkAdmin = useCallback(async () => {
    if (!publicKey) { setIsAdmin(false); return; }
    try {
      const [configPda] = getConfigPda();
      const info = await connection.getAccountInfo(configPda);
      if (!info) { setIsAdmin(false); return; }
      const authority = new PublicKey(info.data.slice(8, 40));
      setIsAdmin(authority.equals(publicKey));
    } catch { setIsAdmin(false); }
  }, [publicKey, connection]);

  const loadStats = useCallback(async () => {
    const [actors, shipments] = await Promise.all([
      getAllActors(connection),
      getAllShipments(connection),
    ]);
    const cpTypeToStatus: Record<string, string> = {
      Pickup:"InTransit", HubIn:"AtHub", HubOut:"InTransit",
      Transit:"InTransit", DeliveryAttempt:"OutForDelivery", Delivered:"Delivered",
    };
    const withStatus = await Promise.all(shipments.map(async (s) => {
      try {
        const chks = await getShipmentCheckpoints(connection, s.id);
        if (chks.length > 0) {
          const newStatus = cpTypeToStatus[chks[chks.length - 1].checkpointType];
          if (newStatus) return { ...s, status: newStatus };
        }
      } catch {}
      return s;
    }));
    setStats({
      actors: actors.length,
      shipments: withStatus.length,
      inTransit: withStatus.filter(s => ["InTransit","AtHub","OutForDelivery"].includes(s.status)).length,
      incidents: withStatus.reduce((a, s) => a + s.incidentCount, 0),
      delivered: withStatus.filter(s => s.status === "Delivered").length,
    });
  }, [connection]);

  useEffect(() => { checkAdmin(); }, [checkAdmin]);

  // Detectar cambio de cuenta en Phantom mediante polling
  // Detección de cambio de cuenta deshabilitada (causaba reload loop con Backpack)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadStats(); }, []); // Solo al montar

  const handleTransferAuthority = async () => {
    if (!anchorWallet || !publicKey) return notify("Conecta tu wallet", false);
    if (transferForm.newAuthority !== transferForm.confirm) return notify("Las direcciones no coinciden", false);
    notify("Transfiriendo autoridad — firma con Backpack...");
    try {
      const program = await loadProgram(anchorWallet as anchor.Wallet, connection);
      const [configPda] = getConfigPda();
      await program.methods.transferAuthority(new PublicKey(transferForm.newAuthority))
        .accounts({ config: configPda, currentAuthority: publicKey })
        .rpc();
      notify("Autoridad transferida. Conecta la nueva wallet.");
      setShowTransfer(false);
      setTransferForm({ newAuthority: "", confirm: "" });
      setIsAdmin(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (e: unknown) {
      notify("Error: " + (e instanceof Error ? e.message : String(e)), false);
    }
  };

  return (
    <>
    <div style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}><img src="/fondo_TFM2_solana.png" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.2 }} /></div>
    <ThemeProvider dark={dark}>
    <div style={S.app}>
      {/* HEADER */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}>
            <img src="/icono_TFM2_solana.png" alt="LogiChain" style={{ width: 36, height: 36, objectFit: "contain" }} />
            <div>
              <div style={S.logoTitle}>LogiChain</div>
              <div style={S.logoSub}>Trazabilidad Logística · Solana</div>
            </div>
          </div>
          <nav style={S.nav}>
            {([["home","🏠 Inicio"],["actors","👥 Actores"],["shipments","📦 Envíos"]] as [Tab,string][]).map(([t, l]) => (
              <button key={t} onClick={() => { setTab(t); if (t === "home") setBuscarId(""); }} style={{ ...S.navBtn, ...(tab === t ? S.navActive : {}) }}>{l}</button>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isAdmin && (
              <>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#633806", letterSpacing: 1, background: "#FAEEDA", padding: "2px 8px", borderRadius: 6 }}>ADMIN</span>
                <button
                  onClick={() => setShowTransfer(true)}
                  style={{ fontSize: 11, background: "transparent", border: "1px solid #EF444440", color: "#EF4444", padding: "3px 10px", borderRadius: 99, cursor: "pointer" }}
                >
                  🔁 Transferir
                </button>
              </>
            )}
            <button
              onClick={() => setDark(!dark)}
              title={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              style={{ background: "transparent", border: `1px solid ${dark ? "#1E293B" : "#E2E8F0"}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16, color: dark ? "#E2E8F0" : "#0F172A" }}
            >
              {dark ? "☀️" : "🌙"}
            </button>
            <WalletMultiButton style={S.walletBtn} />
          </div>
        </div>
      </header>

      <main style={{ ...S.main, ...(tab === "home" ? { padding: 0, gap: 0 } : {}) }}>
        {/* BANNER */}
        {txStatus && (
          <div style={{ ...S.banner, background: txStatus.ok ? "#EAF3DE" : "#FCEBEB", color: txStatus.ok ? "#27500A" : "#791F1F", border: `0.5px solid ${txStatus.ok ? "#97C459" : "#F09595"}` }}>
            {txStatus.msg}
            <button onClick={() => setTxStatus(null)} style={S.bannerClose}>✕</button>
          </div>
        )}

        {/* STATS GLOBALES - oculto en Home */}
        <div style={{ ...S.statsGrid, display: tab === "home" ? "none" : "grid" }}>
          {[
            { label: "Actores", value: stats.actors, color: "#185FA5" },
            { label: "Envíos totales", value: stats.shipments, color: "#633806" },
            { label: "En tránsito", value: stats.inTransit, color: "#BA7517" },
            { label: "Incidencias", value: stats.incidents, color: "#A32D2D" },
            { label: "Entregados", value: stats.delivered, color: "#14B87A" },
          ].map((s) => (
            <div key={s.label} style={S.statCard}>
              <div style={S.statLabel}>{s.label}</div>
              <div style={{ ...S.statValue, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* PESTAÑAS */}
        {tab === "home" && (
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "8px 24px", display: "flex", flexDirection: "column", gap: 4, height: "calc(100vh - 64px)", maxHeight: "calc(100vh - 64px)", justifyContent: "space-between", overflowY: "hidden", boxSizing: "border-box" as const }}>
            <div style={{ textAlign: "center", paddingBottom: 0 }}>
              <img src="/icono_TFM2_solana.png" alt="LogiChain" style={{ width: 56, height: 56, objectFit: "contain", marginBottom: 8 }} />
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>LogiChain</h1>
              <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Sistema de Trazabilidad Logística en Blockchain Solana</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div onClick={() => setTab("actors")} style={{ cursor: "pointer", background: dark ? "rgba(10,22,40,0.85)" : "rgba(255,255,255,0.85)", border: dark ? "1px solid #1E293B" : "1px solid #E2E8F0", borderRadius: 16, padding: 20, textAlign: "center", transition: "transform 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>ACTORES</div>
                <div style={{ fontSize: 13, opacity: 0.65 }}>Gestión de actores registrados en la cadena: Senders, Carriers, Hubs, Recipients e Inspectors.</div>
              </div>
              <div onClick={() => setTab("shipments")} style={{ cursor: "pointer", background: dark ? "rgba(10,22,40,0.85)" : "rgba(255,255,255,0.85)", border: dark ? "1px solid #1E293B" : "1px solid #E2E8F0", borderRadius: 16, padding: 20, textAlign: "center", transition: "transform 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>OPERACIONES</div>
                <div style={{ fontSize: 13, opacity: 0.65 }}>Trazabilidad completa de envíos: checkpoints, incidencias, cadena de frío y exportación PDF.</div>
              </div>
              <div onClick={() => { setOpenCreate(true); setTab("shipments"); }} style={{ cursor: "pointer", background: dark ? "rgba(10,22,40,0.85)" : "rgba(255,255,255,0.85)", border: dark ? "1px solid #1E293B" : "1px solid #E2E8F0", borderRadius: 16, padding: 20, textAlign: "center", transition: "transform 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🚀</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>CREAR ENVÍO</div>
                <div style={{ fontSize: 13, opacity: 0.65 }}>Registra un nuevo envío en la blockchain con toda la información del remitente y destinatario.</div>
              </div>
              <div style={{ background: dark ? "rgba(10,22,40,0.85)" : "rgba(255,255,255,0.85)", border: dark ? "1px solid #1E293B" : "1px solid #E2E8F0", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ fontSize: 48 }}>🔍</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>BUSCAR ENVÍO</div>
                <input
                  type="number" min={1} placeholder="ID del envío"
                  value={buscarId}
                  onChange={e => { setBuscarId(e.target.value); setBuscarError(""); }}
                  onKeyDown={e => { if (e.key === "Enter" && buscarId) setBuscarId(buscarId); }}
                  style={{ background: dark ? "#0F172A" : "#F1F5F9", border: dark ? "1px solid #1E293B" : "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", color: dark ? "#E2E8F0" : "#0F172A", fontSize: 14, outline: "none", width: "100%", textAlign: "center" }}
                />
                <button
                  onClick={async () => {
                    if (!buscarId) return;
                    const { getAllShipments: gs } = await import("../lib/logistics");
                    const { Connection } = await import("@solana/web3.js");
                    const conn = new Connection("http://localhost:8899", "confirmed");
                    const ships = await gs(conn);
                    const found = ships.find(s => s.id === parseInt(buscarId));
                    if (!found) { setBuscarError(`Envío #${buscarId.padStart(4,"0")} no existe.`); return; }
                    setBuscarError("");
                    setSearchShipmentId(parseInt(buscarId));
                    setTab("shipments");
                  }}
                  disabled={!buscarId}
                  style={{ background: "#185FA5", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: buscarId ? "pointer" : "not-allowed", opacity: buscarId ? 1 : 0.5, width: "100%" }}
                >Ver detalle</button>
                {buscarError && <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>{buscarError}</div>}
              </div>
              <div onClick={() => window.open("/pdf", "_blank")} style={{ cursor: "pointer", background: dark ? "rgba(10,22,40,0.85)" : "rgba(255,255,255,0.85)", border: dark ? "1px solid #1E293B" : "1px solid #E2E8F0", borderRadius: 16, padding: 20, textAlign: "center", transition: "transform 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>TRAZABILIDAD</div>
                <div style={{ fontSize: 13, opacity: 0.65 }}>Genera el documento de trazabilidad de un envío para enviar al cliente.</div>
              </div>

            </div>
            <div style={{ background: dark ? "rgba(10,22,40,0.85)" : "rgba(255,255,255,0.85)", border: dark ? "1px solid #1E293B" : "1px solid #E2E8F0", borderRadius: 16, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, opacity: 0.8 }}>📊 Estado del sistema</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                {[
                  { label: "Actores", value: stats.actors, color: "#185FA5" },
                  { label: "Envíos", value: stats.shipments, color: "#633806" },
                  { label: "En tránsito", value: stats.inTransit, color: "#BA7517" },
                  { label: "Incidencias", value: stats.incidents, color: "#A32D2D" },
                  { label: "Entregados", value: stats.delivered, color: "#14B87A" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center", background: s.color + "15", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "center", fontSize: 12, opacity: 0.4 }}>
              Trabajo de Fin de Máster · Blockchain Solana · Rust/Anchor · Next.js
            </div>
          </div>
        )}
        {tab === "actors" && <ActorsTab isAdmin={isAdmin} notify={notify} />}
        <div style={{ display: tab === "shipments" ? "block" : "none" }}>
          <ShipmentsTab
            notify={notify}
            searchShipmentId={searchShipmentId}
            onSearchDone={() => setSearchShipmentId(null)}
            openCreate={openCreate}
            onOpenCreateDone={() => setOpenCreate(false)}
            onShipmentsChange={(count, inTransit, incidents, delivered) => setStats((prev) => ({ ...prev, shipments: count, inTransit: inTransit ?? prev.inTransit, incidents: incidents ?? prev.incidents, delivered: delivered ?? prev.delivered }))}
          />
        </div>
      </main>

      {/* MODAL TRANSFERIR AUTORIDAD */}
      {showTransfer && (
        <div style={S.overlay} onClick={() => { setShowTransfer(false); setTransferForm({ newAuthority: "", confirm: "" }); }}>
          <div style={{ ...S.modalBox, maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.cardTitle}>🔁 Transferir autoridad del programa</span>
              <button onClick={() => setShowTransfer(false)} style={S.iconBtn}>✕</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 12, color: "#EF4444", background: "#FCEBEB10", border: "0.5px solid #EF444430", borderRadius: 8, padding: "10px 14px", lineHeight: 1.6 }}>
                ⚠ Acción <strong>irreversible</strong>. La nueva wallet será la única que pueda administrar el contrato.
              </div>
              <div>
                <label style={S.fLabel}>Nueva wallet administradora (Pubkey)</label>
                <input style={S.fInput} placeholder="Base58 de la nueva wallet admin" value={transferForm.newAuthority} onChange={(e) => setTransferForm({ ...transferForm, newAuthority: e.target.value })} />
              </div>
              <div>
                <label style={S.fLabel}>Confirma la dirección</label>
                <input
                  style={{ ...S.fInput, borderColor: transferForm.confirm && transferForm.confirm !== transferForm.newAuthority ? "#EF4444" : "#1E293B" }}
                  placeholder="Repite la Pubkey para confirmar"
                  value={transferForm.confirm}
                  onChange={(e) => setTransferForm({ ...transferForm, confirm: e.target.value })}
                />
                {transferForm.confirm && transferForm.confirm !== transferForm.newAuthority && (
                  <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>Las direcciones no coinciden</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleTransferAuthority}
                  disabled={!transferForm.newAuthority || transferForm.newAuthority !== transferForm.confirm}
                  style={{ ...S.submitBtn, background: "#EF4444", flex: 1, opacity: (!transferForm.newAuthority || transferForm.newAuthority !== transferForm.confirm) ? 0.4 : 1 }}
                >
                  🔁 Confirmar transferencia
                </button>
                <button onClick={() => { setShowTransfer(false); setTransferForm({ newAuthority: "", confirm: "" }); }} style={{ ...S.iconBtn, padding: "10px 16px" }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </ThemeProvider>
    </>
  );
}
