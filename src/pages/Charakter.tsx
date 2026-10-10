// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { useAuth } from '../hooks/useAuth'
import { useGame } from '../hooks/useGame'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PageLoader } from '../components/ui/Spinner'
import { Onboarding } from '../components/game/Onboarding'
import { STREAK_BONUS, levelTitle, normalizeCharacterName } from '../lib/game'
import { Check, CircleQuestionMark, Coins, Pencil, Star } from 'lucide-react'
import { Avatar } from '../components/game/Avatar'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { cn } from '../lib/utils'
import { ChallengesTab } from '../components/game/ChallengesTab'
import { ShopTab } from '../components/game/ShopTab'
import { RewardsTab } from '../components/game/RewardsTab'
import { BottomSheet } from '../components/ui/BottomSheet'
import { CharacterEditor } from '../components/game/CharacterEditor'

export const CHARAKTER_TABS = [
  {
    key: 'challenges',
    label: 'Challenges',
  },
  {
    key: 'shop',
    label: 'Shop',
  },
  {
    key: 'belohnungen',
    label: 'Belohnungen',
  },
]
export function Charakter() {
  let { user } = useAuth(),
    { available, loaded, character, level, stats, updateCharacter } = useGame(),
    navigate = useNavigate(),
    [searchParams, setSearchParams] = useSearchParams(),
    tab = CHARAKTER_TABS.find((tabItem) => tabItem.key === searchParams.get('tab'))?.key ?? 'challenges',
    [editing, setEditing] = useState(false),
    [helpOpen, setHelpOpen] = useState(false),
    [draftConfig, setDraftConfig] = useState(null),
    [draftName, setDraftName] = useState(''),
    [saving, setSaving] = useState(false),
    [todayEvents, setTodayEvents] = useState([]),
    wantsOnboarding = useRef(false),
    [onboardingDone, setOnboardingDone] = useState(false)
  if (
    (loaded && available && !character && (wantsOnboarding.current = true),
    useEffect(() => {
      if (!user || !character) return
      let startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      let cancelled = false
      return (
        supabase
          .from('xp_events')
          .select('id,titel,xp,punkte')
          .eq('user_id', user.id)
          .gte('created_at', startOfDay.toISOString())
          .order('created_at', {
            ascending: false,
          })
          .then(({ data: eventRows }) => {
            cancelled || setTodayEvents((eventRows ?? []).filter((event) => event.xp > 0 || event.punkte > 0))
          }),
        () => {
          cancelled = true
        }
      )
    }, [user, character, stats.xp, stats.punkte]),
    !loaded)
  )
    return <PageLoader />
  if (!available)
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="section-title text-2xl">Deine Figur</h1>
        <p className="card text-sm text-text-secondary">
          Die Figur ist noch nicht freigeschaltet. Das Update wird gerade eingespielt, bitte später noch einmal schauen.
        </p>
      </div>
    )
  if (wantsOnboarding.current && !onboardingDone)
    return <Onboarding withAnamnese={false} onDone={() => setOnboardingDone(true)} onSkip={() => navigate('/more')} />
  if (!character) return <PageLoader />
  function openEditor() {
    ;(setDraftConfig(character.config), setDraftName(character.name), setEditing(true))
  }
  async function saveCharacter() {
    let cleanName = normalizeCharacterName(draftName)
    !cleanName ||
      !draftConfig ||
      (setSaving(true),
      await updateCharacter({
        name: cleanName,
        config: draftConfig,
      }),
      setSaving(false),
      setEditing(false))
  }
  let todayXp = todayEvents.reduce((sum, event) => sum + event.xp, 0),
    todayPunkte = todayEvents.reduce((sum, event) => sum + event.punkte, 0)
  return (
    <div className="max-w-2xl space-y-5">
      <div className="card relative overflow-hidden !p-5">
        <button
          onClick={() => setHelpOpen(true)}
          className="absolute right-3 top-3 z-10 w-10 h-10 rounded-full bg-bg-elevated/80 border border-border-input text-text-secondary hover:text-brand flex items-center justify-center transition-colors"
          aria-label="So sammelst du XP und Punkte"
        >
          <CircleQuestionMark size={18} aria-hidden="true" />
        </button>
        <div
          className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-brand/10 to-transparent pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative flex flex-col items-center text-center">
          <div
            className="enter relative"
            style={{
              '--d': 0,
            }}
          >
            <Avatar
              config={character.config}
              equipped={character.equipped}
              size={200}
              idle
              label={`${character.name}, Level ${level.level}`}
            />
            <span
              className="pop-in absolute -bottom-1 left-1/2 -translate-x-1/2 min-w-[72px] px-3.5 py-1 rounded-full bg-primary text-white text-lg font-extrabold tabular-nums ring-4 ring-bg-card border border-brand/50 shadow-glow-sm"
              style={{
                animationDelay: '0.3s',
              }}
            >
              Level {level.level}
            </span>
          </div>
          <h1
            className="enter section-title text-2xl mt-6"
            style={{
              '--d': 100,
            }}
          >
            {character.name}
          </h1>
          <p
            className="enter text-sm font-semibold text-brand"
            style={{
              '--d': 150,
            }}
          >
            {levelTitle(level.level)}
          </p>
          <div
            className="enter w-full max-w-sm mt-4"
            style={{
              '--d': 220,
            }}
          >
            <div className="flex items-baseline justify-between text-xs text-text-secondary tabular-nums mb-1.5">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Star size={12} className="text-warning" aria-hidden="true" /> {stats.xp} XP
              </span>
              <span>
                noch {level.xpNeed - level.xpInto} bis Level {level.next}
              </span>
            </div>
            <div
              className="h-3 rounded-full bg-bg-elevated overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={level.xpNeed}
              aria-valuenow={level.xpInto}
              aria-label={`Fortschritt zu Level ${level.next}`}
            >
              <div
                className="bar-grow h-full rounded-full bg-gradient-to-r from-primary to-brand"
                style={{
                  width: `${Math.max(4, level.pct)}%`,
                  '--d': 380,
                }}
              />
            </div>
          </div>
          <div
            className="enter mt-4 flex flex-wrap items-center justify-center gap-2"
            style={{
              '--d': 300,
            }}
          >
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-warning/15 text-warning font-extrabold tabular-nums">
              <Coins size={16} aria-hidden="true" /> {stats.punkte} Punkte
            </span>
            <button onClick={openEditor} className="btn-secondary !px-4 !py-2 text-sm flex items-center gap-2">
              <Pencil size={14} aria-hidden="true" /> Figur ändern
            </button>
          </div>
        </div>
      </div>
      <div
        className="enter card !p-4"
        style={{
          '--d': 120,
        }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 mb-2">
          <h2 className="text-sm font-bold text-text-primary">Heute verdient</h2>
          {todayEvents.length > 0 && (
            <span className="text-xs font-semibold tabular-nums text-text-secondary">
              +{todayXp} XP · +{todayPunkte} Punkte
            </span>
          )}
        </div>
        {todayEvents.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Noch nichts. Trag eine Mahlzeit ein, trink Wasser oder starte eine Challenge.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {todayEvents.slice(0, 8).map((event) => (
              <li className="flex items-center gap-2.5 text-sm" key={event.id}>
                <span className="w-5 h-5 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                  <Check size={12} strokeWidth={3.5} aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0 text-text-primary break-words">{event.titel ?? 'Erfolg'}</span>
                <span className="text-xs font-semibold tabular-nums text-text-secondary">
                  {event.xp > 0 && `+${event.xp} XP`}
                  {event.punkte > 0 && <span className="text-warning"> +{event.punkte}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <SegmentedTabs
        tabs={CHARAKTER_TABS}
        value={tab}
        onChange={(nextTab) =>
          setSearchParams(
            nextTab === 'challenges'
              ? {}
              : {
                  tab: nextTab,
                },
            {
              replace: true,
            },
          )
        }
        label="Bereich"
      />
      <div
        className={cn('enter')}
        style={{
          '--d': 0,
        }}
        key={tab}
      >
        {tab === 'challenges' && <ChallengesTab />}
        {tab === 'shop' && <ShopTab />}
        {tab === 'belohnungen' && <RewardsTab />}
      </div>
      <BottomSheet open={editing} onClose={() => setEditing(false)} title="Figur ändern" tall>
        {draftConfig && (
          <div className="pb-3">
            <CharacterEditor
              config={draftConfig}
              name={draftName}
              equipped={character.equipped}
              onConfig={setDraftConfig}
              onName={setDraftName}
            />
            <button
              onClick={saveCharacter}
              disabled={!normalizeCharacterName(draftName) || saving}
              className="btn-primary w-full mt-5 disabled:opacity-50"
            >
              {saving ? 'Wird gespeichert …' : 'Speichern'}
            </button>
          </div>
        )}
      </BottomSheet>
      <BottomSheet open={helpOpen} onClose={() => setHelpOpen(false)} title="So funktioniert’s">
        <div className="space-y-4 pb-3 text-sm text-text-secondary leading-relaxed">
          <p>
            <strong className="text-text-primary">XP</strong> bringen dich ins nächste Level. Neue Level schalten Dinge
            im Shop frei. <strong className="text-text-primary">Punkte</strong> sind dein Geld: Damit bezahlst du Dinge
            im Shop und Belohnungen.
          </p>
          <table className="w-full text-left">
            <caption className="sr-only">Was bringt wie viel</caption>
            <thead>
              <tr className="text-xs uppercase tracking-wider text-text-muted">
                <th className="py-1 font-semibold">Aktion</th>
                <th className="py-1 font-semibold text-right">XP</th>
                <th className="py-1 font-semibold text-right">Punkte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ['Hauptmahlzeit eintragen', 6, 0],
                ['Schlaf eintragen', 8, 0],
                ['Gewicht eintragen', 5, 0],
                ['Supplements komplett', 8, 0],
                ['Training geschafft', 30, 10],
                ['Wasserziel erreicht', 20, 10],
                ['Grüner Tag', 30, 20],
              ].map(([rewardLabel, xpAmount, punkteAmount]) => (
                <tr key={rewardLabel}>
                  <td className="py-1.5 text-text-primary">{rewardLabel}</td>
                  <td className="py-1.5 text-right tabular-nums">+{xpAmount}</td>
                  <td className="py-1.5 text-right tabular-nums">{punkteAmount ? `+${punkteAmount}` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <strong className="text-text-primary">Grüner Tag:</strong> alle drei Hauptmahlzeiten, Schlaf und alle
            Supplements sind eingetragen.
          </p>
          <p>
            <strong className="text-text-primary">Serien:</strong> Wer{' '}
            {Object.keys(STREAK_BONUS).slice(0, 4).join(', ')} … Tage am Stück etwas einträgt, bekommt einen Bonus.
          </p>
          <p>
            <strong className="text-text-primary">Challenges:</strong> Bis zu drei pro Tag. Mit Foto oder kurzer Notiz
            bekommst du Punkte und 1,5-fach XP.
          </p>
          <p>
            <strong className="text-text-primary">Belohnungen:</strong> Du bestimmst selbst, was du dir gönnst und was
            es kostet. Eingelöst wird per Gutschein.
          </p>
        </div>
      </BottomSheet>
    </div>
  )
}
