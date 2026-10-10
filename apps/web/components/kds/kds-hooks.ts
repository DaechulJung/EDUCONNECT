"use client";
/**
 * KDS 2.0 React 훅 — kds-design 스킬 확장 (KT 공식 패키지 아님)
 * 컴포넌트는 kds.tsx, 훅은 이 파일 (Vite react-refresh 규칙: 한 파일에 컴포넌트와 훅을 같이 export하지 않는다)
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
/** 서버 렌더·하이드레이션 중에는 false, 그 뒤 true (포털·저장소처럼 브라우저에만 있는 것을 다룰 때) */
export const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

/** 렌더 중에 ref를 바꾸지 않고 effect에서 최신 값을 담는다 (React Compiler 규칙) */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; });
  return ref;
}

/** 토스트: 앱 맨 위에 <ToastProvider>(kds.tsx), 쓰는 곳에서 const toast = useToast(); toast("저장했어요") */
export const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

/* 작성 중인 내용 유지 (Seamless Flow 3-4)
 * const draft = useDraft("plan-change", form);   // form이 처음 값에서 바뀌면 저장
 * draft.saved가 있으면 "작성 중인 내용이 있어요" 팝업 → [새로 작성: draft.clear()] [이어서 작성: setForm(draft.saved); draft.dismiss()]
 * 제출이 끝나면 draft.clear(). 비밀번호·주민번호 같은 값은 넘기지 않는다. */
function draftStore(session: boolean): Storage | null {
  try { return session ? window.sessionStorage : window.localStorage; } catch { return null; }
}
function readDraft<T>(storeKey: string, session: boolean): T | null {
  if (typeof window === "undefined") return null;
  try { const raw = draftStore(session)?.getItem(storeKey); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
}
export function useDraft<T>(key: string, values: T, { session = false, enabled = true } = {}) {
  const storeKey = `kds-draft:${key}`;
  const isClient = useIsClient();
  const [initial] = useState<T | null>(() => readDraft<T>(storeKey, session)); // 화면에 들어온 순간의 저장본
  const [startJson] = useState(() => JSON.stringify(values));                  // 화면에 들어온 순간의 입력값
  const [dismissed, setDismissed] = useState(false);
  const json = JSON.stringify(values);
  useEffect(() => {
    // 처음 값 그대로면 저장하지 않는다 → 이어서 작성할지 고르기 전에 빈 폼이 저장본을 덮어쓰지 않는다 (StrictMode 이중 실행에도 안전)
    if (!enabled || json === startJson) return;
    const t = setTimeout(() => { try { draftStore(session)?.setItem(storeKey, json); } catch { /* 저장 공간 없음 */ } }, 300);
    return () => clearTimeout(t);
  }, [json, startJson, enabled, storeKey, session]);
  const clear = useCallback(() => {
    try { draftStore(session)?.removeItem(storeKey); } catch { /* 무시 */ }
    setDismissed(true);
  }, [storeKey, session]);
  const dismiss = useCallback(() => setDismissed(true), []);
  return { saved: isClient && !dismissed ? initial : null, clear, dismiss };
}
