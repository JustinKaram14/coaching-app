// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { cn } from '../../lib/utils'
import { ArrowLeft, ArrowRight, Check, Coins, Sparkles } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useGame } from '../../hooks/useGame'
import { useMemo, useRef, useState } from 'react'
import { WELCOME_EVENT, normalizeCharacterName, randomCharacterConfig } from '../../lib/game'
import { Anamnese } from '../../pages/Anamnese'
import { Avatar } from './Avatar'
import { CharacterEditor } from './CharacterEditor'

export const GOALS = [
  'Abnehmen',
  'Muskeln aufbauen',
  'Fitter werden',
  'Gesünder essen',
  'Besser schlafen',
  'Stress abbauen',
  'Sportlich besser werden',
]
export const EXPERIENCE_LEVELS = [
  'Ich fange gerade erst an',
  'Ich trainiere ab und zu',
  'Ich trainiere regelmäßig',
  'Ich bin schon lange dabei',
]
export const WEEKLY_TIME = [
  'Bis 2 Stunden pro Woche',
  '2 bis 4 Stunden pro Woche',
  '4 bis 6 Stunden pro Woche',
  'Mehr als 6 Stunden pro Woche',
]
export const DIFFICULTIES = [
  'Dranbleiben',
  'Zeit finden',
  'Gesund essen',
  'Heißhunger',
  'Genug schlafen',
  'Wissen, was ich tun soll',
  'Schmerzen oder Verletzungen',
  'Stress',
]
export function ChoiceChip({ label, on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'px-3.5 py-2 rounded-2xl border text-sm font-semibold transition-all active:scale-95',
        on
          ? 'bg-primary text-white border-brand'
          : 'bg-bg-elevated border-border text-text-secondary hover:border-brand/50 hover:text-text-primary',
      )}
    >
      {label}
    </button>
  )
}
export function RadioRow({ label, on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="radio"
      aria-checked={on}
      className={cn(
        'w-full text-left px-4 py-3 rounded-2xl border text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-between gap-3',
        on
          ? 'bg-brand/10 border-brand text-text-primary'
          : 'bg-bg-elevated border-border text-text-secondary hover:border-brand/50',
      )}
    >
      {label}
      <span
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
          on ? 'border-brand bg-primary text-white' : 'border-border-light',
        )}
      >
        {on && <Check size={12} strokeWidth={3.5} aria-hidden="true" />}
      </span>
    </button>
  )
}
export function toggleInList(e, t) {
  return e.includes(t) ? e.filter((e) => e !== t) : [...e, t]
}
export function StepBar({ step, total }) {
  return (
    <div
      className="flex gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
      aria-label={`Schritt ${step} von ${total}`}
    >
      {Array.from(
        {
          length: total,
        },
        (t, n) => (
          <span
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-500',
              n < step ? 'bg-primary' : 'bg-bg-elevated',
            )}
            key={n}
          />
        ),
      )}
    </div>
  )
}
export function Onboarding({ withAnamnese, onDone, onSkip }) {
  let { user, profile } = useAuth(),
    { createCharacter } = useGame(),
    [phase, setPhase] = useState('hallo'),
    [questionIndex, setQuestionIndex] = useState(0),
    firstName = profile?.name?.split(' ')[0] ?? '',
    storageKey = `hlx-kennenlernen-${user?.id ?? ''}`,
    [answers, setAnswers] = useState(() => {
      let e = {
        anrede: firstName,
        ziele: [],
        warum: '',
        erfahrung: '',
        zeit: '',
        schwierigkeiten: [],
      }
      try {
        return {
          ...e,
          ...(JSON.parse(localStorage.getItem(storageKey) ?? 'null') ?? {}),
        }
      } catch {
        return e
      }
    }),
    saveAnswers = () => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(answers))
      } catch {}
    },
    [figure, setFigure] = useState(() => randomCharacterConfig()),
    [figureName, setFigureName] = useState(''),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState(null),
    welcomeAvatar = useRef(null),
    doneAvatar = useRef(null),
    sampleFigure = useMemo(() => randomCharacterConfig(), []),
    canContinue =
      questionIndex === 0
        ? answers.anrede.trim().length > 0
        : questionIndex === 1
          ? answers.ziele.length > 0
          : questionIndex === 2
            ? !!answers.erfahrung && !!answers.zeit
            : answers.schwierigkeiten.length > 0
  async function finish() {
    let e = normalizeCharacterName(figureName)
    if (!e || saving) return
    ;(setSaving(true), setSaveError(null))
    let t = await createCharacter({
      name: e,
      config: figure,
      equipped: {},
      kennenlernen: {
        ...answers,
        anrede: answers.anrede.trim(),
        warum: answers.warum.trim(),
      },
    })
    if ((setSaving(false), !t)) {
      setSaveError('Das hat nicht geklappt. Prüfe deine Verbindung und versuche es noch einmal.')
      return
    }
    try {
      localStorage.removeItem(storageKey)
    } catch {}
    ;(setPhase('fertig'),
      window.setTimeout(() => {
        doneAvatar.current?.cheer()
      }, 500))
  }
  return phase === 'anamnese' && user ? (
    <Anamnese userId={user.id} onDone={() => setPhase('figur')} />
  ) : (
    <div className="max-w-lg mx-auto space-y-6" data-enter="manual">
      {phase === 'hallo' && (
        <div className="text-center space-y-5 pt-2">
          <div
            className="enter mx-auto w-fit rounded-4xl bg-gradient-to-b from-brand/10 to-transparent px-8 pt-4"
            style={{
              '--d': 0,
            }}
          >
            <Avatar
              ref={welcomeAvatar}
              config={sampleFigure}
              size={200}
              idle
              label="Eine freundliche Figur winkt dir zu"
            />
          </div>
          <div
            className="enter space-y-2"
            style={{
              '--d': 160,
            }}
          >
            <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
              Willkommen{firstName ? `, ${firstName}` : ''}!
            </h1>
            <p className="text-text-secondary leading-relaxed">
              Schön, dass du bei HLX Together dabei bist. Ich stelle dir kurz vier Fragen, damit dein Coach dich besser
              kennenlernt. Danach gestaltest du deine eigene Figur, die mit dir wächst.
            </p>
          </div>
          <div
            className="enter space-y-2"
            style={{
              '--d': 300,
            }}
          >
            <button
              onClick={() => {
                ;(setPhase('kennenlernen'), setQuestionIndex(0))
              }}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Los geht’s <ArrowRight size={18} aria-hidden="true" />
            </button>
            {onSkip && (
              <button
                onClick={onSkip}
                className="w-full py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary"
              >
                Später
              </button>
            )}
          </div>
        </div>
      )}
      {phase === 'kennenlernen' && (
        <div className="space-y-6">
          <StepBar step={questionIndex + 1} total={4} />
          <div
            className="enter space-y-5"
            style={{
              '--d': 0,
            }}
            key={questionIndex}
          >
            {questionIndex === 0 && (
              <>
                <div>
                  <h2 className="text-2xl font-extrabold text-text-primary">Wie sollen wir dich nennen?</h2>
                  <p className="text-sm text-text-secondary mt-1">
                    Dein Vorname oder ein Spitzname, so sprechen wir dich an.
                  </p>
                </div>
                <div>
                  <label htmlFor="k-anrede" className="label">
                    Name
                  </label>
                  <input
                    id="k-anrede"
                    className="input"
                    maxLength={30}
                    value={answers.anrede}
                    autoFocus
                    autoComplete="given-name"
                    onChange={(e) =>
                      setAnswers({
                        ...answers,
                        anrede: e.target.value,
                      })
                    }
                    placeholder="z. B. Lena"
                  />
                </div>
              </>
            )}
            {questionIndex === 1 && (
              <>
                <div>
                  <h2 className="text-2xl font-extrabold text-text-primary">Was möchtest du erreichen?</h2>
                  <p className="text-sm text-text-secondary mt-1">Du kannst mehrere wählen.</p>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Ziele">
                  {GOALS.map((e) => (
                    <ChoiceChip
                      label={e}
                      on={answers.ziele.includes(e)}
                      onClick={() =>
                        setAnswers({
                          ...answers,
                          ziele: toggleInList(answers.ziele, e),
                        })
                      }
                      key={e}
                    />
                  ))}
                </div>
                <div>
                  <label htmlFor="k-warum" className="label">
                    Warum ist dir das wichtig? (freiwillig)
                  </label>
                  <textarea
                    id="k-warum"
                    className="input min-h-[88px]"
                    maxLength={240}
                    value={answers.warum}
                    onChange={(e) =>
                      setAnswers({
                        ...answers,
                        warum: e.target.value,
                      })
                    }
                    placeholder="Zum Beispiel: Ich will mich wieder wohler fühlen."
                  />
                </div>
              </>
            )}
            {questionIndex === 2 && (
              <>
                <h2 className="text-2xl font-extrabold text-text-primary">Wie sieht es mit Training aus?</h2>
                <div className="space-y-2" role="radiogroup" aria-label="Erfahrung">
                  {EXPERIENCE_LEVELS.map((e) => (
                    <RadioRow
                      label={e}
                      on={answers.erfahrung === e}
                      onClick={() =>
                        setAnswers({
                          ...answers,
                          erfahrung: e,
                        })
                      }
                      key={e}
                    />
                  ))}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-secondary mb-2">Wie viel Zeit hast du pro Woche?</div>
                  <div className="space-y-2" role="radiogroup" aria-label="Zeit pro Woche">
                    {WEEKLY_TIME.map((e) => (
                      <RadioRow
                        label={e}
                        on={answers.zeit === e}
                        onClick={() =>
                          setAnswers({
                            ...answers,
                            zeit: e,
                          })
                        }
                        key={e}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
            {questionIndex === 3 && (
              <>
                <div>
                  <h2 className="text-2xl font-extrabold text-text-primary">Was fällt dir schwer?</h2>
                  <p className="text-sm text-text-secondary mt-1">
                    Dann kann dein Coach genau da helfen. Mehrere sind erlaubt.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Was fällt schwer">
                  {DIFFICULTIES.map((e) => (
                    <ChoiceChip
                      label={e}
                      on={answers.schwierigkeiten.includes(e)}
                      onClick={() =>
                        setAnswers({
                          ...answers,
                          schwierigkeiten: toggleInList(answers.schwierigkeiten, e),
                        })
                      }
                      key={e}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => (questionIndex === 0 ? setPhase('hallo') : setQuestionIndex(questionIndex - 1))}
              aria-label="Zurück"
              className="w-12 rounded-2xl bg-bg-elevated border border-border-input text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <button
              disabled={!canContinue}
              onClick={() => {
                if (questionIndex < 3) {
                  setQuestionIndex(questionIndex + 1)
                  return
                }
                ;(saveAnswers(), setPhase(withAnamnese ? 'anamnese' : 'figur'))
              }}
              className="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {questionIndex < 3 ? 'Weiter' : withAnamnese ? 'Weiter zur Anamnese' : 'Weiter zur Figur'}{' '}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      {phase === 'figur' && (
        <div className="space-y-5">
          <div>
            <h2
              className="enter text-2xl font-extrabold text-text-primary"
              style={{
                '--d': 0,
              }}
            >
              Gestalte deine Figur
            </h2>
            <p
              className="enter text-sm text-text-secondary mt-1"
              style={{
                '--d': 80,
              }}
            >
              Sie begleitet dich, sammelt mit dir XP und steigt im Level auf. Gib ihr einen Namen.
            </p>
          </div>
          <CharacterEditor config={figure} name={figureName} onConfig={setFigure} onName={setFigureName} />
          {saveError && (
            <p role="alert" className="text-sm text-danger">
              {saveError}
            </p>
          )}
          <button
            onClick={finish}
            disabled={!normalizeCharacterName(figureName) || saving}
            className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles size={18} aria-hidden="true" /> {saving ? 'Wird gespeichert …' : 'Figur fertig'}
          </button>
        </div>
      )}
      {phase === 'fertig' && (
        <div className="text-center space-y-5 pt-2">
          <div className="pop-in mx-auto w-fit rounded-4xl bg-gradient-to-b from-brand/10 to-transparent px-8 pt-4">
            <Avatar
              ref={doneAvatar}
              config={figure}
              size={210}
              idle
              label={`${normalizeCharacterName(figureName)} freut sich`}
            />
          </div>
          <div
            className="enter space-y-2"
            style={{
              '--d': 200,
            }}
          >
            <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
              Das ist {normalizeCharacterName(figureName)}!
            </h1>
            <p className="text-text-secondary">Zum Start schenken wir euch ein paar Punkte für den Shop.</p>
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-warning/15 text-warning font-extrabold tabular-nums">
              <Coins size={18} aria-hidden="true" /> +{WELCOME_EVENT.punkte} Punkte
            </div>
          </div>
          <button
            onClick={onDone}
            className="enter btn-primary w-full"
            style={{
              '--d': 420,
            }}
          >
            Auf geht’s
          </button>
        </div>
      )}
    </div>
  )
}
