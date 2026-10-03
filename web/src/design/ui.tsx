import { useState, useMemo, useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import React from "react";

/* Base components. All styling lives in design/system.css via tokens, so the
   active theme class on an ancestor wrapper reskins everything. */

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  size,
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "sm";
  loading?: boolean;
}) {
  return (
    <button
      className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${loading ? "is-loading" : ""} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  id,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <div className="field">
      {label ? <label className="label" htmlFor={id}>{label}</label> : null}
      {children}
      {error ? <span className="error-text" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function Input({ invalid, mono, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; mono?: boolean }) {
  return <input className={`input ${mono ? "input-mono" : ""} ${className}`} aria-invalid={invalid || undefined} {...rest} />;
}

export type SelectOption = { value: string; label: string; disabled?: boolean };

export function Select({
  id,
  name,
  value,
  defaultValue,
  onChange,
  options,
  children,
  disabled,
  className = "",
  "data-testid": testid,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options?: SelectOption[];
  "data-testid"?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Extract options either from prop or children
  const parsedOptions: SelectOption[] = useMemo(() => {
    if (options && options.length > 0) return options;
    const opts: SelectOption[] = [];
    if (children) {
      React.Children.forEach(children, (child) => {
        if (React.isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) {
          const val = String(child.props.value ?? "");
          const lbl = String(child.props.children ?? child.props.value ?? "");
          opts.push({
            value: val,
            label: lbl,
            disabled: Boolean(child.props.disabled),
          });
        }
      });
    }
    return opts;
  }, [options, children]);

  const currentValue = value !== undefined ? String(value) : defaultValue !== undefined ? String(defaultValue) : (parsedOptions[0]?.value ?? "");
  const selectedOption = parsedOptions.find((o) => o.value === currentValue) || parsedOptions[0];

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const handleSelect = (val: string) => {
    setOpen(false);
    if (selectRef.current) {
      selectRef.current.value = val;
    }
    if (onChange) {
      const event = {
        target: { value: val, name, id },
        currentTarget: { value: val, name, id },
      } as unknown as React.ChangeEvent<HTMLSelectElement>;
      onChange(event);
    }
  };

  return (
    <div ref={containerRef} className={`custom-select-wrap ${className}`} style={{ position: "relative" }}>
      {/* Hidden native select for form integration & test automation */}
      <select
        ref={selectRef}
        id={id}
        name={name}
        value={currentValue}
        disabled={disabled}
        data-testid={testid}
        onChange={onChange}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          opacity: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: -1,
        }}
        {...rest}
      >
        {parsedOptions.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Claymorphic trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`custom-select-trigger ${open ? "is-open" : ""}`}
      >
        <span className="custom-select-label">{selectedOption ? selectedOption.label : currentValue}</span>
        <svg
          className={`custom-select-chevron ${open ? "rotate-180" : ""}`}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 140ms ease" }}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Claymorphic popup menu */}
      {open && (
        <div className="custom-select-menu" role="listbox">
          {parsedOptions.map((opt) => {
            const isSelected = opt.value === currentValue;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
                onClick={() => !opt.disabled && handleSelect(opt.value)}
                className={`custom-select-option ${isSelected ? "is-selected" : ""}`}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Card({
  hover,
  className = "",
  children,
  "data-testid": testid,
  onClick,
  style,
}: {
  hover?: boolean;
  className?: string;
  children: ReactNode;
  "data-testid"?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      data-testid={testid}
      onClick={onClick}
      style={style}
      className={`card ${hover ? "card-hover" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function Chip({
  tone = "neutral",
  children,
  className = "",
  "data-testid": testid,
}: {
  tone?: "accent" | "neutral" | "success" | "warning" | "danger";
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}) {
  return <span data-testid={testid} className={`chip chip-${tone} ${className}`}>{children}</span>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  testid,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  testid?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="modal"
      data-testid={testid}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="modal-header">{title}</div>
      <div className="modal-body">{children}</div>
      {footer ? <div className="modal-footer">{footer}</div> : null}
    </dialog>
  );
}

export type Toast = { id: number; tone: "accent" | "success" | "danger"; title: string; body?: string };

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`} data-testid={`toast-${t.tone}`}>
          <div>
            <div className="toast-title">{t.title}</div>
            {t.body ? <div className="toast-body">{t.body}</div> : null}
          </div>
          <button className="toast-dismiss" aria-label="Dismiss" onClick={() => onDismiss(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function Table({ children, testid }: { children: ReactNode; testid?: string }) {
  return (
    <div className="table-wrap">
      <table className="data-table" data-testid={testid}>{children}</table>
    </div>
  );
}

export function EmptyState({ title, body, action, testid }: { title: string; body: string; action?: ReactNode; testid?: string }) {
  return (
    <div className="state-panel" data-testid={testid}>
      <div className="state-icon" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /><path d="M8 11h6" />
        </svg>
      </div>
      <div className="state-title">{title}</div>
      <div className="state-body">{body}</div>
      {action}
    </div>
  );
}

export function ErrorState({ title, body, onRetry, testid }: { title: string; body: string; onRetry?: () => void; testid?: string }) {
  return (
    <div className="state-panel" data-testid={testid} role="alert">
      <div className="state-icon" style={{ color: "var(--danger)", background: "var(--danger-soft)" }} aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      </div>
      <div className="state-title">{title}</div>
      <div className="state-body">{body}</div>
      {onRetry ? <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button> : null}
    </div>
  );
}

export function Skeleton({ w, h = 14, className = "" }: { w?: number | string; h?: number | string; className?: string }) {
  return <span className={`skeleton ${className}`} style={{ width: w, height: h }} aria-hidden />;
}
