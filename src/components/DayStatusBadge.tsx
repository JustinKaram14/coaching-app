// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { cn } from '../lib/utils'

export function DayStatusBadge({ item, size = 16, className }) {
  if (item.level === 'none') return null
  if (item.level === 'done')
    return (
      <span
        aria-hidden="true"
        className={cn(
          'pop-in inline-flex items-center justify-center rounded-full bg-success text-bg ring-2 ring-bg-card',
          className,
        )}
        style={{
          width: size,
          height: size,
        }}
        key={'done'}
      >
        <svg
          viewBox="0 0 24 24"
          width={size * 0.68}
          height={size * 0.68}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path className="check-draw" d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    )
  let circumference = 2 * Math.PI * 7,
    ratio = item.total ? item.done / item.total : 0
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pop-in inline-flex items-center justify-center rounded-full bg-bg-card ring-2 ring-bg-card',
        className,
      )}
      style={{
        width: size,
        height: size,
      }}
      key={'partial'}
    >
      <svg viewBox="0 0 20 20" width={size} height={size}>
        <circle cx="10" cy="10" r={7} fill="none" stroke="rgb(var(--c-border-light))" strokeWidth="3" />
        <circle
          cx="10"
          cy="10"
          r={7}
          fill="none"
          stroke="rgb(var(--c-success))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${circumference * ratio} ${circumference}`}
          transform="rotate(-90 10 10)"
        />
      </svg>
    </span>
  )
}
