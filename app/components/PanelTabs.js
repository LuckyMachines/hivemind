import React, { useState } from "react";

export default function PanelTabs({ tabs, activeTab, onTabChange, className = "" }) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id);
  const active = activeTab !== undefined ? activeTab : internalActive;
  const setActive = onTabChange || setInternalActive;

  const activeEntry = tabs.find((t) => t.id === active) || tabs[0];

  return (
    <div className={`panel-tabs ${className}`}>
      <div className="panel-tabs__bar" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tab.id === active}
            className={`panel-tabs__tab ${tab.id === active ? "panel-tabs__tab--active" : ""}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.icon && <span className="panel-tabs__tab-icon">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span className="panel-tabs__tab-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>
      <div className="panel-tabs__content" role="tabpanel">
        {activeEntry?.content}
      </div>
    </div>
  );
}
