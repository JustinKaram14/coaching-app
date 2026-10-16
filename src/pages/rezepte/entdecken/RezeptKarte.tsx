import { Clock, Flame, Sparkles } from 'lucide-react'
import type { Treffer } from '../../../lib/entdecken/filter'
import { RezeptBild, TagChip, gesundheitsTags } from './gemeinsam'

/** Karte wie in einer Entdecken-Reihe: Foto, Name, kcal und Zeit */
export function RezeptKarte({ t, onOpen, breit = false, gesundheit = false }: {
  t: Treffer; onOpen: () => void; breit?: boolean; gesundheit?: boolean
}) {
  const { r } = t
  const tags = gesundheit ? gesundheitsTags(r).slice(0, 2) : []
  return (
    <button onClick={onOpen} data-testid="rezept-karte"
      className={`group text-left rounded-2xl border border-border bg-bg-card overflow-hidden hover:border-brand/50 transition-colors ${breit ? 'w-full' : 'w-44 shrink-0'}`}>
      <div className="relative">
        <RezeptBild r={r} className="w-full aspect-[4/3]" />
        {r.quelle === 'ki' && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 text-white text-[10px] px-2 py-0.5">
            <Sparkles size={10} aria-hidden="true" /> KI
          </span>
        )}
        {(t.weich.length > 0 || t.warnungen.length > 0) && (
          <span className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/70 text-white text-[10px] leading-tight px-2 py-1">
            {t.weich.length > 0 ? `Auf deiner „Schmeckt mir nicht“-Liste: ${t.weich.join(', ')}` : t.warnungen[0].text}
          </span>
        )}
      </div>
      <div className="p-2.5 space-y-1.5">
        <div className="text-sm font-semibold text-text-primary leading-snug line-clamp-2 min-h-[2.5rem]">{r.name}</div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1"><Flame size={12} aria-hidden="true" />{Math.round(r.pro.kcal)} kcal</span>
          <span className="inline-flex items-center gap-1"><Clock size={12} aria-hidden="true" />{r.zeitMin} Min.</span>
        </div>
        {tags.length > 0 && <div className="flex flex-wrap gap-1">{tags.map(tag => <TagChip key={tag.text} tag={tag} />)}</div>}
      </div>
    </button>
  )
}
