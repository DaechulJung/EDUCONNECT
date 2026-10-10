"use client";

import { useQuery } from "@tanstack/react-query";
import { health as getHealth } from "@/lib/client";
import { healthRows } from "@/lib/health";

// Starting screen: replace it with the real feature once the topic is decided.
// Screens use KDS 2.0 (kds-* classes from public/kds); open the kds-design skill first (AGENTS.md).
export default function Home() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      // 503 still carries the same body, so show which dependency is down.
      const { data, error } = await getHealth();
      return data ?? error ?? null;
    },
  });

  return (
    <main className="kds-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)", paddingBlock: "var(--space-40)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <p className="aidx-eyebrow">해커톤 뼈대 <span className="aidx-eyebrow__sep">|</span> 시작 화면</p>
        <h1 className="heading-medium-bold">서비스 상태</h1>
        <p className="body-medium-medium" style={{ color: "var(--text-secondary-01)" }}>API가 데이터베이스·벡터 검색·Redis에 연결됐는지 확인해요.</p>
      </div>
      <section className="kds-card" aria-label="연결 상태" aria-busy={health.isPending}>
        {health.isPending ? (
          <p className="kds-info-line">확인하고 있어요</p>
        ) : !health.data ? (
          <p className="kds-info-line kds-info-line--error" role="alert">API에 연결하지 못했어요. API 서버가 켜져 있는지 확인해 주세요.</p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)", margin: 0, padding: 0, listStyle: "none" }}>
            {healthRows(health.data).map((row) => (
              <li key={row.label} className="kds-kv body-medium-medium">
                <span className="kds-kv__label">{row.label}</span>
                <span className="kds-kv__value">
                  {row.status === "online" ? "연결됨" : <span className="kds-tag kds-tag--critical">연결 안 됨</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
