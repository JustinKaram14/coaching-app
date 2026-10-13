import { Dumbbell, TrendingUp, Utensils } from 'lucide-react'
import { MAX_STAGE, STAGE_NAMES, type PhysiqueResult } from '../../lib/physique'

const NUTRITION_GOAL_DAYS = 5

// Zeigt, wie weit die Körperentwicklung der Figur ist und was diese Woche noch fehlt
export function PhysiqueCard({ physique }: { physique: PhysiqueResult | null }) {
  if (!physique) return null
  const week = physique.currentWeek
  const trainingMissing = Math.max(0, Math.ceil(physique.trainingGoal * 0.5) - week.trainingDays)
  const nutritionMissing = Math.max(0, Math.ceil(NUTRITION_GOAL_DAYS * 0.5) - week.nutritionDays)
  const counts = week.factor > 0
  const nextName = physique.nextStage === null ? null : STAGE_NAMES[physique.nextStage]

  let hint: string
  if (!physique.hasData) hint = 'Trainiere und trage deine Mahlzeiten ein: Deine Figur beginnt dann langsam zu wachsen.'
  else if (physique.nextStage === null) hint = 'Höchste Stufe erreicht. Bleib dran, damit du sie hältst.'
  else if (!counts) {
    const parts = []
    if (trainingMissing > 0) parts.push(`noch ${trainingMissing} Training${trainingMissing > 1 ? 's' : ''}`)
    if (nutritionMissing > 0) parts.push(`noch ${nutritionMissing} Tag${nutritionMissing > 1 ? 'e' : ''} Ernährung tracken`)
    hint = `Diese Woche zählt noch nicht: ${parts.join(' und ')}.`
  } else if (physique.weeksToNext !== null) {
    hint = `Bei diesem Tempo erreichst du „${nextName}“ in etwa ${physique.weeksToNext} Woche${physique.weeksToNext > 1 ? 'n' : ''}.`
  } else {
    hint = 'Regelmäßige Wochen mit Training und Tracking lassen die Figur wachsen.'
  }

  return (
    <div className="card !p-4 enter" style={{ '--d': 100 } as React.CSSProperties}>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 className="text-sm font-bold text-text-primary">Körperentwicklung</h2>
        <span className="text-xs font-semibold text-brand">
          Stufe {physique.stage} von {MAX_STAGE} · {physique.stageName}
        </span>
      </div>
      <div
        className="h-3 rounded-full bg-bg-elevated overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(physique.progressToNext * 100)}
        aria-label={nextName ? `Fortschritt zu ${nextName}` : 'Höchste Stufe erreicht'}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-brand" style={{ width: `${Math.max(3, Math.round(physique.progressToNext * 100))}%` }} />
      </div>
      <p className="text-xs text-text-secondary mt-2">{hint}</p>
      <ul className="grid grid-cols-3 gap-2 mt-3 text-center">
        <li className="rounded-xl bg-bg-elevated p-2">
          <Dumbbell size={14} className="mx-auto text-warning" aria-hidden="true" />
          <div className="text-sm font-bold tabular-nums text-text-primary">{week.trainingDays} / {physique.trainingGoal}</div>
          <div className="text-[11px] text-text-muted">Trainings</div>
        </li>
        <li className="rounded-xl bg-bg-elevated p-2">
          <Utensils size={14} className="mx-auto text-brand" aria-hidden="true" />
          <div className="text-sm font-bold tabular-nums text-text-primary">{week.nutritionDays} / {NUTRITION_GOAL_DAYS}</div>
          <div className="text-[11px] text-text-muted">Tage getrackt</div>
        </li>
        <li className="rounded-xl bg-bg-elevated p-2">
          <TrendingUp size={14} className={`mx-auto ${week.progressed ? 'text-success' : 'text-text-muted'}`} aria-hidden="true" />
          <div className="text-sm font-bold text-text-primary">{week.progressed ? 'Ja' : 'Noch nicht'}</div>
          <div className="text-[11px] text-text-muted">Gesteigert</div>
        </li>
      </ul>
      <p className="text-[11px] text-text-muted mt-3">
        Deine Figur wächst nur, wenn du regelmäßig trainierst und deine Ernährung trackst. Einloggen allein reicht nicht.
        Eine Steigerung in einer Übung beschleunigt das Wachstum, eine längere Pause lässt sie nur sehr langsam schrumpfen.
      </p>
    </div>
  )
}
