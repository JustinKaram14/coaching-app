// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { useSearchParams } from 'react-router-dom'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { TrainingEinheiten } from './training/Einheiten'
import { TrainingVorlagen } from './training/Vorlagen'
import { Uebungspool } from './training/Uebungspool'
import { PlanBuilder } from './training/PlanBuilder'
import { Fortschritt } from './training/Fortschritt'

export const TRAINING_TABS = [
  {
    key: 'einheiten',
    label: 'Einheiten',
  },
  {
    key: 'vorlagen',
    label: 'Vorlagen',
  },
  {
    key: 'uebungen',
    label: 'Übungen',
  },
  {
    key: 'fortschritt',
    label: 'Fortschritt',
  },
]
export function Training() {
  let [e, t] = useSearchParams(),
    n = e.get('tab'),
    r = TRAINING_TABS.some((e) => e.key === n) ? n : 'einheiten',
    i = e.get('mode') === 'plan' ? 'plan' : 'pool',
    a = e.get('start') ?? undefined,
    o = (e, n) => {
      let r = new URLSearchParams()
      ;(e !== 'einheiten' && r.set('tab', e),
        e === 'uebungen' && n === 'plan' && r.set('mode', 'plan'),
        t(r, {
          replace: true,
        }))
    }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title text-2xl">Training</h1>
        <p className="text-text-secondary text-sm mt-0.5">Einheiten, Vorlagen, Übungen und dein Fortschritt</p>
      </div>
      <SegmentedTabs tabs={TRAINING_TABS} value={r} onChange={(e) => o(e)} label="Trainingsbereich" />
      <div
        className="enter"
        style={{
          '--d': 0,
        }}
        key={r}
      >
        {r === 'einheiten' && (
          <TrainingEinheiten
            embedded
            onOpenVorlagen={() => o('vorlagen')}
            startVorlageId={a}
            onStartHandled={() =>
              t(new URLSearchParams(), {
                replace: true,
              })
            }
          />
        )}
        {r === 'vorlagen' && <TrainingVorlagen embedded onBuildPlan={() => o('uebungen', 'plan')} />}
        {r === 'uebungen' && (
          <div className="space-y-4">
            <SegmentedTabs
              tabs={[
                {
                  key: 'pool',
                  label: 'Übungspool',
                },
                {
                  key: 'plan',
                  label: 'Plan bauen',
                },
              ]}
              value={i}
              onChange={(e) => o('uebungen', e)}
              label="Übungen oder Plan"
              className="max-w-sm"
            />
            {i === 'pool' ? <Uebungspool embedded /> : <PlanBuilder onSaved={() => o('vorlagen')} />}
          </div>
        )}
        {r === 'fortschritt' && <Fortschritt />}
      </div>
    </div>
  )
}
