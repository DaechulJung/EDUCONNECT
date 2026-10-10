import { Icon } from '@/components/kds/kds'

// Placeholder body for a screen whose owning Issue has not landed yet (replaced by that Issue).
export function Pending({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <section className="kds-section" aria-labelledby="pending-title" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
      <p className="aidx-eyebrow">{eyebrow}</p>
      <h2 id="pending-title" className="title-large-bold" style={{ margin: 0 }}>{title}</h2>
      <div className="kds-empty">
        <Icon name="ic-line-info" />
        <p>아직 준비 중인 화면이에요</p>
      </div>
    </section>
  )
}
