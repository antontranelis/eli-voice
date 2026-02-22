export type Tab = "kreis" | "netz";

interface TabNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="tab-nav">
      <button
        className={`tab-btn ${activeTab === "kreis" ? "active" : ""}`}
        onClick={() => onTabChange("kreis")}
      >
        Kreis
      </button>
      <button
        className={`tab-btn ${activeTab === "netz" ? "active" : ""}`}
        onClick={() => onTabChange("netz")}
      >
        Netz
      </button>
    </nav>
  );
}
