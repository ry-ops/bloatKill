import { useState } from "react";

const glitch = `
@keyframes glitch {
  0%,100% { clip-path: inset(0 0 100% 0); transform: translate(0); }
  10% { clip-path: inset(10% 0 60% 0); transform: translate(-2px, 1px); }
  20% { clip-path: inset(70% 0 5% 0); transform: translate(2px, -1px); }
  30% { clip-path: inset(30% 0 40% 0); transform: translate(-1px, 2px); }
  40% { clip-path: inset(80% 0 2% 0); transform: translate(1px, -2px); }
  50% { clip-path: inset(5% 0 85% 0); transform: translate(-2px, 1px); }
}
@keyframes scanline {
  0% { top: -10%; }
  100% { top: 110%; }
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes pulse { 0%,100%{box-shadow:0 0 8px #ff4400aa} 50%{box-shadow:0 0 24px #ff4400,0 0 48px #ff440055} }
`;

const folders = {
  WinSxS: {
    icon: "⬡",
    color: "#ff6a00",
    glow: "#ff6a0066",
    size: "8–15 GB",
    location: "C:\\Windows\\WinSxS",
    description:
      "The Windows Component Store. Houses all Windows component versions ever installed — including superseded updates, rollback data, and side-by-side assemblies. It is intentionally large and managed by the OS.",
    risks: "Never manually delete files here. Windows manages it exclusively.",
    methods: [
      {
        label: "Disk Cleanup (built-in)",
        cmd: 'cleanmgr /sageset:1\ncleanmgr /sagerun:1',
        note: "Select 'Windows Update Cleanup' — removes superseded components.",
        danger: "low",
      },
      {
        label: "DISM StartComponentCleanup",
        cmd: "Dism.exe /online /Cleanup-Image /StartComponentCleanup",
        note: "Removes superseded component versions after a 30-day safety window.",
        danger: "low",
      },
      {
        label: "DISM + ResetBase (aggressive)",
        cmd: "Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase",
        note: "Removes ALL superseded components. Disables rollback of installed updates. Irreversible.",
        danger: "high",
      },
      {
        label: "PowerShell — Analyze size",
        cmd: 'Get-ChildItem C:\\Windows\\WinSxS | Measure-Object -Property Length -Sum | Select-Object @{N="Size(GB)";E={[math]::Round($_.Sum/1GB,2)}}',
        note: "Accurate WinSxS size audit before cleanup.",
        danger: "safe",
      },
    ],
  },
  Installer: {
    icon: "◈",
    color: "#00c9ff",
    glow: "#00c9ff55",
    size: "3–12 GB",
    location: "C:\\Windows\\Installer",
    description:
      "Windows Installer cache. Stores .msi and .msp patch files used by Windows Installer for repair, modify, and uninstall operations. Orphaned files accumulate over years of software churn.",
    risks: "Deleting active patch files breaks repair/uninstall of installed apps. Use tools that detect orphans only.",
    methods: [
      {
        label: "PatchCleaner (GUI — recommended)",
        cmd: "# Download: https://www.hendesoftware.com/patchcleaner.aspx\n# Detects orphaned vs. active installer files safely.",
        note: "Move orphans to another drive rather than delete — safest approach.",
        danger: "low",
      },
      {
        label: "msizap.exe (legacy SDK tool)",
        cmd: "msizap.exe G!",
        note: "Removes orphaned installer entries from registry and cache. Deprecated — use only on older systems.",
        danger: "medium",
      },
      {
        label: "PowerShell — Find orphans",
        cmd: `$valid = Get-ChildItem "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Installer\\UserData" -Recurse |
  Where-Object { $_.Property -contains "LocalPackage" } |
  ForEach-Object { (Get-ItemProperty $_.PSPath).LocalPackage }

Get-ChildItem "C:\\Windows\\Installer\\*.ms?" |
  Where-Object { $_.FullName -notin $valid } |
  Select-Object FullName, @{N="MB";E={[math]::Round($_.Length/1MB,1)}}`,
        note: "Lists orphaned files by cross-referencing registry. Review before deleting.",
        danger: "safe",
      },
      {
        label: "Disk Cleanup",
        cmd: "cleanmgr /d C:",
        note: "Limited effectiveness here — won't touch active installer files but clears temp variants.",
        danger: "low",
      },
    ],
  },
};

const dangerColors = {
  safe: { bg: "#00ff8822", border: "#00ff88", text: "#00ff88", label: "SAFE" },
  low: { bg: "#ffe06622", border: "#ffe066", text: "#ffe066", label: "LOW RISK" },
  medium: { bg: "#ff8c0022", border: "#ff8c00", text: "#ff8c00", label: "MEDIUM" },
  high: { bg: "#ff003322", border: "#ff0033", text: "#ff0033", label: "DANGER" },
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{
        background: copied ? "#00ff8833" : "#ffffff0a",
        border: `1px solid ${copied ? "#00ff88" : "#ffffff22"}`,
        color: copied ? "#00ff88" : "#aaa",
        padding: "3px 10px",
        borderRadius: 3,
        fontSize: 11,
        cursor: "pointer",
        fontFamily: "monospace",
        transition: "all .2s",
        letterSpacing: 1,
      }}
    >
      {copied ? "✓ COPIED" : "COPY"}
    </button>
  );
}

export default function App() {
  const [active, setActive] = useState("WinSxS");
  const [expandedIdx, setExpandedIdx] = useState(null);
  const folder = folders[active];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080a0f",
      fontFamily: "'Courier New', monospace",
      color: "#c8d4e0",
      padding: "32px 24px",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{glitch}</style>

      {/* Scanline overlay */}
      <div style={{
        position: "fixed", left: 0, right: 0, height: "3px",
        background: "linear-gradient(transparent, #ffffff08, transparent)",
        animation: "scanline 6s linear infinite",
        pointerEvents: "none", zIndex: 999,
      }} />

      {/* Grid background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: "linear-gradient(#ffffff05 1px, transparent 1px), linear-gradient(90deg, #ffffff05 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, color: "#ff4400", letterSpacing: 4, marginBottom: 8, opacity: 0.8 }}>
            ◉ WINDOWS STORAGE REMEDIATION — SYSADMIN REFERENCE v2.6
          </div>
          <h1 style={{
            fontSize: "clamp(24px, 5vw, 42px)",
            fontWeight: 900,
            letterSpacing: -1,
            margin: 0,
            lineHeight: 1,
            color: "#e8f0fa",
            textShadow: "0 0 40px #4488ff44",
          }}>
            BLOAT<span style={{ color: "#ff4400" }}>KILL</span>
          </h1>
          <div style={{ fontSize: 12, color: "#5a7a9a", marginTop: 6, letterSpacing: 2 }}>
            WINDOWS FOLDER CLEANUP INTELLIGENCE SYSTEM
          </div>
        </div>

        {/* Tab selector */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
          {Object.entries(folders).map(([key, val]) => (
            <button
              key={key}
              onClick={() => { setActive(key); setExpandedIdx(null); }}
              style={{
                flex: 1,
                padding: "14px 20px",
                background: active === key ? `${val.color}18` : "#0d1117",
                border: `1px solid ${active === key ? val.color : "#1e2a38"}`,
                borderRadius: 6,
                color: active === key ? val.color : "#4a6a7a",
                fontSize: 13,
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: 2,
                cursor: "pointer",
                transition: "all .25s",
                boxShadow: active === key ? `0 0 20px ${val.glow}` : "none",
                animation: active === key ? "pulse 2.5s infinite" : "none",
              }}
            >
              <span style={{ marginRight: 8 }}>{val.icon}</span>
              {key}
            </button>
          ))}
        </div>

        {/* Info card */}
        <div style={{
          background: "#0d1117",
          border: `1px solid ${folder.color}44`,
          borderRadius: 8,
          padding: "24px 28px",
          marginBottom: 24,
          animation: "fadeIn .3s ease",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: folder.color, letterSpacing: 3, marginBottom: 6 }}>FOLDER INTEL</div>
              <div style={{ fontSize: 13, color: "#5a8aaa", marginBottom: 12, fontFamily: "monospace" }}>{folder.location}</div>
              <p style={{ margin: 0, lineHeight: 1.7, fontSize: 14, color: "#9ab0c8", maxWidth: 580 }}>{folder.description}</p>
            </div>
            <div style={{
              background: `${folder.color}18`,
              border: `1px solid ${folder.color}66`,
              borderRadius: 6,
              padding: "12px 20px",
              textAlign: "center",
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 11, color: folder.color, letterSpacing: 2, marginBottom: 4 }}>TYPICAL SIZE</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: folder.color }}>{folder.size}</div>
            </div>
          </div>

          <div style={{
            marginTop: 18,
            padding: "10px 16px",
            background: "#ff440011",
            border: "1px solid #ff440033",
            borderRadius: 4,
            fontSize: 12,
            color: "#ff8866",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}>
            <span>⚠</span>
            <span>{folder.risks}</span>
          </div>
        </div>

        {/* Methods */}
        <div style={{ fontSize: 11, color: "#4a6a7a", letterSpacing: 3, marginBottom: 14 }}>
          CLEANUP METHODS — {folder.methods.length} AVAILABLE
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {folder.methods.map((m, i) => {
            const d = dangerColors[m.danger];
            const open = expandedIdx === i;
            return (
              <div
                key={i}
                style={{
                  background: open ? "#0f1620" : "#0d1117",
                  border: `1px solid ${open ? folder.color + "66" : "#1e2a38"}`,
                  borderRadius: 6,
                  overflow: "hidden",
                  transition: "all .2s",
                  animation: open ? "fadeIn .2s ease" : "none",
                }}
              >
                <div
                  onClick={() => setExpandedIdx(open ? null : i)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 20px",
                    cursor: "pointer",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 2,
                      padding: "3px 8px",
                      borderRadius: 3,
                      background: d.bg,
                      border: `1px solid ${d.border}`,
                      color: d.text,
                      flexShrink: 0,
                    }}>
                      {d.label}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#c8d8e8" }}>{m.label}</span>
                  </div>
                  <span style={{ color: folder.color, fontSize: 14, transition: "transform .2s", display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0)" }}>▶</span>
                </div>

                {open && (
                  <div style={{ padding: "0 20px 20px", animation: "fadeIn .2s ease" }}>
                    <p style={{ fontSize: 13, color: "#7a9ab0", marginTop: 0, marginBottom: 14, lineHeight: 1.6 }}>{m.note}</p>
                    <div style={{
                      background: "#060a0f",
                      border: "1px solid #1e2a38",
                      borderRadius: 5,
                      padding: "14px 16px",
                      position: "relative",
                    }}>
                      <div style={{ position: "absolute", top: 10, right: 12 }}>
                        <CopyButton text={m.cmd} />
                      </div>
                      <pre style={{
                        margin: 0,
                        fontSize: 12,
                        lineHeight: 1.7,
                        color: "#88ddbb",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        paddingRight: 70,
                        fontFamily: "'Courier New', monospace",
                      }}>
                        {m.cmd}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48, borderTop: "1px solid #1e2a38", paddingTop: 20, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2a4a5a", letterSpacing: 2 }}>
          <span>ry-ops.dev // BLOATKILL</span>
          <span style={{ animation: "blink 1.2s infinite" }}>█</span>
          <span>ALWAYS TEST IN NON-PROD</span>
        </div>
      </div>
    </div>
  );
}
