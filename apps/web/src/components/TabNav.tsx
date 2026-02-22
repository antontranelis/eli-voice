export type Tab = "log" | "netz";

interface TabNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

/** List icon (for Log tab) */
function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <line x1="5" y1="5" x2="14" y2="5" stroke={active ? "var(--text)" : "var(--text-muted)"} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="9" x2="14" y2="9" stroke={active ? "var(--text)" : "var(--text-muted)"} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="13" x2="14" y2="13" stroke={active ? "var(--text)" : "var(--text-muted)"} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="2.5" cy="5" r="1" fill={active ? "var(--text)" : "var(--text-muted)"} />
      <circle cx="2.5" cy="9" r="1" fill={active ? "var(--text)" : "var(--text-muted)"} />
      <circle cx="2.5" cy="13" r="1" fill={active ? "var(--text)" : "var(--text-muted)"} />
    </svg>
  );
}

/** Network/graph icon (for Netz tab) */
function GraphIcon({ active }: { active: boolean }) {
  const c = active ? "var(--text)" : "var(--text-muted)";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="4" r="2" stroke={c} strokeWidth="1.2" />
      <circle cx="4" cy="14" r="2" stroke={c} strokeWidth="1.2" />
      <circle cx="14" cy="14" r="2" stroke={c} strokeWidth="1.2" />
      <line x1="9" y1="6" x2="5" y2="12" stroke={c} strokeWidth="1" strokeLinecap="round" />
      <line x1="9" y1="6" x2="13" y2="12" stroke={c} strokeWidth="1" strokeLinecap="round" />
      <line x1="6" y1="14" x2="12" y2="14" stroke={c} strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
  );
}

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="tab-toggle">
      <button
        className={`tab-toggle-btn ${activeTab === "log" ? "active" : ""}`}
        onClick={() => onTabChange("log")}
        title="Log"
      >
        <ListIcon active={activeTab === "log"} />
      </button>
      <button
        className={`tab-toggle-btn ${activeTab === "netz" ? "active" : ""}`}
        onClick={() => onTabChange("netz")}
        title="Netz"
      >
        <GraphIcon active={activeTab === "netz"} />
      </button>
    </nav>
  );
}
