import React, { useState, useCallback } from "react";

const CHEVRON = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Panel({ id, title, badge, icon, collapsed: controlledCollapsed, onToggle, className = "", children }) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggle = useCallback(() => {
    if (onToggle) onToggle(id);
    else setInternalCollapsed((c) => !c);
  }, [id, onToggle]);

  return (
    <section className={`panel ${collapsed ? "panel--collapsed" : ""} ${className}`} data-panel={id}>
      <header className="panel__header" onClick={toggle}>
        <div className="panel__header-left">
          {icon && <span className="panel__icon">{icon}</span>}
          <span className="panel__title">{title}</span>
          {badge !== undefined && badge !== null && (
            <span className="panel__badge">{badge}</span>
          )}
        </div>
        <button className="panel__toggle" aria-label={collapsed ? "Expand" : "Collapse"}>
          {CHEVRON}
        </button>
      </header>
      <div className="panel__body">
        <div className="panel__content">
          {children}
        </div>
      </div>
    </section>
  );
}
