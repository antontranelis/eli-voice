export type Tab = "log" | "netz";

interface TabNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="tab-nav">
      <button
        className={`tab-btn ${activeTab === "log" ? "active" : ""}`}
        onClick={() => onTabChange("log")}
      >
        Log
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
