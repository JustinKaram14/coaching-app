import type { Empfehlung } from '../../../lib/entdecken/empfehlungen'
import type { Treffer } from '../../../lib/entdecken/filter'
import { RezeptKarte } from './RezeptKarte'

/** „Von deinem Coach“: empfohlene Rezepte mit Notiz. Auch Rezepte, die zu deinen Einschränkungen nicht passen, bleiben sichtbar, aber deutlich markiert. */
export function CoachEmpfehlungen({ eintraege, onOeffnen }: {
  eintraege: { e: Empfehlung; t: Treffer }[]; onOeffnen: (e: Empfehlung, t: Treffer) => void
}) {
  if (eintraege.length === 0) return null
  return (
    <section aria-label="Von deinem Coach" className="space-y-2" data-testid="coach-empfehlungen">
      <h3 className="font-bold text-text-primary"><span aria-hidden="true">👋 </span>Von deinem Coach</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x scrollbar-none">
        {eintraege.map(({ e, t }) => (
          <div key={e.id} className="snap-start shrink-0 w-48 space-y-1.5">
            <div className="relative">
              <RezeptKarte t={t} breit onOpen={() => onOeffnen(e, t)} />
              {!e.gesehenAm && <span className="absolute top-2 right-2 rounded-full bg-primary text-white text-[10px] font-bold px-2 py-0.5 pointer-events-none">Neu</span>}
            </div>
            {e.notiz && <p className="text-xs text-text-secondary leading-snug line-clamp-4 px-1">„{e.notiz}“</p>}
          </div>
        ))}
      </div>
    </section>
  )
}
