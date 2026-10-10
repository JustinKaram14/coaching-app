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
  let [searchParams, setSearchParams] = useSearchParams(),
    tabParam = searchParams.get('tab'),
    activeTab = TRAINING_TABS.some((tabItem) => tabItem.key === tabParam) ? tabParam : 'einheiten',
    practiceMode = searchParams.get('mode') === 'plan' ? 'plan' : 'pool',
    startParam = searchParams.get('start') ?? undefined,
    selectTab = (tabKey, nextMode) => {
      let params = new URLSearchParams()
      ;(tabKey !== 'einheiten' && params.set('tab', tabKey),
        tabKey === 'uebungen' && nextMode === 'plan' && params.set('mode', 'plan'),
        setSearchParams(params, {
          replace: true,
        }))
    }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title text-2xl">Training</h1>
        <p className="text-text-secondary text-sm mt-0.5">Einheiten, Vorlagen, Übungen und dein Fortschritt</p>
      </div>
      <SegmentedTabs tabs={TRAINING_TABS} value={activeTab} onChange={(nextTab) => selectTab(nextTab)} label="Trainingsbereich" />
      <div
        className="enter"
        style={{
          '--d': 0,
        }}
        key={activeTab}
      >
        {activeTab === 'einheiten' && (
          <TrainingEinheiten
            embedded
            onOpenVorlagen={() => selectTab('vorlagen')}
            startVorlageId={startParam}
            onStartHandled={() =>
              setSearchParams(new URLSearchParams(), {
                replace: true,
              })
            }
          />
        )}
        {activeTab === 'vorlagen' && <TrainingVorlagen embedded onBuildPlan={() => selectTab('uebungen', 'plan')} />}
        {activeTab === 'uebungen' && (
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
              value={practiceMode}
              onChange={(nextMode) => selectTab('uebungen', nextMode)}
              label="Übungen oder Plan"
              className="max-w-sm"
            />
            {practiceMode === 'pool' ? <Uebungspool embedded /> : <PlanBuilder onSaved={() => selectTab('vorlagen')} />}
          </div>
        )}
        {activeTab === 'fortschritt' && <Fortschritt />}
      </div>
    </div>
  )
}
