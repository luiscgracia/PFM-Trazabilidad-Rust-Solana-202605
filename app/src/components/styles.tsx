import React, { createContext, useContext, useState } from "react";

// ============================================================
// TEMAS: oscuro (default) y claro
// ============================================================
export const DARK: Record<string, React.CSSProperties> = {
  app: { minHeight: "100vh", background: "transparent", color: "#E2E8F0", fontFamily: "system-ui,sans-serif" },
  header: { background: "#0A1628", borderBottom: "1px solid #1E293B", position: "sticky", top: 0, zIndex: 100 },
  headerInner: { maxWidth: 1400, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", gap: 24 },
  logo: { display: "flex", alignItems: "center", gap: 10, marginRight: "auto" },
  logoTitle: { fontWeight: 700, fontSize: 18, color: "#14F195" },
  logoSub: { fontSize: 11, color: "#64748B" },
  nav: { display: "flex", gap: 4 },
  navBtn: { padding: "6px 14px", borderRadius: 6, border: "none", background: "transparent", color: "#64748B", cursor: "pointer", fontSize: 13 },
  navActive: { background: "#14F19520", color: "#14F195" },
  walletBtn: { background: "linear-gradient(135deg,#14F195,#9945FF)", border: "none", borderRadius: 8, padding: "4px 14px", fontSize: 12, fontWeight: 700 },
  main: { maxWidth: 1400, margin: "0 auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 },
  banner: { padding: "10px 16px", borderRadius: 8, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" },
  bannerClose: { background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontSize: 14 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 },
  statCard: { background: "#0A1628", borderRadius: 10, padding: 10, textAlign: "center" },
  statLabel: { fontSize: 12, color: "#64748B", marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: 700 },
  card: { background: "#0A1628", border: "1px solid #1E293B", borderRadius: 12, overflow: "hidden" },
  cardHeader: { padding: "12px 16px", borderBottom: "1px solid #1E293B", display: "flex", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#94A3B8" },
  iconBtn: { background: "transparent", border: "1px solid #1E293B", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#E2E8F0", fontSize: 13 },
  addBtn: { background: "#14F19520", border: "1px solid #14F19540", color: "#14F195", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  empty: { padding: 32, textAlign: "center", color: "#475569", fontSize: 13 },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { padding: "10px 12px", fontSize: 12, color: "#14F195", textAlign: "left" as const, borderBottom: "1px solid #1E293B", background: "#0F172A", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", position: "sticky" as const, top: 0, zIndex: 10 },
  tr: { cursor: "pointer", borderBottom: "1px solid #1E293B" },
  td: { padding: "10px 12px", fontSize: 13 },
  code: { fontFamily: "monospace", fontSize: 11, color: "#64748B" },
  badge: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99 },
  sensorPill: { fontSize: 11, padding: "2px 8px", borderRadius: 99, border: "1px solid #1E293B", color: "#94A3B8" },
  fLabel: { fontSize: 12, color: "#94A3B8", display: "block", marginBottom: 4 },
  fInput: { width: "100%", background: "#0F172A", border: "1px solid #1E293B", borderRadius: 8, padding: "10px 12px", color: "#E2E8F0", fontSize: 13, outline: "none" },
  submitBtn: { background: "linear-gradient(135deg,#14F195,#9945FF)", border: "none", borderRadius: 8, padding: 12, color: "#000", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalBox: { background: "#0A1628", border: "1px solid #1E293B", borderRadius: 16, width: "90%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" as const },
  modalHeader: { padding: "14px 20px", borderBottom: "1px solid #1E293B", display: "flex", justifyContent: "space-between", alignItems: "center" },
};

export const LIGHT: Record<string, React.CSSProperties> = {
  app: { minHeight: "100vh", background: "#F8FAFC", color: "#0F172A", fontFamily: "system-ui,sans-serif", position: "relative" as const },
  header: { background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 0, zIndex: 100 },
  headerInner: { maxWidth: 1400, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", gap: 24 },
  logo: { display: "flex", alignItems: "center", gap: 10, marginRight: "auto" },
  logoTitle: { fontWeight: 700, fontSize: 18, color: "#059669" },
  logoSub: { fontSize: 11, color: "#94A3B8" },
  nav: { display: "flex", gap: 4 },
  navBtn: { padding: "6px 14px", borderRadius: 6, border: "none", background: "transparent", color: "#64748B", cursor: "pointer", fontSize: 13 },
  navActive: { background: "#05966915", color: "#059669" },
  walletBtn: { background: "linear-gradient(135deg,#059669,#7C3AED)", border: "none", borderRadius: 8, padding: "4px 14px", fontSize: 12, fontWeight: 700 },
  main: { maxWidth: 1400, margin: "0 auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 },
  banner: { padding: "10px 16px", borderRadius: 8, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" },
  bannerClose: { background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontSize: 14 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 },
  statCard: { background: "#FFFFFF", borderRadius: 10, padding: 10, textAlign: "center", border: "1px solid #E2E8F0" },
  statLabel: { fontSize: 12, color: "#64748B", marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: 700 },
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" },
  cardHeader: { padding: "12px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#475569" },
  iconBtn: { background: "transparent", border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#0F172A", fontSize: 13 },
  addBtn: { background: "#05966915", border: "1px solid #05966940", color: "#059669", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  empty: { padding: 32, textAlign: "center", color: "#94A3B8", fontSize: 13 },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { padding: "10px 12px", fontSize: 12, color: "#059669", textAlign: "left" as const, borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  tr: { cursor: "pointer", borderBottom: "1px solid #F1F5F9" },
  td: { padding: "10px 12px", fontSize: 13 },
  code: { fontFamily: "monospace", fontSize: 11, color: "#94A3B8" },
  badge: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99 },
  sensorPill: { fontSize: 11, padding: "2px 8px", borderRadius: 99, border: "1px solid #E2E8F0", color: "#475569" },
  fLabel: { fontSize: 12, color: "#475569", display: "block", marginBottom: 4 },
  fInput: { width: "100%", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", color: "#0F172A", fontSize: 13, outline: "none" },
  submitBtn: { background: "linear-gradient(135deg,#059669,#7C3AED)", border: "none", borderRadius: 8, padding: 12, color: "#FFF", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalBox: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, width: "90%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" as const },
  modalHeader: { padding: "14px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" },
};

// ============================================================
// CONTEXT DE TEMA — consumible desde cualquier componente
// ============================================================
type Theme = Record<string, React.CSSProperties>;
const ThemeContext = createContext<Theme>(DARK);

export function ThemeProvider({ dark, children }: { dark: boolean; children: React.ReactNode }) {
  return <ThemeContext.Provider value={dark ? DARK : LIGHT}>{children}</ThemeContext.Provider>;
}

// Hook para consumir el tema en cualquier componente
export function useS(): Theme { return useContext(ThemeContext); }

// Exportar S como alias de DARK para compatibilidad con imports existentes
export const S = DARK;
