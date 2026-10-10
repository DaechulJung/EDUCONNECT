"use client";
/**
 * KDS 2.0 React 도우미 — kds-design 스킬 확장 (KT 공식 패키지 아님)
 *
 * 공식 키트 CSS(kds-*)의 마크업을 그대로 그리고, 상태·키보드·포커스만 React로 처리한다.
 * 버튼·입력·카드·표·목록처럼 상태가 없는 것은 감싸지 않는다 → className="kds-button" 그대로 쓴다.
 *
 * 전제: 키트가 public/kds 에 있고 CSS 3개를 불러왔다 (scripts/install-kds.sh).
 * 키트 주소를 바꿨다면 아래 KDS_BASE만 고친다. 훅(useToast·useDraft)은 kds-hooks.ts.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import type { KdsIconName } from "./icons";
import { ToastContext, useIsClient, useLatest } from "./kds-hooks";

export const KDS_BASE = "/kds";

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

/* ── 아이콘 ───────────────────────────────────────────── */
// 키트에 있는 이름만 받는다(타입 오류로 잘못된 이름을 막는다). 없으면 Lucide를 kds-icon--lucide로.
export function Icon({ name, size = 24, label, className, style }: {
  name: KdsIconName; size?: 16 | 20 | 24 | 48; label?: string; className?: string; style?: CSSProperties;
}) {
  const sizeClass = size === 20 ? "kds-icon--20" : size === 16 ? "kds-icon--16" : undefined;
  const large = size === 48 ? { width: "var(--icon-size-xlarge)", height: "var(--icon-size-xlarge)" } : undefined;
  return (
    <span
      className={cx("kds-icon", sizeClass, className)}
      style={{ ["--icon" as string]: `url(${KDS_BASE}/icons/${name}.svg)`, ...large, ...style } as CSSProperties}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

// 키트에 없는 아이콘: public/kds/icons/lucide/<name>.svg 로 받아 두고 쓴다 (references/icons.md). 24 자리에 22로 그린다.
export function LucideIcon({ name, size = 24, label }: { name: string; size?: 16 | 20 | 24; label?: string }) {
  const sizeClass = size === 20 ? "kds-icon--20" : size === 16 ? "kds-icon--16" : undefined;
  return (
    <span
      className={cx("kds-icon", "kds-icon--lucide", sizeClass)}
      style={{ ["--icon" as string]: `url(${KDS_BASE}/icons/lucide/${name}.svg)` } as CSSProperties}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

/* ── 팝업·시트 공통: Escape, 배경 클릭, 포커스 가두기·복귀, 스크롤 잠금 ── */
type CloseReason = "escape" | "backdrop" | "button";
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useModal(open: boolean, dialogRef: RefObject<HTMLDivElement | null>, onClose: (reason: CloseReason) => void, closeOnEscape: boolean) {
  const onCloseRef = useLatest(onClose);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>("[autofocus]") ?? dialog?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialog)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) { e.preventDefault(); onCloseRef.current("escape"); return; }
      if (e.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) { e.preventDefault(); return; }
      const head = items[0], tail = items[items.length - 1];
      if (e.shiftKey && document.activeElement === head) { e.preventDefault(); tail.focus(); }
      else if (!e.shiftKey && document.activeElement === tail) { e.preventDefault(); head.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = prevOverflow;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open, dialogRef, closeOnEscape, onCloseRef]);
}

function Overlay({ open, sheet, closeOnBackdrop, onClose, children }: {
  open: boolean; sheet?: boolean; closeOnBackdrop: boolean; onClose: (reason: CloseReason) => void; children: ReactNode;
}) {
  const isClient = useIsClient();
  const downOnBackdrop = useRef(false);
  if (!isClient || !open) return null;
  return createPortal(
    <div
      className={cx("kds-overlay", sheet && "kds-overlay--sheet", "is-open")}
      onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (closeOnBackdrop && downOnBackdrop.current && e.target === e.currentTarget) onClose("backdrop"); }}
    >
      {children}
    </div>,
    document.body,
  );
}

/**
 * 가운데 팝업 — 꼭 읽고 결정해야 할 때. actions는 [보조(secondary) 왼쪽, 주요(primary) 오른쪽] 순서로 넘긴다.
 * <Popup open={open} onClose={() => setOpen(false)} title="문의 3건을 삭제할까요?" description="삭제한 문의는 되돌릴 수 없어요."
 *   actions={<><button className="kds-button kds-button--secondary" onClick={close}>취소</button><button className="kds-button" onClick={remove}>삭제</button></>} />
 */
export function Popup({ open, onClose, title, description, children, actions, size, closeOnBackdrop = true, closeOnEscape = true }: {
  open: boolean; onClose: (reason: CloseReason) => void; title: ReactNode; description?: ReactNode; children?: ReactNode;
  actions: ReactNode; size?: "small"; closeOnBackdrop?: boolean; closeOnEscape?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useModal(open, ref, onClose, closeOnEscape);
  return (
    <Overlay open={open} closeOnBackdrop={closeOnBackdrop} onClose={onClose}>
      <div ref={ref} className={cx("kds-popup", size === "small" && "kds-popup--small")} role="dialog" aria-modal="true"
        aria-labelledby={`${id}-t`} aria-describedby={description ? `${id}-d` : undefined} tabIndex={-1}>
        <h2 className="kds-popup__title" id={`${id}-t`}>{title}</h2>
        {description && <p className="kds-popup__body" id={`${id}-d`}>{description}</p>}
        {children}
        <div className="kds-popup__actions">{actions}</div>
      </div>
    </Overlay>
  );
}

/**
 * 바텀 시트 (모바일) — 선택지 3개 이상, 약관·옵션·쿠폰처럼 현재 화면을 유지한 채 하는 하위 단계.
 * footer에는 버튼만 (1개면 풀 폭 검정, 2개면 보조 왼쪽 + 주요 오른쪽).
 */
export function Sheet({ open, onClose, title, children, footer, closeOnBackdrop = true }: {
  open: boolean; onClose: (reason: CloseReason) => void; title: ReactNode; children: ReactNode; footer?: ReactNode; closeOnBackdrop?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useModal(open, ref, onClose, true);
  return (
    <Overlay open={open} sheet closeOnBackdrop={closeOnBackdrop} onClose={onClose}>
      <div ref={ref} className="kds-sheet" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} tabIndex={-1}>
        <div className="kds-sheet__header">
          <h2 id={`${id}-t`}>{title}</h2>
          <button type="button" className="kds-icon-button" aria-label="닫기" onClick={() => onClose("button")}><Icon name="ic-line-close" /></button>
        </div>
        <div className="kds-sheet__body">{children}</div>
        {footer && <div className="kds-sheet__footer">{footer}</div>}
      </div>
    </Overlay>
  );
}

/* ── 토스트: 앱 맨 위에 <ToastProvider>, 쓰는 곳에서 const toast = useToast(); toast("저장했어요") (useToast는 kds-hooks.ts) ── */
export function ToastProvider({ children, duration = 2500 }: { children: ReactNode; duration?: number }) {
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((text: string) => {
    clearTimeout(timer.current);
    setOpen(false);
    requestAnimationFrame(() => {
      setMessage(text);
      setOpen(true);
      timer.current = setTimeout(() => setOpen(false), duration);
    });
  }, [duration]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={cx("kds-toast", open && "is-open")} role="status" aria-live="polite">{message}</div>
    </ToastContext.Provider>
  );
}

/* ── 탭: 클릭·←→·Home·End, 선택된 패널만 보인다 ── */
export function Tabs<T extends string>({ items, value, onChange, label, scroll }: {
  items: Array<{ value: T; label: ReactNode; content: ReactNode; disabled?: boolean }>;
  value: T; onChange: (value: T) => void; label: string; scroll?: boolean;
}) {
  const id = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (e: ReactKeyboardEvent, index: number) => {
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
    const pos = enabled.indexOf(index);
    let next: number | undefined;
    if (e.key === "ArrowRight") next = enabled[(pos + 1) % enabled.length];
    else if (e.key === "ArrowLeft") next = enabled[(pos - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    if (next === undefined) return;
    e.preventDefault();
    onChange(items[next].value);
    refs.current[next]?.focus();
  };
  return (
    <>
      <div className={cx("kds-tabs", scroll && "kds-tabs--scroll")} role="tablist" aria-label={label}>
        {items.map((it, i) => (
          <button key={it.value} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" id={`${id}-tab-${i}`}
            aria-selected={it.value === value} aria-controls={`${id}-panel-${i}`} tabIndex={it.value === value ? 0 : -1}
            disabled={it.disabled} onClick={() => onChange(it.value)} onKeyDown={(e) => onKeyDown(e, i)}>
            {it.label}
          </button>
        ))}
      </div>
      {items.map((it, i) => (
        <div key={it.value} role="tabpanel" id={`${id}-panel-${i}`} aria-labelledby={`${id}-tab-${i}`} hidden={it.value !== value}>
          {it.content}
        </div>
      ))}
    </>
  );
}

/* ── 칩·시간 버튼: 단일(value: string) / 복수(value: string[]) 선택 ── */
type Option = { value: string; label?: ReactNode; disabled?: boolean };
function PressGroup({ kind, options, value, onChange, label }: {
  kind: "chip" | "time"; options: Option[]; value: string | string[]; onChange: (value: string | string[]) => void; label: string;
}) {
  const multi = Array.isArray(value);
  const pressed = (v: string) => (multi ? value.includes(v) : value === v);
  const toggle = (v: string) => {
    if (!multi) return onChange(v);
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  return (
    <div className={kind === "chip" ? "kds-chips" : "kds-time-buttons"} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={kind === "chip" ? "kds-chip" : "kds-time-button"}
          aria-pressed={pressed(o.value)} disabled={o.disabled} onClick={() => toggle(o.value)}>
          {o.label ?? o.value}
        </button>
      ))}
    </div>
  );
}
export function ChipGroup<V extends string | string[]>(props: { options: Option[]; value: V; onChange: (value: V) => void; label: string }) {
  return <PressGroup kind="chip" {...props} onChange={(v) => props.onChange(v as V)} />;
}
export function TimeButtons(props: { options: Option[]; value: string; onChange: (value: string) => void; label: string }) {
  return <PressGroup kind="time" {...props} onChange={(v) => props.onChange(v as string)} />;
}

/* ── 날짜: 키트 kds-datepicker.js를 처음 쓸 때 한 번 불러온다. 값 형식 "2026.10.14" ── */
function useDatepickerScript() {
  useEffect(() => {
    if (document.querySelector("script[data-kds-datepicker]")) return;
    const s = document.createElement("script");
    s.src = `${KDS_BASE}/tokens/kds-datepicker.js`;
    s.setAttribute("data-kds-datepicker", "");
    document.body.appendChild(s);
  }, []);
}
// 키트 스크립트가 input.value를 직접 바꾸므로 비제어 입력 + 네이티브 change 구독으로 받는다
function DateInput({ value, onChange, placeholder, min, ariaLabel }: {
  value: string; onChange: (value: string) => void; placeholder: string; min?: string; ariaLabel?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const onChangeRef = useLatest(onChange);
  useDatepickerScript();
  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    const handler = () => onChangeRef.current(input.value);
    input.addEventListener("change", handler);
    return () => input.removeEventListener("change", handler);
  }, [onChangeRef]);
  useEffect(() => { if (ref.current && ref.current.value !== value) ref.current.value = value; }, [value]);
  return (
    <span className="kds-datepicker">
      <input ref={ref} className="kds-field__input" defaultValue={value} placeholder={placeholder} readOnly data-min={min} aria-label={ariaLabel} />
    </span>
  );
}
export function DatePicker({ label, value, onChange, placeholder = "날짜 선택", min }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; min?: "today" | string;
}) {
  return (
    <label className="kds-field">
      <span className="kds-field__label">{label}</span>
      <DateInput value={value} onChange={onChange} placeholder={placeholder} min={min} />
    </label>
  );
}
export function DateRange({ start, end, onChange, min }: {
  start: string; end: string; onChange: (range: { start: string; end: string }) => void; min?: string;
}) {
  return (
    <div className="kds-date-range">
      <DateInput value={start} onChange={(v) => onChange({ start: v, end })} placeholder="시작일" ariaLabel="시작일" min={min} />
      <span aria-hidden="true">~</span>
      <DateInput value={end} onChange={(v) => onChange({ start, end: v })} placeholder="종료일" ariaLabel="종료일" min={start || min} />
    </div>
  );
}

/* ── 단계 표시 (키트에 없음, Seamless Flow 2-1): 현재·다음·전체 단계. 검정 = 지난·현재 단계 ──
 * <Steps current={1} total={3} labels={["요금제", "부가서비스", "확인"]} />  → 막대 + "1/3 요금제 · 다음: 부가서비스" */
export function Steps({ current, total, label, labels }: { current: number; total: number; label?: string; labels?: string[] }) {
  const now = labels?.[current - 1];
  const next = labels?.[current];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", paddingInline: "var(--margin-platform)" }}>
      <div role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current}
        aria-label={label ?? `${total}단계 중 ${current}단계${now ? ` ${now}` : ""}`}
        style={{ display: "flex", gap: "var(--space-4)" }}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} style={{
            flex: 1, height: "var(--space-4)", borderRadius: "var(--radius-circle)",
            background: i < current ? "var(--fill-primary)" : "var(--fill-secondary-01)",
          }} />
        ))}
      </div>
      {labels && (
        <p className="caption-medium-medium" aria-hidden="true" style={{ margin: 0, color: "var(--text-tertiary-01)" }}>
          <b style={{ color: "var(--text-primary)" }}>{current}/{total} {now}</b>{next ? ` · 다음: ${next}` : ""}
        </p>
      )}
    </div>
  );
}
