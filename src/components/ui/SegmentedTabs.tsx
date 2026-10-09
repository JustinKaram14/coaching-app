// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { cn } from '../../lib/utils'

export function SegmentedTabs({ tabs, value, onChange, label, className }) {
  let activeIndex = Math.max(
    0,
    tabs.findIndex((e) => e.key === value),
  )
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={(t) => {
        ;(t.key !== 'ArrowRight' && t.key !== 'ArrowLeft') ||
          (t.preventDefault(),
          onChange(tabs[(activeIndex + (t.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length].key))
      }}
      className={cn('relative grid p-1 rounded-full bg-bg-elevated border border-border', className)}
      style={{
        gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 left-1 rounded-full bg-primary ring-1 ring-inset ring-brand/30 shadow-glow-sm"
        style={{
          width: `calc((100% - 0.5rem) / ${tabs.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
          transition: 'transform 0.4s var(--ease-out)',
        }}
      />
      {tabs.map((e) => (
        <button
          role="tab"
          aria-selected={e.key === value}
          tabIndex={e.key === value ? 0 : -1}
          onClick={() => onChange(e.key)}
          className={cn(
            'relative z-10 py-2 px-2 max-[359px]:px-1 text-sm max-[359px]:text-[12px] font-semibold rounded-full transition-colors duration-300 active:scale-95 truncate',
            e.key === value ? 'text-white' : 'text-text-secondary hover:text-text-primary',
          )}
          key={e.key}
        >
          {e.label}
        </button>
      ))}
    </div>
  )
}
