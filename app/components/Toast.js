import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

const ToastContext = createContext();

let toastId = 0;

const ICONS = {
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="6.5" r="1" fill="currentColor" />
    </svg>
  ),
  success: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 10.5l2.5 2.5L14 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L1 18h18L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="14.5" r="0.75" fill="currentColor" />
    </svg>
  ),
};

function Toast({ id, message, type, title, duration, onRemove }) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTime = useRef(Date.now());

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(id), 280);
  }, [id, onRemove]);

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(dismiss, duration);
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      setProgress(Math.max(0, 100 - (elapsed / duration) * 100));
    }, 30);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [duration, dismiss]);

  return (
    <div
      className={`toast toast--${type} ${exiting ? "toast--exit" : ""}`}
      onClick={dismiss}
      role="alert"
    >
      <div className="toast__body">
        <span className="toast__icon">{ICONS[type]}</span>
        <div className="toast__content">
          {title && <div className="toast__title">{title}</div>}
          <div className="toast__message">{message}</div>
        </div>
        <button className="toast__close" onClick={(e) => { e.stopPropagation(); dismiss(); }} aria-label="Dismiss">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {duration > 0 && (
        <div className="toast__progress">
          <div className="toast__progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message, { type = "info", duration = 5000, title } = {}) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type, duration, title }]);
      return id;
    },
    []
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            id={t.id}
            message={t.message}
            type={t.type}
            title={t.title}
            duration={t.duration}
            onRemove={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
