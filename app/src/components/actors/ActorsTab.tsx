import { useState, useCallback } from "react";
import { useWallet, useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAllActors, ROLE_COLORS, type ActorData } from "../../lib/actors";
import { loadProgram, ROLE_OPTIONS, ROLE_ANCHOR_OBJS, type TxStatus } from "../../lib/program";
import { getConfigPda, getActorPda } from "../../lib/logistics";
import { useS } from "../styles";
import { LocationSearch } from "../LocationSearch";

// ============================================================
// Props
// ============================================================
interface ActorsTabProps {
  isAdmin: boolean;
  notify: (msg: string, ok?: boolean) => void;
}

// ============================================================
// Subcomponente: badge de rol
// ============================================================
function RoleBadge({ role, isActive }: { role: string; isActive: boolean }) {
  const c = ROLE_COLORS[role] || { bg: "#F1EFE8", text: "#444441" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 99,
        background: c.bg,
        color: c.text,
        opacity: isActive ? 1 : 0.5,
      }}
    >
      {role}
    </span>
  );
}

// ============================================================
// Subcomponente: modal de registro de actor
// ============================================================
function RegisterActorModal({
  onClose,
  onSuccess,
  notify,
}: {
  onClose: () => void;
  onSuccess: () => void;
  notify: (msg: string, ok?: boolean) => void;
}) {
  const S = useS();
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const [form, setForm] = useState({ wallet: "", name: "", role: "0", location: "" });

  const handleSubmit = async () => {
    if (!anchorWallet || !publicKey) return notify("Conecta tu wallet", false);
    notify("Verificando registro...");
    try {
      const actorWallet = new PublicKey(form.wallet);
      const [actorPda] = getActorPda(actorWallet);
      // Verificar si ya existe antes de intentar registrar
      const existing = await connection.getAccountInfo(actorPda);
      if (existing) {
        // El byte del rol está en offset 8(disc)+32(address)+4+name_len+... 
        // Es más simple mostrar mensaje genérico claro
        const roles = ["Sender", "Carrier", "Hub", "Recipient", "Inspector"];
        // Layout: [8 disc][32 address][4+name][1 role][...]
        // No intentamos parsear — simplemente avisamos
        notify("⚠ Esta wallet ya está registrada como actor en el sistema. Cada wallet solo puede tener un rol asignado.", false);
        return;
      }
      notify("Registrando actor — firma con Backpack...");
      const [configPda] = getConfigPda();
      const program = await loadProgram(anchorWallet as anchor.Wallet, connection);
      await program.methods.registerActor(
        actorWallet,
        form.name,
        ROLE_ANCHOR_OBJS[parseInt(form.role)],
        form.location
      ).accounts({
        config: configPda,
        actor: actorPda,
        authority: publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).rpc();
      console.log("TX OK");
      notify("Actor registrado correctamente");
      onSuccess();
      onClose();
    } catch (e: unknown) {
      console.error("ERROR ACTOR:", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already in use") || msg.includes("already been allocated") || msg.includes("custom program error: 0x0")) {
        notify("Error: Esta dirección ya está registrada como actor en el sistema.", false);
      } else {
        notify("Error: " + msg, false);
      }
    }
  };

  const isValid = form.wallet.length > 30 && form.name.length > 0 && form.location.length > 0;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span style={S.cardTitle}>👥 Registrar nuevo actor</span>
          <button onClick={onClose} style={S.iconBtn}>✕</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 12, color: "#0C447C", background: "#E6F1FB", border: "0.5px solid #B5D4F4", borderRadius: 8, padding: "10px 14px" }}>
            Solo el administrador puede registrar actores. La wallet a registrar no necesita firmar.
          </div>
          <div>
            <label style={S.fLabel}>Wallet del actor (Pubkey base58)</label>
            <input style={S.fInput} placeholder="Ej: 6irouK8iDnxD..." value={form.wallet} onChange={(e) => setForm({ ...form, wallet: e.target.value })} />
          </div>
          <div>
            <label style={S.fLabel}>Nombre o empresa</label>
            <input style={S.fInput} placeholder="Ej: FarmaTech S.A." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label style={S.fLabel}>Rol</label>
            <select style={S.fInput} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <LocationSearch
              label="Ubicación"
              value={form.location}
              onChange={(v) => setForm({ ...form, location: v })}
              placeholder="Buscar municipio, ej: Bogotá, Medellín..."
            />
          </div>
          <button onClick={handleSubmit} disabled={!isValid} style={{ ...S.submitBtn, opacity: isValid ? 1 : 0.5 }}>
            ✅ Registrar actor on-chain
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Componente principal: ActorsTab
// ============================================================
export function ActorsTab({ isAdmin, notify }: ActorsTabProps) {
  const S = useS();
  const { connected } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [actors, setActors] = useState<ActorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const loadActors = useCallback(async () => {
    setLoading(true);
    try {
      setActors(await getAllActors(connection));
    } finally {
      setLoading(false);
    }
  }, [connection]);

  // Cargar actores al montar
  useState(() => { loadActors(); });

  const handleToggle = async (actor: ActorData) => {
    if (!anchorWallet || !publicKey) return notify("Conecta tu wallet", false);
    notify((actor.isActive ? "Desactivando" : "Reactivando") + " actor...");
    try {
      const actorWallet = new PublicKey(actor.address);
      const [configPda] = getConfigPda();
      const [actorPda] = getActorPda(actorWallet);
      const program = await loadProgram(anchorWallet as anchor.Wallet, connection);
      await program.methods.updateActorStatus(actorWallet, !actor.isActive)
        .accounts({ config: configPda, actor: actorPda, authority: publicKey })
        .rpc();
      notify("Estado actualizado");
      await loadActors();
    } catch (e: unknown) {
      notify("Error: " + (e instanceof Error ? e.message : String(e)), false);
    }
  };

  return (
    <>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>👥 Actores registrados</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {/* Filtros */}
            {(["all","active","inactive"] as const).map((f) => {
              const labels = { all: "Todos", active: "✓ Activos", inactive: "✕ Inactivos" };
              const count = f === "all" ? actors.length : actors.filter(a => f === "active" ? a.isActive : !a.isActive).length;
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 99, cursor: "pointer", fontWeight: active ? 700 : 400,
                    border: `1px solid ${active ? (f === "inactive" ? "#EF444460" : "#14F19560") : (S.iconBtn.border as string)}`,
                    background: active ? (f === "inactive" ? "#FCEBEB" : "#14F19515") : "transparent",
                    color: active ? (f === "inactive" ? "#791F1F" : "#14F195") : (S.iconBtn.color as string),
                  }}
                >
                  {labels[f]} ({count})
                </button>
              );
            })}
            <button onClick={loadActors} style={S.iconBtn} title="Recargar">🔄</button>
            {isAdmin && (
              <button onClick={() => setShowModal(true)} style={S.addBtn}>
                + Registrar actor
              </button>
            )}
          </div>
        </div>

        {!connected && (
          <div style={{ padding: "10px 16px", fontSize: 12, color: "#64748B", borderBottom: "0.5px solid #1E293B" }}>
            Conecta tu wallet para ver si tienes permisos de administrador.
          </div>
        )}

        {loading ? (
          <div style={S.empty}>Cargando actores desde Solana...</div>
        ) : actors.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
            <div>No hay actores registrados</div>
            {isAdmin && (
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                Usa el botón "+ Registrar actor" para añadir el primero
              </div>
            )}
          </div>
        ) : actors.filter(a => filter === "all" ? true : filter === "active" ? a.isActive : !a.isActive).length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{filter === "active" ? "✓" : "✕"}</div>
            <div>No hay actores {filter === "active" ? "activos" : "inactivos"}</div>
          </div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {["Nombre", "Rol", "Dirección", "Ubicación", "Estado"].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {actors
                .filter(a => filter === "all" ? true : filter === "active" ? a.isActive : !a.isActive)
                .map((a) => (
                <tr key={a.publicKey} style={{ ...S.tr, opacity: a.isActive ? 1 : 0.55 }}>
                  <td style={{ ...S.td, fontWeight: 500 }}>{a.name}</td>
                  <td style={S.td}><RoleBadge role={a.role} isActive={a.isActive} /></td>
                  <td style={S.td}>
                    <code style={S.code}>{a.address.slice(0, 8)}...{a.address.slice(-4)}</code>
                  </td>
                  <td style={S.td}>{a.location}</td>
                  <td style={S.td}>
                    {isAdmin && (
                      <button
                        onClick={() => handleToggle(a)}
                        title={a.isActive ? "Haz clic para desactivar este actor" : "Haz clic para activar este actor"}
                        style={{
                          ...S.iconBtn, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" as const,
                          color: a.isActive ? "#EF4444" : "#14F195",
                          borderColor: a.isActive ? "#EF444440" : "#14F19540",
                          background: a.isActive ? "#EF444410" : "#14F19510",
                        }}
                      >
                        {a.isActive ? "⏸ Desactivar" : "▶ Activar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <RegisterActorModal
          onClose={() => setShowModal(false)}
          onSuccess={loadActors}
          notify={notify}
        />
      )}
    </>
  );
}
