import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Dumbbell, ChevronDown, ChevronUp, Timer, Flame, Activity, BookOpen, Camera, Sparkles, X, Pencil, HelpCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate, todayISO } from '../lib/utils'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import type { TrainingEntry, UebungEntry } from '../types/database'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const TRAINING_TYPES = ['Kraft', 'Cardio', 'HIIT', 'Yoga', 'Stretching', 'Schwimmen', 'Radfahren', 'Laufen', 'Sonstiges']

interface TrainingWithExercises extends TrainingEntry {
  uebungen?: UebungEntry[]
  expanded?: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card !p-3 text-xs">
      <div className="text-text-muted mb-1">{label}</div>
      <div className="text-text-primary font-bold">{payload[0]?.value} min</div>
    </div>
  )
}

interface UebungTip {
  muskel: string
  sekundaer: string
  warum: string
  muskeln: string[]
  tipps: string[]
  fehler: string[]
}

const UEBUNG_TIPS: Record<string, UebungTip> = {
  'bankdrücken': {
    muskel: 'Brust (Pectoralis)', sekundaer: 'Trizeps · Vordere Schulter',
    warum: 'Die effektivste Übung für Brustaufbau und Oberkörperkraft. Aktiviert gleichzeitig Brust, Schultern und Trizeps – ideal für Masse und Maximalkraft.',
    muskeln: ['chest', 'tricep', 'shoulder'],
    tipps: ['Schulterblätter zusammenziehen und in die Bank drücken', 'Rücken leicht gewölbt, Füße flach am Boden', 'Griffbreite: Oberarm 90° zur Stange', 'Stange zur unteren Brust führen (Brustwarzen-Linie)', 'Ellenbogen 45–75° vom Körper – nicht komplett aufspreizen'],
    fehler: ['Schultern hochziehen (Verletzungsrisiko)', 'Ellenbogen zu weit aufspreizen (Schulter-Impingement)', 'Stange unkontrolliert fallen lassen', 'Füße in die Luft strecken (Stabilitätsverlust)'],
  },
  'kniebeuge': {
    muskel: 'Quadrizeps · Gesäß (Gluteus)', sekundaer: 'Hamstrings · Core · Rückenstrecker',
    warum: 'Die „Königin der Übungen" – aktiviert mehr Muskelmasse als fast jede andere Übung. Fördert Hormonausschüttung, Kraft und Muskelaufbau im gesamten Körper.',
    muskeln: ['quad', 'glute', 'ham', 'lback', 'abs'],
    tipps: ['Stange auf dem Trapezmuskel, nicht auf dem Nacken', 'Füße schulterbreit, Zehen 15–30° auswärts', 'Knie zeigen immer in Richtung der Zehen', 'Mindestens bis zur Parallele, besser tiefer', 'Blick geradeaus, Rücken neutral – kein Rundrücken', 'Aus den Fersen herausdrücken beim Aufstehen'],
    fehler: ['Knie nach innen fallen lassen (Valgus-Stellung)', 'Zu wenig Tiefe – Muskel nicht voll aktiviert', 'Rundrücken – Bandscheiben werden belastet', 'Fersen heben (Beweglichkeit trainieren)'],
  },
  'kreuzheben': {
    muskel: 'Rückenstrecker · Gesäß', sekundaer: 'Hamstrings · Trapez · Core',
    warum: 'Trainiert die gesamte hintere Muskelkette gleichzeitig. Essenziell für Kraft, Körperhaltung und Prävention von Rückenproblemen.',
    muskeln: ['lback', 'glute', 'ham', 'trap'],
    tipps: ['Stange über dem Mittelfuß positionieren', 'Schulterblätter einziehen bevor du hebst', 'Rücken gerade, Brust raus, Blick nach vorne-unten', 'Stange nah am Körper führen – fast schaben', 'Hüfte und Knie gleichzeitig strecken', 'Oben Hüfte durchdrücken, Gesäß anspannen'],
    fehler: ['Rundrücken – besonders im unteren Rücken gefährlich', 'Stange vom Körper wegschwingen lassen', 'Mit dem Rücken hochreißen statt Beine nutzen'],
  },
  'klimmzug': {
    muskel: 'Latissimus (Rücken)', sekundaer: 'Bizeps · Trapez · hintere Schulter',
    warum: 'Ultimatives Rückentraining für einen breiten V-förmigen Latissimus. Einer der besten Indikatoren für Kraft-zu-Körpergewicht-Ratio.',
    muskeln: ['lat', 'bicep', 'trap'],
    tipps: ['Schulterblätter zuerst einziehen, dann hochziehen', 'Ellenbogen führen nach unten-hinten', 'Brust zur Stange, Oberkörper leicht nach hinten', 'Oben kurz halten – Rücken vollständig anspannen', 'Langsam absenken (3–4 Sek.) – exzentrische Phase nutzen'],
    fehler: ['Nur mit Armen ziehen statt Rücken zu aktivieren', 'Zu schnell und schwingen', 'Nicht vollständig strecken in unterer Position'],
  },
  'pull up': {
    muskel: 'Latissimus (Rücken)', sekundaer: 'Bizeps · Trapez · hintere Schulter',
    warum: 'Ultimatives Rückentraining für einen breiten V-förmigen Latissimus. Einer der besten Indikatoren für Kraft-zu-Körpergewicht-Ratio.',
    muskeln: ['lat', 'bicep', 'trap'],
    tipps: ['Schulterblätter zuerst einziehen, dann hochziehen', 'Ellenbogen führen nach unten-hinten', 'Brust zur Stange, Oberkörper leicht nach hinten', 'Oben kurz halten – Rücken vollständig anspannen', 'Langsam absenken (3–4 Sek.) – exzentrische Phase nutzen'],
    fehler: ['Nur mit Armen ziehen statt Rücken zu aktivieren', 'Zu schnell und schwingen', 'Nicht vollständig strecken in unterer Position'],
  },
  'wide pull up': {
    muskel: 'Latissimus (breite Schicht)', sekundaer: 'Trapez · hintere Schulter',
    warum: 'Weiter Griff betont die äußeren Lats und erzeugt maximale Rückenbreite. Intensiver als normaler Klimmzug, weniger Bizeps-Beteiligung.',
    muskeln: ['lat', 'trap', 'shoulder'],
    tipps: ['Griffbreite: ca. 1,5× Schulterbreite', 'Schulterblätter aktiv einziehen vor dem Hochziehen', 'Oberkörper leicht nach hinten lehnen', 'Pause oben – Rücken maximal anspannen', 'Kontrolliert absenken'],
    fehler: ['Zu breiter Griff (Schultergelenk belastet)', 'Schultern nicht aktivieren', 'Zu viel Schwung'],
  },
  'schulterdrücken': {
    muskel: 'Schultern (Deltamuskel)', sekundaer: 'Trizeps · Trapez · Core',
    warum: 'Die Grundübung für massive Schultern. Belastet den vorderen und seitlichen Deltamuskel maximal und entwickelt Überkopfkraft.',
    muskeln: ['shoulder', 'tricep', 'trap'],
    tipps: ['Stange VOR dem Kopf drücken – nie dahinter', 'Core fest anspannen, kein starkes Hohlkreuz', 'Ellenbogen leicht nach vorne-außen', 'Vollständige Streckung am Ende oben', 'Stange kontrolliert zur Brust absenken'],
    fehler: ['Hinter dem Kopf drücken – Nacken belastet', 'Starkes Hohlkreuz – Lendenwirbel gefährdet', 'Ellenbogen zu weit nach außen klappen'],
  },
  'rudern': {
    muskel: 'Oberer Rücken (Rhomboid, Trapez)', sekundaer: 'Latissimus · Bizeps · hintere Schulter',
    warum: 'Essenziell für gesunde Körperhaltung und gleicht Drückübungen aus. Kräftigt die obere Rückenmuskulatur und verbessert die Schultergesundheit langfristig.',
    muskeln: ['lat', 'trap', 'bicep', 'shoulder'],
    tipps: ['Oberkörper ca. 45° nach vorne neigen, Rücken gerade', 'Ellenbogen eng am Körper führen', 'Stange zum Bauch ziehen, nicht zur Brust', 'Am Ende Schulterblätter kräftig zusammenkneifen', 'Langsam strecken – exzentrische Phase nutzen'],
    fehler: ['Rücken rund – Bandscheiben belastet', 'Mit dem Rücken Schwung holen', 'Stange zu weit oben zur Brust ziehen'],
  },
  'bizeps curl': {
    muskel: 'Bizeps (Brachii)', sekundaer: 'Brachialis · Unterarmbeuger',
    warum: 'Isoliert den Bizeps direkt und ist die effektivste Übung für sichtbaren Armaufbau. Ermöglicht Peak-Kontraktion und maximales Muskelgefühl.',
    muskeln: ['bicep'],
    tipps: ['Ellenbogen bleibt fest am Körper – kein Schwingen', 'Volle Bewegungsamplitude: ganz strecken, ganz beugen', 'Oben 1–2 Sek. halten und anspannen', 'Langsam absenken (2–3 Sek.) – exzentrischer Vorteil'],
    fehler: ['Schwingen mit dem Oberkörper', 'Ellenbogen weg vom Körper – Schulter übernimmt', 'Zu schnell absenken'],
  },
  'trizepsdrücken': {
    muskel: 'Trizeps (Brachii)', sekundaer: 'Unterarmstrecker',
    warum: 'Trizeps macht 2/3 des Armvolumens aus! Isoliert alle 3 Köpfe und ist entscheidend für große Arme und starke Drückbewegungen.',
    muskeln: ['tricep'],
    tipps: ['Ellenbogen zeigen nach vorne-oben, fixiert', 'Nur der Unterarm bewegt sich', 'Volle Streckung am Ende durchdrücken', 'Langsam und kontrolliert zurückführen'],
    fehler: ['Ellenbogen schwingen oder ausweichen', 'Nicht vollständig strecken', 'Zu schweres Gewicht mit Schwung'],
  },
  'beinstrecken': {
    muskel: 'Quadrizeps (4-köpfiger Oberschenkelmuskel)', sekundaer: 'Kniestabilisatoren',
    warum: 'Isoliert den Quadrizeps direkt und hilft bei der Formgebung des Oberschenkels. Ideal für Kniestabilität und als Ergänzung zu Kniebeugen.',
    muskeln: ['quad'],
    tipps: ['Rücken fest an der Lehne, Hüfte nicht heben', 'Volle Streckung – Knie komplett durchdrücken', 'Oben 1–2 Sek. halten und anspannen', 'Langsam absenken (3 Sek.)'],
    fehler: ['Hüfte hebt – Core kompensiert', 'Zu schnell und schwungvoll', 'Knie nicht voll strecken'],
  },
  'beinbeugen': {
    muskel: 'Hamstrings (Rückseite Oberschenkel)', sekundaer: 'Gluteus · Waden',
    warum: 'Trainiert die Hamstrings isoliert, die bei Kniebeugen und Kreuzheben oft vernachlässigt werden. Wichtig für Verletzungsprävention und Beinbalance.',
    muskeln: ['ham', 'glute', 'calf'],
    tipps: ['Hüfte bleibt fest auf der Maschine', 'Volle Beugung – Ferse zur Gesäßfalte', 'Oben kurz halten und anspannen', 'Langsam strecken – exzentrische Phase nutzen'],
    fehler: ['Hüfte hebt sich beim Ziehen', 'Zu schnell und ruckartig', 'Nicht voll strecken in der Ausgangsposition'],
  },
  'laufen': {
    muskel: 'Herz-Kreislauf-System', sekundaer: 'Quadrizeps · Hamstrings · Waden',
    warum: 'Eine der effektivsten Cardio-Formen: verbessert Ausdauer, verbrennt Kalorien, stärkt das Herz und fördert mentale Gesundheit durch Endorphinausschüttung.',
    muskeln: ['quad', 'ham', 'calf'],
    tipps: ['Aufrechte Körperhaltung, Blick geradeaus', 'Schrittfrequenz: 170–180 Schritte/Min', 'Weich auftreten – Mittelfuß bevorzugt', 'Arme entspannt, 90° gebeugt', 'Puls im Zielbereich halten (60–80% max HR)'],
    fehler: ['Zu lange Schritte – Knie belastet', 'Oberkörper zu stark nach vorne beugen', 'Zu schnell starten ohne Aufwärmen'],
  },
  'laufband': {
    muskel: 'Herz-Kreislauf-System', sekundaer: 'Quadrizeps · Hamstrings · Waden',
    warum: 'Kontrolliertes Cardio-Training bei jedem Wetter. Einstellbare Neigung ermöglicht intensiveres Training und besseren Calorie-Burn.',
    muskeln: ['quad', 'ham', 'calf'],
    tipps: ['Neigung 1–2% simuliert Outdoor-Bedingungen', 'Nicht am Handlauf festhalten', 'Puls: 60–80% der max. Herzfrequenz', 'Warmup 3–5 Min langsam beginnen', 'Cooldown: mind. 3 Min langsam gehen'],
    fehler: ['Am Handlauf festhalten – Intensität sinkt', 'Zu schnell für das aktuelle Fitnesslevel', 'Ohne Aufwärmen direkt Vollgas'],
  },
  'fahrrad': {
    muskel: 'Quadrizeps · Waden', sekundaer: 'Hamstrings · Gesäß · Herz-Kreislauf',
    warum: 'Schont die Gelenke und trainiert gleichzeitig Ausdauer und Unterkörperkraft. Ideal für Fettverbrennung und gelenkschonendes Cardio.',
    muskeln: ['quad', 'ham', 'calf', 'glute'],
    tipps: ['Sattel auf Hüfthöhe einstellen', 'Knie leicht gebeugt in unterer Pedalposition', 'Gleichmäßige Trittfrequenz: 80–100 RPM', 'Oberkörper entspannt, kein Verkrampfen'],
    fehler: ['Sattel zu niedrig – Knie überlastet', 'Zu langsame Trittfrequenz mit hohem Widerstand'],
  },
  'plank': {
    muskel: 'Core (Transversus Abdominis)', sekundaer: 'Unterer Rücken · Gesäß · Schultern',
    warum: 'Beste Übung für tiefen Core-Aufbau. Ein starker Core schützt die Wirbelsäule, verbessert Körperhaltung und stabilisiert alle anderen Übungen.',
    muskeln: ['abs', 'lback', 'glute', 'shoulder'],
    tipps: ['Körper bildet eine gerade Linie von Kopf bis Ferse', 'Gesäß nicht hochstrecken oder durchhängen', 'Bauch aktiv einziehen und anspannen', 'Schultern über den Ellenbogen', 'Gleichmäßig atmen – nicht die Luft anhalten'],
    fehler: ['Gesäß hochstrecken – Core wird entlastet', 'Hüfte durchhängen – Lendenwirbel belastet', 'Schultern hochziehen zum Ohr'],
  },
  'dips': {
    muskel: 'Trizeps', sekundaer: 'Brust · Vordere Schulter',
    warum: 'Kraftklassiker für Trizeps und Oberkörper. Je nach Körperneigung Fokus auf Trizeps (aufrecht) oder Brust (geneigt) – sehr vielseitig.',
    muskeln: ['tricep', 'chest', 'shoulder'],
    tipps: ['Aufrecht = mehr Trizeps', 'Nach vorne geneigt = mehr Brust', 'Tief gehen: bis Ellenbogen 90° gebeugt', 'Schultern nicht hochziehen', 'Kontrolliert absenken'],
    fehler: ['Schultern hochziehen – Rotatorenmanschette belastet', 'Zu wenig Tiefe – Muskel nicht vollständig aktiviert'],
  },
  'seitheben': {
    muskel: 'Seitlicher Deltamuskel (Medial)', sekundaer: 'Vorderer Deltamuskel · Trapez',
    warum: 'Formt die Schulterbreite und gibt dem Oberkörper die athletische V-Form. Der seitliche Delta wird bei Drücken kaum trainiert – Seitheben ist deshalb unverzichtbar.',
    muskeln: ['shoulder'],
    tipps: ['Arme seitlich bis Schulterhöhe heben', 'Ellenbogen leicht gebeugt', 'Daumen leicht nach unten (innere Rotation)', 'Keine Schulterhochzüge', 'Sehr langsam und kontrolliert – kein Schwung!'],
    fehler: ['Zu viel Gewicht mit Schwung heben', 'Schultern hochziehen', 'Arme über Schulterniveau heben'],
  },
  'liegestützen': {
    muskel: 'Brust (Pectoralis)', sekundaer: 'Trizeps · Vordere Schulter · Core',
    warum: 'Universellste Oberkörperübung – überall ohne Equipment. Trainiert Brust, Trizeps und Schultern gleichzeitig und stärkt dazu den Core.',
    muskeln: ['chest', 'tricep', 'shoulder', 'abs'],
    tipps: ['Körper wie ein Brett: gerade Linie von Kopf bis Ferse', 'Ellenbogen ca. 45° vom Körper', 'Brust berührt fast den Boden', 'Vollständige Streckung am Ende'],
    fehler: ['Hüfte hängt durch oder ist hochgestreckt', 'Nur halbe Bewegungsamplitude', 'Ellenbogen komplett seitwärts aufspreizen'],
  },
}

function getTip(name: string): UebungTip | null {
  const key = name.toLowerCase().trim()
  return UEBUNG_TIPS[key] ?? null
}

// ─── Exercise GIF (free-exercise-db, CC BY-SA 3.0 Everkinetic) ───────────────

// Maps German exercise key → folder name in yuhonas/free-exercise-db
const EXERCISE_IMGS: Record<string, string> = {
  'bankdrücken':     'Barbell_Bench_Press_-_Medium_Grip',
  'kniebeuge':       'Barbell_Full_Squat',
  'kreuzheben':      'Barbell_Deadlift',
  'klimmzug':        'Pullups',
  'pull up':         'Pullups',
  'wide pull up':    'Wide-Grip_Pullup',
  'schulterdrücken': 'Barbell_Shoulder_Press',
  'rudern':          'Bent_Over_Barbell_Row',
  'bizeps curl':     'Barbell_Curl',
  'trizepsdrücken':  'Tricep_Dips_Between_Benches',
  'beinstrecken':    'Leg_Extensions',
  'beinbeugen':      'Seated_Leg_Curl',
  'plank':           'Plank',
  'dips':            'Dips',
  'seitheben':       'Side_Lateral_Raise',
  'liegestützen':    'Push_Ups',
  'laufen':          'Running,_Treadmill',
  'laufband':        'Running,_Treadmill',
  'fahrrad':         'Stationary_Bike',
}

const GIF_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

function ExerciseGif({ exerciseKey }: { exerciseKey: string }) {
  const folder = EXERCISE_IMGS[exerciseKey]
  const [frame, setFrame] = useState(0)
  const [loaded, setLoaded] = useState([false, false])
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!folder || hasError) return
    const t = setInterval(() => setFrame(f => (f + 1) % 2), 1400)
    return () => clearInterval(t)
  }, [folder, hasError])

  if (!folder || hasError) return null

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-bg-elevated" style={{ aspectRatio: '4/3' }}>
      {[0, 1].map(i => (
        <img
          key={i}
          src={`${GIF_BASE}/${folder}/${i}.jpg`}
          alt=""
          onLoad={() => setLoaded(l => { const n = [...l]; n[i] = true; return n })}
          onError={() => setHasError(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: frame === i && loaded[i] ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        />
      ))}
      {!loaded[0] && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

// ─── Exercise Tip Modal ───────────────────────────────────────────────────────

const MUSKEL_LABELS: Record<string, string> = {
  chest: 'Brust', shoulder: 'Schultern', bicep: 'Bizeps', tricep: 'Trizeps',
  trap: 'Trapez', lat: 'Latissimus', lback: 'Unterer Rücken', abs: 'Core',
  quad: 'Quadrizeps', ham: 'Hamstrings', glute: 'Gesäß', calf: 'Waden',
}

function UebungTipModal({ name, onClose }: { name: string; onClose: () => void }) {
  const tip = getTip(name)
  const key = name.toLowerCase().trim()
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' richtige Ausführung Technik')}`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-bg-card rounded-2xl border border-border w-full max-w-sm overflow-y-auto"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4">
          <div>
            <div className="font-bold text-text-primary capitalize text-base">{name}</div>
            {tip && (
              <>
                <div className="text-xs text-primary font-medium mt-0.5">{tip.muskel}</div>
                <div className="text-xs text-text-muted">{tip.sekundaer}</div>
              </>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted shrink-0 ml-3"><X size={16} /></button>
        </div>

        <div className="px-5 pb-6 space-y-5">
          {/* GIF Animation */}
          <ExerciseGif exerciseKey={key} />

          {tip ? (
            <>
              {/* Muscle chips */}
              <div className="flex flex-wrap gap-1.5">
                {tip.muskeln.map(m => (
                  <span key={m} className="text-[11px] px-2.5 py-1 rounded-full bg-primary/20 text-primary font-medium">
                    {MUSKEL_LABELS[m] ?? m}
                  </span>
                ))}
              </div>

              {/* Warum */}
              <div>
                <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Warum diese Übung?</div>
                <p className="text-sm text-text-secondary leading-relaxed">{tip.warum}</p>
              </div>

              {/* Ausführung */}
              <div>
                <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Richtige Ausführung</div>
                <ul className="space-y-2">
                  {tip.tipps.map((t, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-text-secondary">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Fehler */}
              <div>
                <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Häufige Fehler</div>
                <ul className="space-y-1.5">
                  {tip.fehler.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm text-text-secondary">
                      <span className="text-danger shrink-0">✕</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="text-sm text-text-muted">Für <span className="text-text-primary font-medium">"{name}"</span> sind noch keine Tipps hinterlegt.</p>
          )}

          {/* YouTube */}
          <a href={ytUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 text-sm text-text-secondary hover:text-primary transition-colors">
            <span>▶</span> Videodemonstration ansehen
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Uebung Form ─────────────────────────────────────────────────────────────

type UebungFormEntry = { uebungsname: string; saetze: string; wdh: string; gewicht_kg: string; notizen: string }
function UebungForm({ entries, onChange }: {
  entries: UebungFormEntry[]
  onChange: (entries: UebungFormEntry[]) => void
}) {
  const [tipFor, setTipFor] = useState<string | null>(null)

  function add() {
    onChange([...entries, { uebungsname: '', saetze: '', wdh: '', gewicht_kg: '', notizen: '' }])
  }
  function remove(i: number) {
    onChange(entries.filter((_, idx) => idx !== i))
  }
  function update(i: number, field: string, val: string) {
    const next = [...entries]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {tipFor && <UebungTipModal name={tipFor} onClose={() => setTipFor(null)} />}

      {entries.map((e, i) => (
        <div key={i} className="p-3 bg-bg-elevated rounded-lg space-y-2">
          <div className="flex gap-2">
            <input className="input flex-1 text-sm py-2" placeholder="Übungsname" value={e.uebungsname} onChange={ev => update(i, 'uebungsname', ev.target.value)} />
            <button onClick={() => setTipFor(e.uebungsname || null)} title="Tipps anzeigen"
              className="p-2 rounded-lg border border-border hover:bg-primary/10 hover:text-primary text-text-muted transition-colors">
              <HelpCircle size={14} />
            </button>
            <button onClick={() => remove(i)} className="p-2 rounded-lg hover:bg-danger/10 hover:text-danger text-text-muted"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Sätze</label>
              <input type="number" className="input text-sm py-2" placeholder="3" value={e.saetze} onChange={ev => update(i, 'saetze', ev.target.value)} />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Wdh.</label>
              <input type="number" className="input text-sm py-2" placeholder="10" value={e.wdh} onChange={ev => update(i, 'wdh', ev.target.value)} />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Gewicht (kg)</label>
              <input type="number" step="0.5" className="input text-sm py-2" placeholder="80" value={e.gewicht_kg} onChange={ev => update(i, 'gewicht_kg', ev.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button onClick={add} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
        <Plus size={14} /> Übung hinzufügen
      </button>
    </div>
  )
}

export function Training() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<TrainingWithExercises[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [vorlagen, setVorlagen] = useState<any[]>([])
  const [selectedVorlage, setSelectedVorlage] = useState('')
  const [form, setForm] = useState({
    datum: todayISO(), trainingstyp: 'Kraft', dauer_h: '0', dauer_m: '0', avg_puls: '', kalorien_verbrannt: '', notizen: '',
  })
  const [uebungen, setUebungen] = useState<{ uebungsname: string; saetze: string; wdh: string; gewicht_kg: string; notizen: string }[]>([])

  async function load() {
    if (!user) return
    const { data } = await supabase.from('training').select('*').eq('user_id', user.id).order('datum', { ascending: false })
    const trainings = (data ?? []) as TrainingWithExercises[]
    // Load exercises for each training
    const ids = trainings.map(t => t.id)
    if (ids.length) {
      const { data: ex } = await supabase.from('uebungen').select('*').in('training_id', ids)
      const exMap = (ex ?? []).reduce<Record<string, UebungEntry[]>>((acc, e) => {
        if (!acc[e.training_id]) acc[e.training_id] = []
        acc[e.training_id].push(e)
        return acc
      }, {})
      trainings.forEach(t => { t.uebungen = exMap[t.id] ?? [] })
    }
    setEntries(trainings)
    setLoading(false)
  }

  async function loadVorlagen() {
    if (!user) return
    const { data: vData } = await supabase.from('training_vorlagen').select('*').eq('user_id', user.id)
    if (!vData?.length) return
    const { data: uData } = await supabase.from('vorlagen_uebungen').select('*').in('vorlage_id', vData.map((v: any) => v.id)).order('reihenfolge')
    const uMap = (uData ?? []).reduce<Record<string, any[]>>((acc, u: any) => {
      if (!acc[u.vorlage_id]) acc[u.vorlage_id] = []
      acc[u.vorlage_id].push(u)
      return acc
    }, {})
    setVorlagen(vData.map((v: any) => ({ ...v, uebungen: uMap[v.id] ?? [] })))
  }

  function applyVorlage(vorlageId: string) {
    const v = vorlagen.find(x => x.id === vorlageId)
    if (!v) return
    setForm(f => ({ ...f, trainingstyp: v.trainingstyp ?? f.trainingstyp }))
    setUebungen(v.uebungen.map((u: any) => ({
      uebungsname: u.uebungsname,
      saetze: String(u.saetze ?? ''),
      wdh: String(u.wdh ?? ''),
      gewicht_kg: String(u.gewicht_kg ?? ''),
      notizen: '',
    })))
    setSelectedVorlage(vorlageId)
  }

  useEffect(() => { load(); loadVorlagen() }, [user])

  async function analyzePhoto(file: File) {
    setAnalyzing(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      setPhotoPreview(reader.result as string)
      try {
        const { data } = await supabase.functions.invoke('analyze-screenshot', {
          body: { imageBase64: base64, mimeType: file.type, context: 'training' },
        })
        if (data?.result) {
          const r = data.result
          setForm(f => ({
            ...f,
            dauer_h: r.dauer_min ? String(Math.floor(r.dauer_min / 60)) : f.dauer_h,
            dauer_m: r.dauer_min ? String(r.dauer_min % 60) : f.dauer_m,
            avg_puls: r.avg_puls ? String(r.avg_puls) : f.avg_puls,
            kalorien_verbrannt: r.kalorien_verbrannt ? String(r.kalorien_verbrannt) : f.kalorien_verbrannt,
            trainingstyp: r.trainingstyp && TRAINING_TYPES.includes(r.trainingstyp) ? r.trainingstyp : f.trainingstyp,
            notizen: r.notizen || f.notizen,
          }))
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : ''
        alert(msg.includes('429') ? 'Zu viele Anfragen – bitte kurz warten und erneut versuchen.' : 'Foto-Analyse fehlgeschlagen. Bitte erneut versuchen.')
      }
      setAnalyzing(false)
    }
    reader.readAsDataURL(file)
  }

  function toggleExpand(id: string) {
    setEntries(e => e.map(t => t.id === id ? { ...t, expanded: !t.expanded } : t))
  }

  function openEdit(t: TrainingWithExercises) {
    setEditingId(t.id)
    setForm({
      datum: t.datum,
      trainingstyp: t.trainingstyp ?? 'Kraft',
      dauer_h: t.dauer_min ? String(Math.floor(t.dauer_min / 60)) : '0',
      dauer_m: t.dauer_min ? String(t.dauer_min % 60) : '0',
      avg_puls: t.avg_puls ? String(t.avg_puls) : '',
      kalorien_verbrannt: t.kalorien_verbrannt ? String(t.kalorien_verbrannt) : '',
      notizen: t.notizen ?? '',
    })
    setUebungen(t.uebungen?.map(u => ({
      uebungsname: u.uebungsname,
      saetze: u.saetze ? String(u.saetze) : '',
      wdh: u.wdh ? String(u.wdh) : '',
      gewicht_kg: u.gewicht_kg ? String(u.gewicht_kg) : '',
      notizen: u.notizen ?? '',
    })) ?? [])
    setPhotoPreview(null)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditingId(null)
    setPhotoPreview(null)
    setForm({ datum: todayISO(), trainingstyp: 'Kraft', dauer_h: '0', dauer_m: '0', avg_puls: '', kalorien_verbrannt: '', notizen: '' })
    setUebungen([])
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    const totalMin = (parseInt(form.dauer_h || '0') * 60) + parseInt(form.dauer_m || '0')

    const payload = {
      datum: form.datum,
      trainingstyp: form.trainingstyp || null,
      dauer_min: totalMin > 0 ? totalMin : null,
      avg_puls: form.avg_puls ? parseInt(form.avg_puls) : null,
      kalorien_verbrannt: form.kalorien_verbrannt ? parseInt(form.kalorien_verbrannt) : null,
      notizen: form.notizen || null,
    }

    let trainingId: string

    if (editingId) {
      await supabase.from('training').update(payload).eq('id', editingId)
      trainingId = editingId
      // Replace exercises: delete old, insert new
      await supabase.from('uebungen').delete().eq('training_id', editingId)
    } else {
      const count = entries.length
      const einheit_id = `E-${String(count + 1).padStart(3, '0')}`
      const { data: training } = await supabase.from('training').insert({
        user_id: user.id, einheit_id, ...payload,
      }).select().single()
      trainingId = training!.id
    }

    if (uebungen.filter(u => u.uebungsname).length > 0) {
      await supabase.from('uebungen').insert(
        uebungen.filter(u => u.uebungsname).map(u => ({
          user_id: user.id,
          training_id: trainingId,
          uebungsname: u.uebungsname,
          saetze: u.saetze ? parseInt(u.saetze) : null,
          wdh: u.wdh ? parseInt(u.wdh) : null,
          gewicht_kg: u.gewicht_kg ? parseFloat(u.gewicht_kg) : null,
          notizen: u.notizen || null,
        }))
      )
    }

    await load()
    closeModal()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('uebungen').delete().eq('training_id', id)
    await supabase.from('training').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  const chartData = [...entries].reverse().slice(-14).map(t => ({
    datum: formatDate(t.datum, 'dd.MM'),
    dauer: t.dauer_min ?? 0,
  }))

  const totalDauer = entries.reduce((a, t) => a + (t.dauer_min ?? 0), 0)
  const avgPuls = entries.filter(t => t.avg_puls).length
    ? Math.round(entries.reduce((a, t) => a + (t.avg_puls ?? 0), 0) / entries.filter(t => t.avg_puls).length)
    : null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-2xl">Training</h1>
          <p className="text-text-secondary text-sm mt-0.5">Einheiten & Übungslog</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/training/vorlagen')} className="btn-secondary flex items-center gap-2">
            <BookOpen size={16} /> Vorlagen
          </button>
          <button onClick={() => { setEditingId(null); setForm({ datum: todayISO(), trainingstyp: 'Kraft', dauer_h: '0', dauer_m: '0', avg_puls: '', kalorien_verbrannt: '', notizen: '' }); setUebungen([]); setPhotoPreview(null); setOpen(true) }} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Einheit eintragen
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{entries.length}</div>
          <div className="text-xs text-text-muted mt-1">Einheiten gesamt</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{totalDauer > 0 ? `${Math.round(totalDauer / 60)}h` : '--'}</div>
          <div className="text-xs text-text-muted mt-1">Trainingszeit gesamt</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{avgPuls ? `${avgPuls} bpm` : '--'}</div>
          <div className="text-xs text-text-muted mt-1">Ø Herzfrequenz</div>
        </div>
      </div>

      {/* Chart */}
      {entries.length > 1 && (
        <div className="card">
          <h2 className="section-title mb-6">Trainingsdauer (letzte 14 Einheiten)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d38" vertical={false} />
              <XAxis dataKey="datum" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="dauer" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Training List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : entries.length === 0 ? (
          <div className="card">
            <EmptyState icon={Dumbbell} title="Noch keine Trainingseinheiten" description="Trage deine erste Trainingseinheit ein." />
          </div>
        ) : entries.map(t => (
          <div key={t.id} className="card">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Dumbbell size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-text-primary">{t.trainingstyp ?? 'Training'}</span>
                  <span className="badge bg-primary/10 text-primary text-xs">{t.einheit_id}</span>
                  <span className="text-xs text-text-muted">{formatDate(t.datum)}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-text-secondary">
                  {t.dauer_min && <span className="flex items-center gap-1"><Timer size={12} /> {t.dauer_min >= 60 ? `${Math.floor(t.dauer_min / 60)}h ${t.dauer_min % 60 > 0 ? `${t.dauer_min % 60}min` : ''}`.trim() : `${t.dauer_min} min`}</span>}
                  {t.avg_puls && <span className="flex items-center gap-1"><Activity size={12} /> {t.avg_puls} bpm</span>}
                  {t.kalorien_verbrannt && <span className="flex items-center gap-1"><Flame size={12} /> {t.kalorien_verbrannt} kcal</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(t.uebungen?.length ?? 0) > 0 && (
                  <button onClick={() => toggleExpand(t.id)} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors">
                    {t.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}
                <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary text-text-muted transition-colors">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg hover:bg-danger/10 hover:text-danger text-text-muted transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {t.expanded && t.uebungen && t.uebungen.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-xs font-medium text-text-muted mb-3">Übungen</div>
                <div className="space-y-2">
                  {t.uebungen.map(u => (
                    <div key={u.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-bg-elevated">
                      <span className="font-medium text-text-primary">{u.uebungsname}</span>
                      <span className="text-text-secondary text-xs">
                        {u.saetze}×{u.wdh} {u.gewicht_kg ? `@ ${u.gewicht_kg}kg` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={open} onClose={closeModal} title={editingId ? 'Trainingseinheit bearbeiten' : 'Trainingseinheit eintragen'} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Photo AI */}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) analyzePhoto(e.target.files[0]) }} />
          <div
            onClick={() => fileRef.current?.click()}
            className={`relative flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all
              ${photoPreview ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-primary/5'}`}
          >
            {photoPreview ? (
              <>
                <img src={photoPreview} alt="Workout" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  {analyzing ? (
                    <div className="flex items-center gap-2 text-sm text-primary"><Spinner size={14} /><span>Analysiere Workout...</span></div>
                  ) : (
                    <div className="text-sm text-success font-medium flex items-center gap-1.5"><Sparkles size={14} />Daten automatisch ausgefüllt</div>
                  )}
                  <div className="text-xs text-text-muted mt-0.5">Anderes Bild wählen</div>
                </div>
                <button onClick={e => { e.stopPropagation(); setPhotoPreview(null) }}
                  className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-muted transition-colors shrink-0">
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Camera size={18} className="text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                    <Sparkles size={13} className="text-accent" />
                    Apple Watch Screenshot analysieren
                  </div>
                  <div className="text-xs text-text-muted">Dauer, Kalorien & Herzfrequenz werden automatisch erkannt</div>
                </div>
              </>
            )}
          </div>
          {/* Vorlage Selector */}
          {vorlagen.length > 0 && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <label className="label text-xs text-primary">Vorlage laden</label>
              <div className="flex gap-2">
                <select
                  className="input flex-1 text-sm"
                  value={selectedVorlage}
                  onChange={e => applyVorlage(e.target.value)}
                >
                  <option value="">— Vorlage auswählen —</option>
                  {vorlagen.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.uebungen.length} Übungen)</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} />
            </div>
            <div>
              <label className="label">Trainingstyp</label>
              <select className="input" value={form.trainingstyp} onChange={e => setForm(f => ({ ...f, trainingstyp: e.target.value }))}>
                {TRAINING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Dauer</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type="number" min="0" max="23" className="input pr-8" placeholder="0" value={form.dauer_h} onChange={e => setForm(f => ({ ...f, dauer_h: e.target.value }))} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted pointer-events-none">h</span>
                </div>
                <div className="relative flex-1">
                  <input type="number" min="0" max="59" className="input pr-10" placeholder="0" value={form.dauer_m} onChange={e => setForm(f => ({ ...f, dauer_m: e.target.value }))} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted pointer-events-none">min</span>
                </div>
              </div>
            </div>
            <div>
              <label className="label">Ø Puls (bpm)</label>
              <input type="number" className="input" placeholder="140" value={form.avg_puls} onChange={e => setForm(f => ({ ...f, avg_puls: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Kalorien verbrannt</label>
              <input type="number" className="input" placeholder="450" value={form.kalorien_verbrannt} onChange={e => setForm(f => ({ ...f, kalorien_verbrannt: e.target.value }))} />
              {!form.avg_puls && !form.kalorien_verbrannt && (
                <button type="button" onClick={() => {
                  const totalMin = (parseInt(form.dauer_h || '0') * 60) + parseInt(form.dauer_m || '0')
                  const kcalPerMin: Record<string, number> = {
                    'Kraft': 6, 'Cardio': 9, 'HIIT': 12, 'Laufen': 10,
                    'Radfahren': 7, 'Schwimmen': 8, 'Yoga': 3, 'Stretching': 2, 'Sonstiges': 6,
                  }
                  const pulsMap: Record<string, number> = {
                    'Kraft': 110, 'Cardio': 145, 'HIIT': 165, 'Laufen': 150,
                    'Radfahren': 135, 'Schwimmen': 130, 'Yoga': 85, 'Stretching': 75, 'Sonstiges': 120,
                  }
                  const rate = kcalPerMin[form.trainingstyp] ?? 6
                  const kcal = totalMin > 0 ? Math.round(totalMin * rate) : 0
                  const puls = pulsMap[form.trainingstyp] ?? 120
                  setForm(f => ({ ...f, kalorien_verbrannt: kcal > 0 ? String(kcal) : f.kalorien_verbrannt, avg_puls: String(puls) }))
                }}
                  className="mt-1.5 text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  <Sparkles size={11} /> Von KI schätzen lassen
                </button>
              )}
            </div>
            <div>
              <label className="label">Notizen</label>
              <input type="text" className="input" placeholder="Optionale Notizen" value={form.notizen} onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="text-sm font-medium text-text-primary mb-3">Übungen (optional)</div>
            <UebungForm entries={uebungen} onChange={setUebungen} />
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={handleSave} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
              {saving && <Spinner size={16} />}
              Speichern
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
