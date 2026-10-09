// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { exerciseGifUrl, exerciseImageUrl, findExercise, loadExerciseData } from '../../lib/exerciseData'
import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  CircleQuestionMark,
  Dumbbell,
  Flame,
  Pencil,
  Play,
  Plus,
  Sparkles,
  StickyNote,
  Timer,
  Trash2,
  X,
} from 'lucide-react'
import { ExerciseNameInput } from '../../components/ExerciseNameInput'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { useNavigate } from 'react-router-dom'
import { formatDate, todayISO } from '../../lib/utils'
import { supabase } from '../../lib/supabase'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'

export const TQ = ['Kraft', 'Cardio', 'HIIT', 'Yoga', 'Stretching', 'Schwimmen', 'Radfahren', 'Laufen', 'Sonstiges']
export const EQ = ({ active: e, payload: t, label: n }) =>
  !e || !t?.length ? null : (
    <div className="card !p-3 text-xs">
      <div className="text-text-muted mb-1">{n}</div>
      <div className="text-text-primary font-bold">{t[0]?.value} min</div>
    </div>
  )
export const DQ = {
  bankdrücken: {
    muskel: 'Brust (Pectoralis)',
    sekundaer: 'Trizeps · Vordere Schulter',
    warum:
      'Die effektivste Übung für Brustaufbau und Oberkörperkraft. Aktiviert gleichzeitig Brust, Schultern und Trizeps – ideal für Masse und Maximalkraft.',
    muskeln: ['chest', 'tricep', 'shoulder'],
    tipps: [
      'Schulterblätter zusammenziehen und in die Bank drücken',
      'Rücken leicht gewölbt, Füße flach am Boden',
      'Griffbreite: Oberarm 90° zur Stange',
      'Stange zur unteren Brust führen (Brustwarzen-Linie)',
      'Ellenbogen 45–75° vom Körper – nicht komplett aufspreizen',
    ],
    fehler: [
      'Schultern hochziehen (Verletzungsrisiko)',
      'Ellenbogen zu weit aufspreizen (Schulter-Impingement)',
      'Stange unkontrolliert fallen lassen',
      'Füße in die Luft strecken (Stabilitätsverlust)',
    ],
  },
  kniebeuge: {
    muskel: 'Quadrizeps · Gesäß (Gluteus)',
    sekundaer: 'Hamstrings · Core · Rückenstrecker',
    warum:
      'Die „Königin der Übungen" – aktiviert mehr Muskelmasse als fast jede andere Übung. Fördert Hormonausschüttung, Kraft und Muskelaufbau im gesamten Körper.',
    muskeln: ['quad', 'glute', 'ham', 'lback', 'abs'],
    tipps: [
      'Stange auf dem Trapezmuskel, nicht auf dem Nacken',
      'Füße schulterbreit, Zehen 15–30° auswärts',
      'Knie zeigen immer in Richtung der Zehen',
      'Mindestens bis zur Parallele, besser tiefer',
      'Blick geradeaus, Rücken neutral – kein Rundrücken',
      'Aus den Fersen herausdrücken beim Aufstehen',
    ],
    fehler: [
      'Knie nach innen fallen lassen (Valgus-Stellung)',
      'Zu wenig Tiefe – Muskel nicht voll aktiviert',
      'Rundrücken – Bandscheiben werden belastet',
      'Fersen heben (Beweglichkeit trainieren)',
    ],
  },
  kreuzheben: {
    muskel: 'Rückenstrecker · Gesäß',
    sekundaer: 'Hamstrings · Trapez · Core',
    warum:
      'Trainiert die gesamte hintere Muskelkette gleichzeitig. Essenziell für Kraft, Körperhaltung und Prävention von Rückenproblemen.',
    muskeln: ['lback', 'glute', 'ham', 'trap'],
    tipps: [
      'Stange über dem Mittelfuß positionieren',
      'Schulterblätter einziehen bevor du hebst',
      'Rücken gerade, Brust raus, Blick nach vorne-unten',
      'Stange nah am Körper führen – fast schaben',
      'Hüfte und Knie gleichzeitig strecken',
      'Oben Hüfte durchdrücken, Gesäß anspannen',
    ],
    fehler: [
      'Rundrücken – besonders im unteren Rücken gefährlich',
      'Stange vom Körper wegschwingen lassen',
      'Mit dem Rücken hochreißen statt Beine nutzen',
    ],
  },
  klimmzug: {
    muskel: 'Latissimus (Rücken)',
    sekundaer: 'Bizeps · Trapez · hintere Schulter',
    warum:
      'Ultimatives Rückentraining für einen breiten V-förmigen Latissimus. Einer der besten Indikatoren für Kraft-zu-Körpergewicht-Ratio.',
    muskeln: ['lat', 'bicep', 'trap'],
    tipps: [
      'Schulterblätter zuerst einziehen, dann hochziehen',
      'Ellenbogen führen nach unten-hinten',
      'Brust zur Stange, Oberkörper leicht nach hinten',
      'Oben kurz halten – Rücken vollständig anspannen',
      'Langsam absenken (3–4 Sek.) – exzentrische Phase nutzen',
    ],
    fehler: [
      'Nur mit Armen ziehen statt Rücken zu aktivieren',
      'Zu schnell und schwingen',
      'Nicht vollständig strecken in unterer Position',
    ],
  },
  'pull up': {
    muskel: 'Latissimus (Rücken)',
    sekundaer: 'Bizeps · Trapez · hintere Schulter',
    warum:
      'Ultimatives Rückentraining für einen breiten V-förmigen Latissimus. Einer der besten Indikatoren für Kraft-zu-Körpergewicht-Ratio.',
    muskeln: ['lat', 'bicep', 'trap'],
    tipps: [
      'Schulterblätter zuerst einziehen, dann hochziehen',
      'Ellenbogen führen nach unten-hinten',
      'Brust zur Stange, Oberkörper leicht nach hinten',
      'Oben kurz halten – Rücken vollständig anspannen',
      'Langsam absenken (3–4 Sek.) – exzentrische Phase nutzen',
    ],
    fehler: [
      'Nur mit Armen ziehen statt Rücken zu aktivieren',
      'Zu schnell und schwingen',
      'Nicht vollständig strecken in unterer Position',
    ],
  },
  'wide pull up': {
    muskel: 'Latissimus (breite Schicht)',
    sekundaer: 'Trapez · hintere Schulter',
    warum:
      'Weiter Griff betont die äußeren Lats und erzeugt maximale Rückenbreite. Intensiver als normaler Klimmzug, weniger Bizeps-Beteiligung.',
    muskeln: ['lat', 'trap', 'shoulder'],
    tipps: [
      'Griffbreite: ca. 1,5× Schulterbreite',
      'Schulterblätter aktiv einziehen vor dem Hochziehen',
      'Oberkörper leicht nach hinten lehnen',
      'Pause oben – Rücken maximal anspannen',
      'Kontrolliert absenken',
    ],
    fehler: ['Zu breiter Griff (Schultergelenk belastet)', 'Schultern nicht aktivieren', 'Zu viel Schwung'],
  },
  schulterdrücken: {
    muskel: 'Schultern (Deltamuskel)',
    sekundaer: 'Trizeps · Trapez · Core',
    warum:
      'Die Grundübung für massive Schultern. Belastet den vorderen und seitlichen Deltamuskel maximal und entwickelt Überkopfkraft.',
    muskeln: ['shoulder', 'tricep', 'trap'],
    tipps: [
      'Stange VOR dem Kopf drücken – nie dahinter',
      'Core fest anspannen, kein starkes Hohlkreuz',
      'Ellenbogen leicht nach vorne-außen',
      'Vollständige Streckung am Ende oben',
      'Stange kontrolliert zur Brust absenken',
    ],
    fehler: [
      'Hinter dem Kopf drücken – Nacken belastet',
      'Starkes Hohlkreuz – Lendenwirbel gefährdet',
      'Ellenbogen zu weit nach außen klappen',
    ],
  },
  rudern: {
    muskel: 'Oberer Rücken (Rhomboid, Trapez)',
    sekundaer: 'Latissimus · Bizeps · hintere Schulter',
    warum:
      'Essenziell für gesunde Körperhaltung und gleicht Drückübungen aus. Kräftigt die obere Rückenmuskulatur und verbessert die Schultergesundheit langfristig.',
    muskeln: ['lat', 'trap', 'bicep', 'shoulder'],
    tipps: [
      'Oberkörper ca. 45° nach vorne neigen, Rücken gerade',
      'Ellenbogen eng am Körper führen',
      'Stange zum Bauch ziehen, nicht zur Brust',
      'Am Ende Schulterblätter kräftig zusammenkneifen',
      'Langsam strecken – exzentrische Phase nutzen',
    ],
    fehler: [
      'Rücken rund – Bandscheiben belastet',
      'Mit dem Rücken Schwung holen',
      'Stange zu weit oben zur Brust ziehen',
    ],
  },
  'bizeps curl': {
    muskel: 'Bizeps (Brachii)',
    sekundaer: 'Brachialis · Unterarmbeuger',
    warum:
      'Isoliert den Bizeps direkt und ist die effektivste Übung für sichtbaren Armaufbau. Ermöglicht Peak-Kontraktion und maximales Muskelgefühl.',
    muskeln: ['bicep'],
    tipps: [
      'Ellenbogen bleibt fest am Körper – kein Schwingen',
      'Volle Bewegungsamplitude: ganz strecken, ganz beugen',
      'Oben 1–2 Sek. halten und anspannen',
      'Langsam absenken (2–3 Sek.) – exzentrischer Vorteil',
    ],
    fehler: ['Schwingen mit dem Oberkörper', 'Ellenbogen weg vom Körper – Schulter übernimmt', 'Zu schnell absenken'],
  },
  trizepsdrücken: {
    muskel: 'Trizeps (Brachii)',
    sekundaer: 'Unterarmstrecker',
    warum:
      'Trizeps macht 2/3 des Armvolumens aus! Isoliert alle 3 Köpfe und ist entscheidend für große Arme und starke Drückbewegungen.',
    muskeln: ['tricep'],
    tipps: [
      'Ellenbogen zeigen nach vorne-oben, fixiert',
      'Nur der Unterarm bewegt sich',
      'Volle Streckung am Ende durchdrücken',
      'Langsam und kontrolliert zurückführen',
    ],
    fehler: ['Ellenbogen schwingen oder ausweichen', 'Nicht vollständig strecken', 'Zu schweres Gewicht mit Schwung'],
  },
  beinstrecken: {
    muskel: 'Quadrizeps (4-köpfiger Oberschenkelmuskel)',
    sekundaer: 'Kniestabilisatoren',
    warum:
      'Isoliert den Quadrizeps direkt und hilft bei der Formgebung des Oberschenkels. Ideal für Kniestabilität und als Ergänzung zu Kniebeugen.',
    muskeln: ['quad'],
    tipps: [
      'Rücken fest an der Lehne, Hüfte nicht heben',
      'Volle Streckung – Knie komplett durchdrücken',
      'Oben 1–2 Sek. halten und anspannen',
      'Langsam absenken (3 Sek.)',
    ],
    fehler: ['Hüfte hebt – Core kompensiert', 'Zu schnell und schwungvoll', 'Knie nicht voll strecken'],
  },
  beinbeugen: {
    muskel: 'Hamstrings (Rückseite Oberschenkel)',
    sekundaer: 'Gluteus · Waden',
    warum:
      'Trainiert die Hamstrings isoliert, die bei Kniebeugen und Kreuzheben oft vernachlässigt werden. Wichtig für Verletzungsprävention und Beinbalance.',
    muskeln: ['ham', 'glute', 'calf'],
    tipps: [
      'Hüfte bleibt fest auf der Maschine',
      'Volle Beugung – Ferse zur Gesäßfalte',
      'Oben kurz halten und anspannen',
      'Langsam strecken – exzentrische Phase nutzen',
    ],
    fehler: ['Hüfte hebt sich beim Ziehen', 'Zu schnell und ruckartig', 'Nicht voll strecken in der Ausgangsposition'],
  },
  laufen: {
    muskel: 'Herz-Kreislauf-System',
    sekundaer: 'Quadrizeps · Hamstrings · Waden',
    warum:
      'Eine der effektivsten Cardio-Formen: verbessert Ausdauer, verbrennt Kalorien, stärkt das Herz und fördert mentale Gesundheit durch Endorphinausschüttung.',
    muskeln: ['quad', 'ham', 'calf'],
    tipps: [
      'Aufrechte Körperhaltung, Blick geradeaus',
      'Schrittfrequenz: 170–180 Schritte/Min',
      'Weich auftreten – Mittelfuß bevorzugt',
      'Arme entspannt, 90° gebeugt',
      'Puls im Zielbereich halten (60–80% max HR)',
    ],
    fehler: [
      'Zu lange Schritte – Knie belastet',
      'Oberkörper zu stark nach vorne beugen',
      'Zu schnell starten ohne Aufwärmen',
    ],
  },
  laufband: {
    muskel: 'Herz-Kreislauf-System',
    sekundaer: 'Quadrizeps · Hamstrings · Waden',
    warum:
      'Kontrolliertes Cardio-Training bei jedem Wetter. Einstellbare Neigung ermöglicht intensiveres Training und besseren Calorie-Burn.',
    muskeln: ['quad', 'ham', 'calf'],
    tipps: [
      'Neigung 1–2% simuliert Outdoor-Bedingungen',
      'Nicht am Handlauf festhalten',
      'Puls: 60–80% der max. Herzfrequenz',
      'Warmup 3–5 Min langsam beginnen',
      'Cooldown: mind. 3 Min langsam gehen',
    ],
    fehler: [
      'Am Handlauf festhalten – Intensität sinkt',
      'Zu schnell für das aktuelle Fitnesslevel',
      'Ohne Aufwärmen direkt Vollgas',
    ],
  },
  fahrrad: {
    muskel: 'Quadrizeps · Waden',
    sekundaer: 'Hamstrings · Gesäß · Herz-Kreislauf',
    warum:
      'Schont die Gelenke und trainiert gleichzeitig Ausdauer und Unterkörperkraft. Ideal für Fettverbrennung und gelenkschonendes Cardio.',
    muskeln: ['quad', 'ham', 'calf', 'glute'],
    tipps: [
      'Sattel auf Hüfthöhe einstellen',
      'Knie leicht gebeugt in unterer Pedalposition',
      'Gleichmäßige Trittfrequenz: 80–100 RPM',
      'Oberkörper entspannt, kein Verkrampfen',
    ],
    fehler: ['Sattel zu niedrig – Knie überlastet', 'Zu langsame Trittfrequenz mit hohem Widerstand'],
  },
  plank: {
    muskel: 'Core (Transversus Abdominis)',
    sekundaer: 'Unterer Rücken · Gesäß · Schultern',
    warum:
      'Beste Übung für tiefen Core-Aufbau. Ein starker Core schützt die Wirbelsäule, verbessert Körperhaltung und stabilisiert alle anderen Übungen.',
    muskeln: ['abs', 'lback', 'glute', 'shoulder'],
    tipps: [
      'Körper bildet eine gerade Linie von Kopf bis Ferse',
      'Gesäß nicht hochstrecken oder durchhängen',
      'Bauch aktiv einziehen und anspannen',
      'Schultern über den Ellenbogen',
      'Gleichmäßig atmen – nicht die Luft anhalten',
    ],
    fehler: [
      'Gesäß hochstrecken – Core wird entlastet',
      'Hüfte durchhängen – Lendenwirbel belastet',
      'Schultern hochziehen zum Ohr',
    ],
  },
  dips: {
    muskel: 'Trizeps',
    sekundaer: 'Brust · Vordere Schulter',
    warum:
      'Kraftklassiker für Trizeps und Oberkörper. Je nach Körperneigung Fokus auf Trizeps (aufrecht) oder Brust (geneigt) – sehr vielseitig.',
    muskeln: ['tricep', 'chest', 'shoulder'],
    tipps: [
      'Aufrecht = mehr Trizeps',
      'Nach vorne geneigt = mehr Brust',
      'Tief gehen: bis Ellenbogen 90° gebeugt',
      'Schultern nicht hochziehen',
      'Kontrolliert absenken',
    ],
    fehler: [
      'Schultern hochziehen – Rotatorenmanschette belastet',
      'Zu wenig Tiefe – Muskel nicht vollständig aktiviert',
    ],
  },
  seitheben: {
    muskel: 'Seitlicher Deltamuskel (Medial)',
    sekundaer: 'Vorderer Deltamuskel · Trapez',
    warum:
      'Formt die Schulterbreite und gibt dem Oberkörper die athletische V-Form. Der seitliche Delta wird bei Drücken kaum trainiert – Seitheben ist deshalb unverzichtbar.',
    muskeln: ['shoulder'],
    tipps: [
      'Arme seitlich bis Schulterhöhe heben',
      'Ellenbogen leicht gebeugt',
      'Daumen leicht nach unten (innere Rotation)',
      'Keine Schulterhochzüge',
      'Sehr langsam und kontrolliert – kein Schwung!',
    ],
    fehler: ['Zu viel Gewicht mit Schwung heben', 'Schultern hochziehen', 'Arme über Schulterniveau heben'],
  },
  liegestützen: {
    muskel: 'Brust (Pectoralis)',
    sekundaer: 'Trizeps · Vordere Schulter · Core',
    warum:
      'Universellste Oberkörperübung – überall ohne Equipment. Trainiert Brust, Trizeps und Schultern gleichzeitig und stärkt dazu den Core.',
    muskeln: ['chest', 'tricep', 'shoulder', 'abs'],
    tipps: [
      'Körper wie ein Brett: gerade Linie von Kopf bis Ferse',
      'Ellenbogen ca. 45° vom Körper',
      'Brust berührt fast den Boden',
      'Vollständige Streckung am Ende',
    ],
    fehler: [
      'Hüfte hängt durch oder ist hochgestreckt',
      'Nur halbe Bewegungsamplitude',
      'Ellenbogen komplett seitwärts aufspreizen',
    ],
  },
  latzug: {
    muskel: 'Latissimus (breiter Rückenmuskel)',
    sekundaer: 'Bizeps · Trapez · hintere Schulter',
    warum:
      'Latzug ist die beste Maschinenalternative zu Klimmzügen – ideal für Anfänger und zum gezielten Aufbau des Latissimus. Er erzeugt die charakteristische V-Form des Rückens.',
    muskeln: ['lat', 'bicep', 'trap'],
    tipps: [
      'Schulterblätter vor dem Ziehen aktiv einziehen',
      'Stange zum Schlüsselbein ziehen – nicht zum Bauch',
      'Oberkörper leicht nach hinten lehnen',
      'Ellenbogen führen nach unten-außen',
      'Kontrolliert zur Ausgangsposition strecken (3 Sek.)',
    ],
    fehler: [
      'Stange hinter den Kopf ziehen (Nackenstress)',
      'Zu viel Schwung mit dem Oberkörper',
      'Schulterblätter nicht aktivieren vor dem Zug',
    ],
  },
  rückenstrecker: {
    muskel: 'Rückenstrecker (Erector Spinae)',
    sekundaer: 'Gesäß · Hamstrings',
    warum:
      'Rückenstrecker stärken die tiefe Rückenmuskulatur, die für eine gesunde Wirbelsäule, gute Körperhaltung und sichere Ausführung bei Kreuzheben und Kniebeugen essenziell ist.',
    muskeln: ['lback', 'glute', 'ham'],
    tipps: [
      'Nur bis zur Körperlinie strecken – nicht überstrecken',
      'Langsam absenken (2–3 Sek.)',
      'Kopf in neutraler Verlängerung der Wirbelsäule',
      'Gesäß und Rücken kontrolliert anspannen',
      'Optional: Zusatzgewicht auf der Brust für mehr Intensität',
    ],
    fehler: ['Zu stark überstrecken (Lendenwirbel belastet)', 'Zu schnell und schwungvoll', 'Kopf nach hinten reißen'],
  },
  beinpresse: {
    muskel: 'Quadrizeps · Gesäß (Gluteus)',
    sekundaer: 'Hamstrings · Waden',
    warum:
      'Beinpresse ermöglicht schweres Beintraining ohne Balanceanforderung – ideal für Masseaufbau. Schont dabei den unteren Rücken im Vergleich zur Kniebeuge.',
    muskeln: ['quad', 'glute', 'ham'],
    tipps: [
      'Füße schulterbreit, mittig auf der Platte',
      'Knie beugen bis 90° – nicht weiter',
      'Knie zeigen immer in Richtung Zehen',
      'Knie nie vollständig einrasten – immer leicht gebeugt lassen',
      'Langsam absenken, explosiv drücken',
    ],
    fehler: [
      'Knie über 90° beugen (Kniegelenk überlastet)',
      'Knie nach innen fallen lassen',
      'Vollständig in die Streckung einrasten',
    ],
  },
  wadenheben: {
    muskel: 'Waden (Gastrocnemius, Soleus)',
    sekundaer: 'Tibialis anterior',
    warum:
      'Wadenheben kräftigt die oft vernachlässigte Wadenmuskulatur, verbessert Sprung- und Laufleistung und verhindert Verletzungen am Sprunggelenk.',
    muskeln: ['calf'],
    tipps: [
      'Volle Amplitude: ganz absenken, ganz hochdrücken',
      'Oben kurz halten und Waden anspannen (1–2 Sek.)',
      'Langsam absenken für maximale Dehnung',
      'Auf Erhöhung stehen für volle Bewegungsamplitude',
      'Variante mit gebeugtem Knie für Soleus',
    ],
    fehler: ['Zu kurze Amplitude', 'Zu schnell und federnd', 'Hüfte oder Knie mitbewegen'],
  },
  'hip thrust': {
    muskel: 'Gesäß (Gluteus Maximus)',
    sekundaer: 'Hamstrings · Rückenstrecker · Adduktoren',
    warum:
      'Hip Thrust ist DIE Übung für maximale Gesäßentwicklung. Studien zeigen eine stärkere Gluteus-Aktivierung als bei Kniebeugen oder Kreuzheben.',
    muskeln: ['glute', 'ham', 'lback'],
    tipps: [
      'Oberer Rücken auf Bankrand stützen',
      'Füße hüftbreit, Knie 90° in der oberen Position',
      'Hüfte komplett durchdrücken und Gesäß fest anspannen',
      'Oben kurz halten (1–2 Sek.)',
      'Langsam absenken ohne Boden zu berühren',
    ],
    fehler: [
      'Nicht vollständig oben strecken',
      'Füße zu weit oder zu nah positionieren',
      'Unteren Rücken überstrecken statt Hüfte drücken',
    ],
  },
  ausfallschritt: {
    muskel: 'Quadrizeps · Gesäß',
    sekundaer: 'Hamstrings · Core · Adduktoren',
    warum:
      'Ausfallschritte trainieren jeden Oberschenkel einzeln, decken Muskelungleichgewichte auf und verbessern Gleichgewicht und Koordination bei hoher Gesäßaktivierung.',
    muskeln: ['quad', 'glute', 'ham', 'abs'],
    tipps: [
      'Rumpf aufrecht halten',
      'Vorderes Knie nicht über den Zeh hinausbeugen',
      'Hinteres Knie fast den Boden berühren',
      'Aus der Ferse des Vorderbeins hochdrücken',
      'Schrittweite groß genug – etwa Hüftbreite',
    ],
    fehler: ['Oberkörper zu weit vorbeugen', 'Knie nach innen einknicken', 'Schrittweite zu klein'],
  },
  schrägbankdrücken: {
    muskel: 'Obere Brust (Pectoralis, Klavikularbündel)',
    sekundaer: 'Vordere Schulter · Trizeps',
    warum:
      'Schrägbankdrücken betont speziell den oberen Brustbereich und gibt der Brust Fülle und Definition im oberen Bereich – essenziell für eine vollständig entwickelte Brust.',
    muskeln: ['chest', 'shoulder', 'tricep'],
    tipps: [
      'Neigung 30–45° (steiler = mehr Schulter, weniger Brust)',
      'Schulterblätter fest einziehen wie beim normalen Bankdrücken',
      'Stange zur oberen Brust führen',
      'Ellenbogen ca. 60° vom Körper',
      'Vollständige Streckung oben',
    ],
    fehler: ['Neigung über 60° – Schulter dominiert zu stark', 'Schultern hochziehen', 'Inkonsistente Stangenbahn'],
  },
  butterfly: {
    muskel: 'Brust (Pectoralis Major)',
    sekundaer: 'Vordere Schulter',
    warum:
      'Butterfly/Pec-Deck isoliert die Brust ohne Trizeps-Beteiligung – ideal für maximale Brust-Isolation und den "Peak-Pump". Perfekt als Finisher nach Drückübungen.',
    muskeln: ['chest', 'shoulder'],
    tipps: [
      'Rücken fest an der Lehne, keine Hohlkreuz',
      'Arme leicht gebeugt – Ellenbogen nie vollständig strecken',
      'Bewegung kommt aus der Brust, nicht den Schultern',
      'Vorne kurz gegeneinanderdrücken und anspannen',
      'Weit öffnen für maximale Dehnung',
    ],
    fehler: [
      'Ellenbogen vollständig strecken (Schultergelenk belastet)',
      'Schultern nach vorne rollen',
      'Zu viel Gewicht mit Schwung',
    ],
  },
  crunch: {
    muskel: 'Bauch (Rectus Abdominis)',
    sekundaer: 'Schräge Bauchmuskulatur',
    warum:
      'Crunch isoliert den geraden Bauchmuskel mit weniger Hüftbeuger-Beteiligung als Sit-Ups – direktere und sichere Bauchmuskel-Aktivierung.',
    muskeln: ['abs'],
    tipps: [
      'Lendenwirbel bleiben am Boden – nur Schultern heben',
      'Hände locker an die Schläfen, nicht am Kopf ziehen',
      'Kinn leicht zur Brust',
      'Oben kurz halten und anspannen',
      'Langsam absenken ohne Schultern abzulegen',
    ],
    fehler: ['Am Kopf ziehen (Nackenprobleme)', 'Hüfte mit hochreißen', 'Zu schnell und unkontrolliert'],
  },
  'sit-up': {
    muskel: 'Bauch (Rectus Abdominis)',
    sekundaer: 'Hüftbeuger · Schräge Bauchmuskulatur',
    warum:
      'Sit-Ups trainieren den geraden Bauchmuskel durch volle Bewegungsamplitude und sind eine klassische Core-Übung für Stabilität und Rumpfkraft.',
    muskeln: ['abs'],
    tipps: [
      'Füße fixiert oder frei je nach Variante',
      'Hände locker an den Schläfen – nicht hinter dem Kopf',
      'Langsam absenken (2–3 Sek.)',
      'Oben kurz halten und anspannen',
      'Gleichmäßig atmen',
    ],
    fehler: ['Am Kopf ziehen', 'Zu schnell und schwungvoll', 'Hohlkreuz beim Ablegen'],
  },
  'face pull': {
    muskel: 'Hintere Schulter (Posteriorer Deltoid)',
    sekundaer: 'Rotatorenmanschette · Trapez · Rhomboid',
    warum:
      'Face Pull ist eine der wichtigsten Gesundheitsübungen für Schultern. Stärkt die Rotatorenmanschette und korrigiert Haltungsschäden durch zu viel Drücken.',
    muskeln: ['shoulder', 'trap'],
    tipps: [
      'Kabel auf Augenhöhe oder leicht darüber',
      'Seil zu Ohren/Wangen ziehen – nicht zur Stirn',
      'Ellenbogen nach außen-oben führen',
      'Außenrotation am Ende der Bewegung',
      'Leichtes Gewicht – Qualität wichtiger als Quantität',
    ],
    fehler: ['Zu schwer – Nacken/Trapez übernimmt', 'Ellenbogen fallen lassen', 'Kabel zu tief ansetzen'],
  },
  'trizeps pushdown': {
    muskel: 'Trizeps (Brachii)',
    sekundaer: 'Unterarmstrecker',
    warum:
      'Kabel-Trizepsdrücken hält konstanten Widerstand über die gesamte Bewegung und ist besonders gut für den langen Trizepskopf – ideale Isolationsübung für Arm-Definition.',
    muskeln: ['tricep'],
    tipps: [
      'Ellenbogen fix an den Seiten – kein Bewegen',
      'Nur der Unterarm bewegt sich',
      'Volle Streckung am Ende durchdrücken',
      'Langsam zurückführen (2–3 Sek.)',
      'Handgelenk neutral – kein Abbiegen',
    ],
    fehler: ['Ellenbogen wegschwingen', 'Oberkörper nach vorne beugen', 'Nicht vollständig strecken'],
  },
  'hammer curl': {
    muskel: 'Bizeps (Brachialis)',
    sekundaer: 'Unterarmmuskeln · Bizeps Brachii',
    warum:
      'Hammer Curls mit neutralem Griff trainieren besonders den Brachialis unter dem Bizeps – macht den Arm insgesamt dicker und "hebt" den Bizeps optisch an.',
    muskeln: ['bicep'],
    tipps: [
      'Neutraler Griff – Daumen zeigen nach oben',
      'Ellenbogen fix am Körper halten',
      'Volle Amplitude: ganz strecken, ganz beugen',
      'Oben kurz halten',
      'Beide Arme gleichzeitig oder alternierend',
    ],
    fehler: ['Schwingen mit dem Körper', 'Griff drehen (wird dann normaler Curl)', 'Zu schnell absenken'],
  },
  'rumänisches kreuzheben': {
    muskel: 'Hamstrings · Gesäß',
    sekundaer: 'Rückenstrecker · Waden',
    warum:
      'RDL ist die beste Übung speziell für die Hamstrings. Durch die Hüftbeugung mit fast gestreckten Beinen wird die Rückseite des Oberschenkels maximal gedehnt und belastet.',
    muskeln: ['ham', 'glute', 'lback'],
    tipps: [
      'Knie leicht gebeugt und konstant halten',
      'Rücken gerade – Hüfte nach hinten schieben',
      'Stange eng am Körper führen',
      'Absenken bis starke Dehnung in Hamstrings spürbar ist',
      'Aus der Hüfte aufrichten, nicht aus dem Rücken',
    ],
    fehler: ['Knie zu stark beugen – wird zur Kniebeuge', 'Rundrücken beim Absenken', 'Stange vom Körper wegschwingen'],
  },
  'bulgarian split squat': {
    muskel: 'Quadrizeps · Gesäß',
    sekundaer: 'Hamstrings · Core · Gleichgewicht',
    warum:
      'Bulgarische Kniebeuge ist eine der härtesten und effektivsten Beinübungen. Trainiert jeden Oberschenkel einzeln mit sehr hoher Gesäß- und Quad-Aktivierung.',
    muskeln: ['quad', 'glute', 'ham'],
    tipps: [
      'Hinterer Fuß auf Bank oder Ablage',
      'Vorderer Fuß weit genug vor – Knie nicht über den Zeh',
      'Oberkörper aufrecht oder leicht vorgebeugt',
      'Langsam absenken (3–4 Sek.)',
      'Aus der Ferse des Vorderbeins aufstehen',
    ],
    fehler: ['Vorderer Fuß zu nah an der Bank', 'Knie nach innen einknicken', 'Hüfte dreht oder kippt seitlich'],
  },
  kabelrudern: {
    muskel: 'Oberer Rücken (Rhomboid, Trapez)',
    sekundaer: 'Latissimus · Bizeps · hintere Schulter',
    warum:
      'Kabelrudern hält konstanten Widerstand über die gesamte Bewegung und ist ideal für Rückendicke und Schultergesundheit als Gegenstück zu Drückübungen.',
    muskeln: ['lat', 'trap', 'bicep', 'shoulder'],
    tipps: [
      'Oberkörper leicht nach vorne geneigt, Rücken gerade',
      'Ellenbogen eng am Körper führen',
      'Griff zum Bauch ziehen',
      'Am Ende Schulterblätter kräftig zusammenkneifen',
      'Langsam strecken – exzentrische Phase nutzen',
    ],
    fehler: [
      'Rücken rund – Bandscheiben belastet',
      'Mit dem Rücken Schwung holen',
      'Griff zu weit oben zur Brust ziehen',
    ],
  },
  rudermaschine: {
    muskel: 'Rücken · Herz-Kreislauf',
    sekundaer: 'Bizeps · Core · Beine · Schultern',
    warum:
      'Rudermaschine ist eines der effektivsten Ganzkörper-Cardiogeräte – aktiviert gleichzeitig ca. 86% der Muskulatur und trainiert Ausdauer und Kraft.',
    muskeln: ['lat', 'trap', 'bicep', 'quad', 'abs'],
    tipps: [
      'Zugphasen-Reihenfolge: Beine – Rücken – Arme',
      'Beine und Rücken machen 60–70% der Arbeit',
      'Rücken leicht nach hinten lehnen am Ende des Zugs',
      'Griff locker – keine Verkrampfung',
      'Gleichmäßiges Tempo: 22–28 Züge/Min für Ausdauer',
    ],
    fehler: ['Mit dem Rücken ziehen statt Beine nutzen', 'Rundrücken', 'Zu hohe Zugrate mit zu wenig Widerstand'],
  },
  crosstrainer: {
    muskel: 'Herz-Kreislauf-System',
    sekundaer: 'Quadrizeps · Hamstrings · Gesäß · Arme',
    warum:
      'Crosstrainer bietet gelenkschonendes Ganzkörper-Cardio. Durch aktive Armbewegung werden Ober- und Unterkörper gleichzeitig trainiert.',
    muskeln: ['quad', 'ham', 'glute'],
    tipps: [
      'Aufrechte Körperhaltung, leicht nach vorne lehnen',
      'Arme aktiv einsetzen – Schub und Zug wechseln',
      'Gleichmäßiger Rhythmus, Puls im Zielbereich',
      'Widerstand variieren für unterschiedliche Intensität',
      'Vorwärts = mehr Quadrizeps, rückwärts = mehr Gesäß',
    ],
    fehler: [
      'Arme passiv hängen lassen',
      'Zu leichter Widerstand ohne Herausforderung',
      'An den Griffen hängen statt aufrecht stehen',
    ],
  },
  seilspringen: {
    muskel: 'Herz-Kreislauf-System · Koordination',
    sekundaer: 'Waden · Schultern · Core',
    warum:
      'Springseil ist eines der effektivsten Cardio-Tools – verbrennt bis zu 10 kcal/min, verbessert Koordination, Rhythmus und Fußstabilität.',
    muskeln: ['calf', 'shoulder'],
    tipps: [
      'Auf den Fußballen landen – nicht auf den Fersen',
      'Ellenbogen nah am Körper, Handgelenke drehen das Seil',
      'Kleiner Sprung reicht – nur wenige Zentimeter hoch',
      'Aufrechte Haltung, Blick geradeaus',
      'Langsam anfangen und Rhythmus entwickeln',
    ],
    fehler: [
      'Zu hohe Sprünge (belasten Knie und Gelenke)',
      'Mit ganzen Armen schwingen statt Handgelenke',
      'Auf den Fersen landen',
    ],
  },
  beinheben: {
    muskel: 'Unterer Bauch (Rectus Abdominis)',
    sekundaer: 'Hüftbeuger · Core',
    warum:
      'Beinheben aktiviert besonders den unteren Teil des Bauchmuskels, der durch normale Crunches kaum erreicht wird – außerdem Hüftbeuger und Core-Stabilität.',
    muskeln: ['abs'],
    tipps: [
      'Lendenwirbel fest auf die Bank/Matte drücken',
      'Beine gestreckt oder leicht gebeugt',
      'Langsam absenken ohne den Boden zu berühren',
      'Kontrollierte Bewegung – kein Schwung',
      'Hängende Variante an der Klimmzugstange für mehr Intensität',
    ],
    fehler: ['Hohlkreuz beim Absenken', 'Mit Schwung und Hüfte schaukeln', 'Zu schnell und unkontrolliert'],
  },
  'russian twist': {
    muskel: 'Schräge Bauchmuskulatur (Obliques)',
    sekundaer: 'Gerader Bauchmuskel · Hüftbeuger',
    warum:
      'Russian Twist trainiert die schräge Bauchmuskulatur, die für Rotation, Stabilität und eine definierte Taille verantwortlich ist.',
    muskeln: ['abs'],
    tipps: [
      'Rücken leicht nach hinten geneigt (45°)',
      'Füße leicht angehoben für mehr Intensität',
      'Rotation kommt aus dem Rumpf – Arme pendeln nicht einfach',
      'Jede Seite gleichmäßig abwechseln',
      'Mit Zusatzgewicht für mehr Intensität',
    ],
    fehler: ['Arme pendeln statt Rumpf rotieren', 'Zu weit nach hinten lehnen', 'Zu schnell ohne Kontrolle'],
  },
  'arnold press': {
    muskel: 'Schultern (Deltoid, alle 3 Köpfe)',
    sekundaer: 'Trizeps · Trapez',
    warum:
      'Arnold Press mit Rotationsbewegung aktiviert alle drei Schulterköpfe gleichzeitig – entwickelt Schultern rundum und gibt mehr Volumen als normales Schulterdrücken.',
    muskeln: ['shoulder', 'tricep', 'trap'],
    tipps: [
      'Start: Handflächen zeigen zu dir, Ellenbogen vorne unten',
      'Beim Drücken nach außen rotieren',
      'Oben: Handflächen zeigen nach vorne wie beim normalen Press',
      'Kontrollierte Rotation in beide Richtungen',
      'Nicht zu schwer – Technik hat Vorrang',
    ],
    fehler: ['Rotation vernachlässigen – wird normaler Schulterpress', 'Zu viel Schwung', 'Starkes Hohlkreuz'],
  },
  'goblet squat': {
    muskel: 'Quadrizeps · Gesäß',
    sekundaer: 'Core · Adduktoren · oberer Rücken',
    warum:
      'Goblet Squat ist die perfekte Kniebeuge für Anfänger und ideal zum Mobilitätstraining. Der Gegengewicht fördert aufrechte Körperhaltung und tiefere Hocke.',
    muskeln: ['quad', 'glute', 'abs'],
    tipps: [
      'Kettlebell/Hantel vor der Brust halten',
      'Füße schulterbreit, Zehen leicht nach außen',
      'Tief in die Hocke – so tief wie möglich',
      'Knie drücken nach außen über die Zehen',
      'Brust hoch, Rücken gerade',
    ],
    fehler: ['Nicht tief genug gehen', 'Knie nach innen fallen lassen', 'Oberkörper zu weit vorbeugen'],
  },
}
export const OQ = {
  'lat pulldown': 'latzug',
  'lat-pulldown': 'latzug',
  latziehen: 'latzug',
  latpulldown: 'latzug',
  hyperextension: 'rückenstrecker',
  hyperextensions: 'rückenstrecker',
  rückenextension: 'rückenstrecker',
  'leg press': 'beinpresse',
  legpress: 'beinpresse',
  'bein presse': 'beinpresse',
  'calf raise': 'wadenheben',
  'calf raises': 'wadenheben',
  wadenpressen: 'wadenheben',
  'standing calf raise': 'wadenheben',
  beckenheben: 'hip thrust',
  gesäßbrücke: 'hip thrust',
  brücke: 'hip thrust',
  'glute bridge': 'hip thrust',
  lunge: 'ausfallschritt',
  lunges: 'ausfallschritt',
  ausfallschritte: 'ausfallschritt',
  'incline bench': 'schrägbankdrücken',
  'incline press': 'schrägbankdrücken',
  schrägbank: 'schrägbankdrücken',
  'pec deck': 'butterfly',
  fliegende: 'butterfly',
  'kabel butterfly': 'butterfly',
  'chest fly': 'butterfly',
  'sit up': 'sit-up',
  situp: 'sit-up',
  'sit ups': 'sit-up',
  situps: 'sit-up',
  bauchcrunch: 'crunch',
  bauchpresse: 'crunch',
  'face-pull': 'face pull',
  facepull: 'face pull',
  gesichtszug: 'face pull',
  'trizeps-pushdown': 'trizeps pushdown',
  'kabel trizeps': 'trizeps pushdown',
  'cable pushdown': 'trizeps pushdown',
  'trizeps kabelzug': 'trizeps pushdown',
  rdl: 'rumänisches kreuzheben',
  'romanian deadlift': 'rumänisches kreuzheben',
  'rumänisches kh': 'rumänisches kreuzheben',
  'bulgarische kniebeuge': 'bulgarian split squat',
  'split squat': 'bulgarian split squat',
  kabelrudern: 'kabelrudern',
  sitzrudern: 'kabelrudern',
  'cable row': 'kabelrudern',
  'rudermaschine sitzend': 'kabelrudern',
  rowing: 'rudermaschine',
  'rowing machine': 'rudermaschine',
  ruderergometer: 'rudermaschine',
  ellipsentrainer: 'crosstrainer',
  elliptical: 'crosstrainer',
  'rope jumping': 'seilspringen',
  'jump rope': 'seilspringen',
  seil: 'seilspringen',
  skipping: 'seilspringen',
  'leg raise': 'beinheben',
  'leg raises': 'beinheben',
  'hanging leg raise': 'beinheben',
  'russian twists': 'russian twist',
  'arnold drücken': 'arnold press',
  squat: 'kniebeuge',
  'back squat': 'kniebeuge',
  deadlift: 'kreuzheben',
  'conventional deadlift': 'kreuzheben',
  'bench press': 'bankdrücken',
  flachbank: 'bankdrücken',
  'overhead press': 'schulterdrücken',
  'military press': 'schulterdrücken',
  ohp: 'schulterdrücken',
  'barbell row': 'rudern',
  'bent over row': 'rudern',
  pendelrudern: 'rudern',
  curl: 'bizeps curl',
  bizepscurl: 'bizeps curl',
  langhantelcurl: 'bizeps curl',
  trizeps: 'trizepsdrücken',
  'skull crusher': 'trizepsdrücken',
  'leg extension': 'beinstrecken',
  'leg extensions': 'beinstrecken',
  'leg curl': 'beinbeugen',
  'leg curls': 'beinbeugen',
  'lying leg curl': 'beinbeugen',
  treadmill: 'laufband',
  'laufen band': 'laufband',
  fahrradergometer: 'fahrrad',
  bike: 'fahrrad',
  'stationary bike': 'fahrrad',
  'seitliche erhebung': 'seitheben',
  'lateral raise': 'seitheben',
  'push up': 'liegestützen',
  'push ups': 'liegestützen',
  pushup: 'liegestützen',
  'chin up': 'klimmzug',
  chinup: 'klimmzug',
  'pull-up': 'klimmzug',
}
export function kQ(e) {
  let t = e.toLowerCase().trim()
  if (DQ[t]) return DQ[t]
  let n = OQ[t]
  if (n && DQ[n]) return DQ[n]
  let r = Object.keys(DQ).find((e) => t.includes(e) || e.includes(t))
  if (r) return DQ[r]
  let i = Object.entries(OQ).find(([e]) => t.includes(e) || e.includes(t))
  return i ? DQ[i[1]] : null
}
export async function AQ() {
  try {
    return await loadExerciseData()
  } catch {
    return []
  }
}
export const jQ = (e, t) => findExercise(e, t) ?? null
export const MQ = {
  chest: 'Brust',
  shoulder: 'Schultern',
  bicep: 'Bizeps',
  tricep: 'Trizeps',
  trap: 'Trapez',
  lat: 'Latissimus',
  lback: 'Unterer Rücken',
  abs: 'Core',
  quad: 'Quadrizeps',
  ham: 'Hamstrings',
  glute: 'Gesäß',
  calf: 'Waden',
}
export function NQ({ name: e, onClose: t }) {
  let n = kQ(e),
    [r, i] = useState(null),
    [a, o] = useState(true),
    s = `https://www.youtube.com/results?search_query=${encodeURIComponent(e + ' richtige Ausführung Technik')}`
  return (
    useEffect(() => {
      ;(o(true),
        i(null),
        AQ().then((t) => {
          ;(i(jQ(e, t)), o(false))
        }))
    }, [e]),
    (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={t}
      >
        <div
          className="bg-bg-card rounded-2xl border border-border w-full max-w-sm overflow-y-auto"
          style={{
            maxHeight: '90vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between p-5 pb-4">
            <div>
              <div className="font-bold text-text-primary capitalize text-base">{e}</div>
              {n ? (
                <>
                  <div className="text-xs text-brand font-medium mt-0.5">{n.muskel}</div>
                  <div className="text-xs text-text-muted">{n.sekundaer}</div>
                </>
              ) : r?.target_de ? (
                <div className="text-xs text-brand font-medium mt-0.5">
                  {r.target_de}
                  {r.body_part_de ? ` · ${r.body_part_de}` : ''}
                </div>
              ) : null}
            </div>
            <button onClick={t} className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted shrink-0 ml-3">
              <X size={16} />
            </button>
          </div>
          <div className="px-5 pb-6 space-y-5">
            {a ? (
              <div
                className="w-full rounded-xl bg-bg-elevated flex items-center justify-center"
                style={{
                  aspectRatio: '4/3',
                }}
              >
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            ) : r ? (
              <div
                className="w-full rounded-xl overflow-hidden bg-bg-elevated"
                style={{
                  aspectRatio: '4/3',
                }}
              >
                <img
                  src={exerciseGifUrl(r)}
                  alt=""
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    let t = e.currentTarget
                    t.dataset.fb || ((t.dataset.fb = '1'), (t.src = exerciseImageUrl(r)))
                  }}
                />
              </div>
            ) : null}
            {n ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {n.muskeln.map((e) => (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-brand/20 text-brand font-medium" key={e}>
                      {MQ[e] ?? e}
                    </span>
                  ))}
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Warum diese Übung?
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{n.warum}</p>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Richtige Ausführung
                  </div>
                  <ul className="space-y-2">
                    {n.tipps.map((e, t) => (
                      <li className="flex gap-2.5 text-sm text-text-secondary" key={t}>
                        <span className="w-5 h-5 rounded-full bg-brand/20 text-brand text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {t + 1}
                        </span>
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Häufige Fehler
                  </div>
                  <ul className="space-y-1.5">
                    {n.fehler.map((e, t) => (
                      <li className="flex gap-2 text-sm text-text-secondary" key={t}>
                        <span className="text-danger shrink-0">✕</span>
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : r?.steps?.length ? (
              <div>
                <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Richtige Ausführung
                </div>
                <ul className="space-y-2">
                  {r.steps.map((e, t) => (
                    <li className="flex gap-2.5 text-sm text-text-secondary" key={t}>
                      <span className="w-5 h-5 rounded-full bg-brand/20 text-brand text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {t + 1}
                      </span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            ) : a ? null : (
              <p className="text-sm text-text-muted">
                Für <span className="text-text-primary font-medium">"{e}"</span> sind noch keine Tipps hinterlegt.
              </p>
            )}
            <a
              href={s}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border hover:border-brand/50 hover:bg-brand/5 text-sm text-text-secondary hover:text-brand transition-colors"
            >
              <span>▶</span> Videodemonstration ansehen
            </a>
          </div>
        </div>
      </div>
    )
  )
}
export function FQ({ entries: e, onChange: t }) {
  let [n, r] = useState(null)
  function i() {
    t([
      ...e,
      {
        uebungsname: '',
        saetze: '',
        wdh: '',
        gewicht_kg: '',
        notizen: '',
      },
    ])
  }
  function a(n) {
    t(e.filter((e, t) => t !== n))
  }
  function o(n, r, i) {
    let a = [...e]
    ;((a[n] = {
      ...a[n],
      [r]: i,
    }),
      t(a))
  }
  return (
    <div className="space-y-3">
      {n && <NQ name={n} onClose={() => r(null)} />}
      {e.map((e, t) => (
        <div className="p-3 bg-bg-elevated rounded-lg space-y-2" key={t}>
          <div className="flex gap-2">
            <ExerciseNameInput value={e.uebungsname} onChange={(e) => o(t, 'uebungsname', e)} />
            <button
              onClick={() => r(e.uebungsname || null)}
              title="Tipps anzeigen"
              className="p-2 rounded-lg border border-border hover:bg-brand/10 hover:text-brand text-text-muted transition-colors"
            >
              <CircleQuestionMark size={14} />
            </button>
            <button
              onClick={() => a(t)}
              className="p-2 rounded-lg hover:bg-danger/10 hover:text-danger text-text-muted"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Sätze</label>
              <input
                type="number"
                className="input text-sm py-2"
                placeholder="3"
                value={e.saetze}
                onChange={(e) => o(t, 'saetze', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Wdh.</label>
              <input
                type="number"
                className="input text-sm py-2"
                placeholder="10"
                value={e.wdh}
                onChange={(e) => o(t, 'wdh', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Gewicht (kg)</label>
              <input
                type="number"
                step="0.5"
                className="input text-sm py-2"
                placeholder="80"
                value={e.gewicht_kg}
                onChange={(e) => o(t, 'gewicht_kg', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">Notiz (optional)</label>
            <input
              type="text"
              className="input text-sm py-2"
              placeholder="z. B. Sitzhöhe 4, linke Schulter zwickt"
              value={e.notizen}
              onChange={(e) => o(t, 'notizen', e.target.value)}
            />
          </div>
        </div>
      ))}
      <button onClick={i} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
        <Plus size={14} /> Übung hinzufügen
      </button>
    </div>
  )
}
export const IQ = 120
export const LQ = 'hlx_activeWorkout'
export function RQ({ workout: e, onFinish: t, onAbort: n }) {
  let [r, i] = useState(e.exercises),
    [a, o] = useState(0),
    [s, c] = useState(null),
    [l, u] = useState(null),
    [d, f] = useState(''),
    [p, m] = useState({})
  function h(e, t) {
    i((n) =>
      n.map((n, r) =>
        r === e
          ? {
              ...n,
              note: t,
            }
          : n,
      ),
    )
  }
  ;(useEffect(() => {
    localStorage.setItem(
      LQ,
      JSON.stringify({
        ...e,
        exercises: r,
      }),
    )
  }, [r]),
    useEffect(() => {
      let t = setInterval(() => o(Math.floor((Date.now() - e.startTime) / 1e3)), 1e3)
      return () => clearInterval(t)
    }, [e.startTime]),
    useEffect(() => {
      if (!l) return
      if (l.remaining <= 0) {
        u(null)
        return
      }
      let e = setTimeout(
        () =>
          u((e) =>
            e
              ? {
                  ...e,
                  remaining: e.remaining - 1,
                }
              : null,
          ),
        1e3,
      )
      return () => clearTimeout(e)
    }, [l]))
  function g(e, t, n, r) {
    i((i) => {
      let a = i.map((e) => ({
        ...e,
        sets: [...e.sets],
      }))
      return (
        (a[e].sets[t] = {
          ...a[e].sets[t],
          [n]: r,
        }),
        a
      )
    })
  }
  function _(e, t) {
    i((n) => {
      let r = n.map((e) => ({
          ...e,
          sets: [...e.sets],
        })),
        i = r[e].sets[t].done
      return (
        (r[e].sets[t] = {
          ...r[e].sets[t],
          done: !i,
        }),
        u(
          i
            ? null
            : {
                exIdx: e,
                setIdx: t,
                remaining: IQ,
              },
        ),
        r
      )
    })
  }
  function y(e) {
    i((t) => {
      let n = t.map((e) => ({
          ...e,
          sets: [...e.sets],
        })),
        r = n[e].sets.at(-1)
      return (
        n[e].sets.push({
          wdh: r?.wdh ?? '',
          kg: r?.kg ?? '',
          done: false,
        }),
        n
      )
    })
  }
  function b(e) {
    i((t) => t.filter((t, n) => n !== e))
  }
  function x() {
    let e = d.trim()
    e &&
      (i((t) => [
        ...t,
        {
          name: e,
          sets: [
            {
              wdh: '',
              kg: '',
              done: false,
            },
            {
              wdh: '',
              kg: '',
              done: false,
            },
            {
              wdh: '',
              kg: '',
              done: false,
            },
          ],
          prevSets: [],
          note: '',
        },
      ]),
      f(''))
  }
  let S = r.reduce((e, t) => e + t.sets.filter((e) => e.done).length, 0),
    C = r.reduce((e, t) => e + t.sets.length, 0),
    w = Math.floor(a / 60)
      .toString()
      .padStart(2, '0'),
    T = (a % 60).toString().padStart(2, '0')
  return (
    <div className="fixed inset-0 z-40 bg-bg overflow-y-auto">
      {s && <NQ name={s} onClose={() => c(null)} />}
      <div className="sticky top-0 z-10 bg-bg-card/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-bold text-text-primary">{e.vorlage.name}</div>
          <div className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
            <Timer size={11} /> {w}:{T} · {S}/{C} Sätze
            {l && (
              <span className="ml-2 text-brand font-semibold">
                Pause {Math.floor(l.remaining / 60)}:{String(l.remaining % 60).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={n} className="btn-secondary text-sm px-3 py-1.5">
            Abbrechen
          </button>
          <button
            onClick={() => t(r, Math.floor(a / 60))}
            className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
          >
            <Check size={14} /> Beenden
          </button>
        </div>
      </div>
      <div className="p-4 space-y-4 max-w-lg mx-auto pb-8">
        {r.map((e, t) => (
          <div
            className={`card transition-opacity ${e.sets.length > 0 && e.sets.every((e) => e.done) ? 'opacity-50' : ''}`}
            key={t}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-text-primary text-base">{e.name}</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => c(e.name)}
                  className="p-1.5 rounded-lg border border-border hover:bg-brand/10 hover:text-brand text-text-muted transition-colors"
                >
                  <CircleQuestionMark size={14} />
                </button>
                <button
                  onClick={() => b(t)}
                  className="p-1.5 rounded-lg border border-border hover:bg-danger/10 hover:text-danger text-text-muted transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-[36px_1fr_76px_76px_40px] gap-2 mb-2 px-1 text-[11px] text-text-muted font-semibold uppercase tracking-wide">
              <span className="text-center">Set</span>
              <span>Vorherige</span>
              <span className="text-center">kg</span>
              <span className="text-center">Wdh.</span>
              <span />
            </div>
            {e.sets.map((n, r) => {
              let i = e.prevSets[r],
                a = i?.kg ? `${i.kg} kg × ${i.wdh ?? '?'}` : '—',
                o = l?.exIdx === t && l?.setIdx === r
              return (
                <div key={r}>
                  <div
                    className={`grid grid-cols-[36px_1fr_76px_76px_40px] gap-2 items-center py-1 transition-opacity ${n.done ? 'opacity-40' : ''}`}
                  >
                    <span className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center text-sm font-bold text-text-muted">
                      {r + 1}
                    </span>
                    <span className="text-sm text-text-muted">{a}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={n.kg}
                      onChange={(e) => g(t, r, 'kg', e.target.value)}
                      placeholder="—"
                      className="input text-center text-sm py-2 font-semibold"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={n.wdh}
                      onChange={(e) => g(t, r, 'wdh', e.target.value)}
                      placeholder="10"
                      className="input text-center text-sm py-2 font-semibold"
                    />
                    <button
                      onClick={() => _(t, r)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${n.done ? 'bg-success text-bg' : 'bg-bg-elevated text-text-muted hover:bg-success/20 hover:text-success'}`}
                    >
                      <Check size={16} />
                    </button>
                  </div>
                  {r < e.sets.length - 1 && (
                    <div className="flex items-center gap-2 my-1 px-1">
                      <div className="flex-1 h-px bg-border" />
                      <span className={`text-xs font-semibold ${o ? 'text-brand' : 'text-text-muted'}`}>
                        {o ? `${Math.floor(l.remaining / 60)}:${String(l.remaining % 60).padStart(2, '0')}` : '2:00'}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                </div>
              )
            })}
            <button
              onClick={() => y(t)}
              className="mt-3 w-full py-2.5 rounded-xl bg-bg-elevated text-sm text-text-muted hover:text-text-primary hover:bg-border transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Satz hinzufügen (2:00)
            </button>
            {e.prevNote && !(p[t] ?? !!e.note) && (
              <p className="mt-3 text-xs text-text-muted flex items-start gap-1.5">
                <StickyNote size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>Letztes Mal: {e.prevNote}</span>
              </p>
            )}
            {(p[t] ?? !!e.note) ? (
              <div className="mt-3">
                <label htmlFor={`note-${t}`} className="text-xs text-text-muted mb-1 flex items-center gap-1.5">
                  <StickyNote size={12} aria-hidden="true" /> Notiz zu dieser Übung
                </label>
                <textarea
                  id={`note-${t}`}
                  rows={2}
                  className="input text-sm resize-none"
                  placeholder={
                    e.prevNote
                      ? `Letztes Mal: ${e.prevNote}`
                      : 'z. B. Sitzhöhe 4, Schulter zwickt, nächstes Mal mehr Gewicht'
                  }
                  value={e.note ?? ''}
                  onChange={(e) => h(t, e.target.value)}
                />
              </div>
            ) : (
              <button
                onClick={() =>
                  m((e) => ({
                    ...e,
                    [t]: true,
                  }))
                }
                className="mt-2 text-xs text-brand hover:text-brand/80 flex items-center gap-1.5 transition-colors"
              >
                <StickyNote size={12} aria-hidden="true" /> Notiz hinzufügen
              </button>
            )}
          </div>
        ))}
        <div className="card">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Übung hinzufügen</div>
          <div className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              placeholder="Übungsname…"
              value={d}
              onChange={(e) => f(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && x()}
            />
            <button
              onClick={x}
              disabled={!d.trim()}
              className="btn-primary px-4 text-sm flex items-center gap-1.5 disabled:opacity-40"
            >
              <Plus size={14} /> Hinzufügen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export function TrainingEinheiten({ embedded: e = false, onOpenVorlagen: t, startVorlageId: n, onStartHandled: r }) {
  let { user: i } = useAuth(),
    { colors: a } = useTheme(),
    o = useNavigate(),
    [s, c] = useState([]),
    [l, u] = useState(true),
    [d, f] = useState(false),
    [p, m] = useState(false),
    [h, g] = useState(null),
    [_, y] = useState(false),
    [b, x] = useState(null),
    S = useRef(null),
    [C, w] = useState([]),
    [T, E] = useState(false),
    D = useRef(null),
    [O, k] = useState(''),
    [A, j] = useState(null),
    [M, N] = useState(null),
    [P, F] = useState({
      datum: todayISO(),
      trainingstyp: 'Kraft',
      dauer_h: '0',
      dauer_m: '0',
      avg_puls: '',
      kalorien_verbrannt: '',
      notizen: '',
    }),
    [I, L] = useState([])
  async function ee() {
    if (!i) return
    let { data: e } = await supabase.from('training').select('*').eq('user_id', i.id).order('datum', {
        ascending: false,
      }),
      t = e ?? [],
      n = t.map((e) => e.id)
    if (n.length) {
      let { data: e } = await supabase.from('uebungen').select('*').in('training_id', n),
        r = (e ?? []).reduce((e, t) => (e[t.training_id] || (e[t.training_id] = []), e[t.training_id].push(t), e), {})
      t.forEach((e) => {
        e.uebungen = r[e.id] ?? []
      })
    }
    ;(c(t), u(false))
  }
  async function te() {
    if (!i) return
    let { data: e } = await supabase.from('training_vorlagen').select('*').eq('user_id', i.id)
    if (!e?.length) {
      E(true)
      return
    }
    let { data: t } = await supabase
        .from('vorlagen_uebungen')
        .select('*')
        .in(
          'vorlage_id',
          e.map((e) => e.id),
        )
        .order('reihenfolge'),
      n = (t ?? []).reduce((e, t) => (e[t.vorlage_id] || (e[t.vorlage_id] = []), e[t.vorlage_id].push(t), e), {})
    ;(w(
      e.map((e) => ({
        ...e,
        uebungen: n[e.id] ?? [],
      })),
    ),
      E(true))
  }
  async function ne(e) {
    if (!i) return
    let t = (e.uebungen ?? []).map((e) => e.uebungsname).filter(Boolean),
      n = {},
      r = {}
    if (t.length) {
      let { data: e } = await supabase
        .from('uebungen')
        .select('uebungsname, saetze_log, saetze, wdh, gewicht_kg, notizen')
        .eq('user_id', i.id)
        .in('uebungsname', t)
        .order('created_at', {
          ascending: false,
        })
      for (let t of e ?? [])
        (t.notizen && !r[t.uebungsname] && (r[t.uebungsname] = t.notizen),
          !n[t.uebungsname] &&
            (Array.isArray(t.saetze_log) && t.saetze_log.length > 0
              ? (n[t.uebungsname] = t.saetze_log)
              : t.saetze &&
                (n[t.uebungsname] = Array.from(
                  {
                    length: t.saetze,
                  },
                  () => ({
                    wdh: t.wdh ?? null,
                    kg: t.gewicht_kg ?? null,
                  }),
                ))))
    }
    let a = (e.uebungen ?? []).map((e) => {
      let t = parseInt(e.saetze) || 3,
        i = n[e.uebungsname] ?? []
      return {
        name: e.uebungsname,
        sets: Array.from(
          {
            length: t,
          },
          (t, n) => ({
            wdh: String(i[n]?.wdh ?? e.wdh ?? ''),
            kg: String(i[n]?.kg ?? e.gewicht_kg ?? ''),
            done: false,
          }),
        ),
        prevSets: i,
        note: '',
        prevNote: r[e.uebungsname] ?? '',
      }
    })
    ;(N(null),
      j({
        vorlage: e,
        startTime: Date.now(),
        exercises: a,
      }))
  }
  useEffect(() => {
    if (!n || !T || D.current === n) return
    D.current = n
    let e = C.find((e) => e.id === n)
    ;(e && ne(e), r?.())
  }, [n, T, C])
  async function re(e, t) {
    if (!i || !A) return
    let n = s.length,
      r = `E-${String(n + 1).padStart(3, '0')}`,
      { data: a } = await supabase
        .from('training')
        .insert({
          user_id: i.id,
          einheit_id: r,
          datum: todayISO(),
          trainingstyp: A.vorlage.trainingstyp ?? 'Kraft',
          dauer_min: t > 0 ? t : null,
        })
        .select()
        .single()
    if (a) {
      let t = e
        .filter((e) => e.sets.some((e) => e.done || e.wdh || e.kg) || e.note?.trim())
        .map((e) => {
          let t = e.sets.filter((e) => e.done || e.wdh || e.kg)
          return {
            user_id: i.id,
            training_id: a.id,
            uebungsname: e.name,
            saetze: t.length,
            wdh: (t[0] && parseInt(t[0].wdh)) || null,
            gewicht_kg: (t[0] && parseFloat(t[0].kg)) || null,
            saetze_log: t.map((e) => ({
              wdh: parseInt(e.wdh) || null,
              kg: parseFloat(e.kg) || null,
            })),
            notizen: e.note?.trim() || null,
          }
        })
      t.length && (await supabase.from('uebungen').insert(t))
    }
    ;(localStorage.removeItem(LQ), N(null), j(null), await ee())
  }
  useEffect(() => {
    ;(ee(), te())
    let e = localStorage.getItem(LQ)
    if (e)
      try {
        N(JSON.parse(e))
      } catch {}
  }, [i])
  async function ie(e) {
    y(true)
    let t = new FileReader()
    ;((t.onload = async () => {
      let n = t.result.split(',')[1]
      x(t.result)
      try {
        let { data: t } = await supabase.functions.invoke('analyze-screenshot', {
          body: {
            imageBase64: n,
            mimeType: e.type,
            context: 'training',
          },
        })
        if (t?.result) {
          let e = t.result
          F((t) => ({
            ...t,
            dauer_h: e.dauer_min ? String(Math.floor(e.dauer_min / 60)) : t.dauer_h,
            dauer_m: e.dauer_min ? String(e.dauer_min % 60) : t.dauer_m,
            avg_puls: e.avg_puls ? String(e.avg_puls) : t.avg_puls,
            kalorien_verbrannt: e.kalorien_verbrannt ? String(e.kalorien_verbrannt) : t.kalorien_verbrannt,
            trainingstyp: e.trainingstyp && TQ.includes(e.trainingstyp) ? e.trainingstyp : t.trainingstyp,
            notizen: e.notizen || t.notizen,
          }))
        }
      } catch (e) {
        let t = e instanceof Error ? e.message : ''
        alert(
          t.includes('429')
            ? 'Zu viele Anfragen – bitte kurz warten und erneut versuchen.'
            : 'Foto-Analyse fehlgeschlagen. Bitte erneut versuchen.',
        )
      }
      y(false)
    }),
      t.readAsDataURL(e))
  }
  function R(e) {
    c((t) =>
      t.map((t) =>
        t.id === e
          ? {
              ...t,
              expanded: !t.expanded,
            }
          : t,
      ),
    )
  }
  function ae(e) {
    ;(g(e.id),
      F({
        datum: e.datum,
        trainingstyp: e.trainingstyp ?? 'Kraft',
        dauer_h: e.dauer_min ? String(Math.floor(e.dauer_min / 60)) : '0',
        dauer_m: e.dauer_min ? String(e.dauer_min % 60) : '0',
        avg_puls: e.avg_puls ? String(e.avg_puls) : '',
        kalorien_verbrannt: e.kalorien_verbrannt ? String(e.kalorien_verbrannt) : '',
        notizen: e.notizen ?? '',
      }),
      L(
        e.uebungen?.map((e) => ({
          uebungsname: e.uebungsname,
          saetze: e.saetze ? String(e.saetze) : '',
          wdh: e.wdh ? String(e.wdh) : '',
          gewicht_kg: e.gewicht_kg ? String(e.gewicht_kg) : '',
          notizen: e.notizen ?? '',
        })) ?? [],
      ),
      x(null),
      f(true))
  }
  function oe() {
    ;(f(false),
      g(null),
      x(null),
      F({
        datum: todayISO(),
        trainingstyp: 'Kraft',
        dauer_h: '0',
        dauer_m: '0',
        avg_puls: '',
        kalorien_verbrannt: '',
        notizen: '',
      }),
      L([]))
  }
  async function se() {
    if (!i) return
    m(true)
    let e = parseInt(P.dauer_h || '0') * 60 + parseInt(P.dauer_m || '0'),
      t = {
        datum: P.datum,
        trainingstyp: P.trainingstyp || null,
        dauer_min: e > 0 ? e : null,
        avg_puls: P.avg_puls ? parseInt(P.avg_puls) : null,
        kalorien_verbrannt: P.kalorien_verbrannt ? parseInt(P.kalorien_verbrannt) : null,
        notizen: P.notizen || null,
      },
      n
    if (h)
      (await supabase.from('training').update(t).eq('id', h),
        (n = h),
        await supabase.from('uebungen').delete().eq('training_id', h))
    else {
      let e = s.length,
        r = `E-${String(e + 1).padStart(3, '0')}`,
        { data: a } = await supabase
          .from('training')
          .insert({
            user_id: i.id,
            einheit_id: r,
            ...t,
          })
          .select()
          .single()
      n = a.id
    }
    ;(I.filter((e) => e.uebungsname).length > 0 &&
      (await supabase.from('uebungen').insert(
        I.filter((e) => e.uebungsname).map((e) => ({
          user_id: i.id,
          training_id: n,
          uebungsname: e.uebungsname,
          saetze: e.saetze ? parseInt(e.saetze) : null,
          wdh: e.wdh ? parseInt(e.wdh) : null,
          gewicht_kg: e.gewicht_kg ? parseFloat(e.gewicht_kg) : null,
          notizen: e.notizen || null,
        })),
      )),
      await ee(),
      oe(),
      m(false))
  }
  async function ce(e) {
    ;(await supabase.from('uebungen').delete().eq('training_id', e),
      await supabase.from('training').delete().eq('id', e),
      c((t) => t.filter((t) => t.id !== e)))
  }
  let le = [...s]
      .reverse()
      .slice(-14)
      .map((e) => ({
        datum: formatDate(e.datum, 'dd.MM'),
        dauer: e.dauer_min ?? 0,
      })),
    ue = s.reduce((e, t) => e + (t.dauer_min ?? 0), 0),
    de = s.filter((e) => e.avg_puls).length
      ? Math.round(s.reduce((e, t) => e + (t.avg_puls ?? 0), 0) / s.filter((e) => e.avg_puls).length)
      : null
  return A ? (
    <RQ workout={A} onFinish={re} onAbort={() => j(null)} />
  ) : (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {!e && (
          <div>
            <h1 className="section-title text-2xl">Training</h1>
            <p className="text-text-secondary text-sm mt-0.5">{'Einheiten & Übungslog'}</p>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {!e && (
            <button
              onClick={() => (t ? t() : o('/training?tab=vorlagen'))}
              className="btn-secondary flex items-center gap-2"
            >
              <BookOpen size={16} /> Vorlagen
            </button>
          )}
          <button
            onClick={() => {
              ;(g(null),
                F({
                  datum: todayISO(),
                  trainingstyp: 'Kraft',
                  dauer_h: '0',
                  dauer_m: '0',
                  avg_puls: '',
                  kalorien_verbrannt: '',
                  notizen: '',
                }),
                L([]),
                x(null),
                f(true))
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus size={18} /> Manuell eintragen
          </button>
        </div>
      </div>
      {M && (
        <div className="card border-brand/40 bg-brand/5 flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <div className="font-semibold text-text-primary">Workout pausiert: {M.vorlage?.name}</div>
            <div className="text-xs text-text-muted mt-0.5">
              {M.exercises.length} Übungen · Fortsetzen oder verwerfen
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                ;(N(null), localStorage.removeItem(LQ))
              }}
              className="btn-secondary text-sm px-3 py-1.5"
            >
              Verwerfen
            </button>
            <button
              onClick={() => {
                ;(j(M), N(null))
              }}
              className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
            >
              <Play size={14} /> Fortsetzen
            </button>
          </div>
        </div>
      )}
      {C.length > 0 && (
        <div>
          <h2 className="section-title mb-3 text-base">Workout starten</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {C.map((e) => (
              <div className="card flex items-center justify-between gap-3" key={e.id}>
                <div className="min-w-0">
                  <div className="font-semibold text-text-primary truncate">{e.name}</div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {e.trainingstyp ?? 'Kraft'} · {(e.uebungen ?? []).length} Übungen
                  </div>
                </div>
                <button
                  onClick={() => ne(e)}
                  className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5 shrink-0"
                >
                  <Play size={14} /> Starten
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{s.length}</div>
          <div className="text-xs text-text-muted mt-1">Einheiten gesamt</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{ue > 0 ? `${Math.round(ue / 60)}h` : '--'}</div>
          <div className="text-xs text-text-muted mt-1">Trainingszeit gesamt</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-text-primary">{de ? `${de} bpm` : '--'}</div>
          <div className="text-xs text-text-muted mt-1">Ø Herzfrequenz</div>
        </div>
      </div>
      {s.length > 1 && (
        <div className="card">
          <h2 className="section-title mb-6">Trainingsdauer (letzte 14 Einheiten)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={le}>
              <CartesianGrid strokeDasharray="3 3" stroke={a.grid} vertical={false} />
              <XAxis
                dataKey="datum"
                tick={{
                  fill: a.tick,
                  fontSize: 11,
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fill: a.tick,
                  fontSize: 11,
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<EQ />} />
              <Bar isAnimationActive={false} dataKey="dauer" fill={a.brand} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="space-y-3">
        {l ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : s.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Dumbbell}
              title="Noch keine Trainingseinheiten"
              description="Trage deine erste Trainingseinheit ein."
            />
          </div>
        ) : (
          s.map((e) => (
            <div className="card" key={e.id}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                  <Dumbbell size={18} className="text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text-primary">{e.trainingstyp ?? 'Training'}</span>
                    <span className="text-xs text-text-muted">{formatDate(e.datum)}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-text-secondary">
                    {e.dauer_min && (
                      <span className="flex items-center gap-1">
                        <Timer size={12} />{' '}
                        {e.dauer_min >= 60
                          ? `${Math.floor(e.dauer_min / 60)}h ${e.dauer_min % 60 > 0 ? `${e.dauer_min % 60}min` : ''}`.trim()
                          : `${e.dauer_min} min`}
                      </span>
                    )}
                    {e.avg_puls && (
                      <span className="flex items-center gap-1">
                        <Activity size={12} /> {e.avg_puls} bpm
                      </span>
                    )}
                    {e.kalorien_verbrannt && (
                      <span className="flex items-center gap-1">
                        <Flame size={12} /> {e.kalorien_verbrannt} kcal
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(e.uebungen?.length ?? 0) > 0 && (
                    <button
                      onClick={() => R(e.id)}
                      className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
                    >
                      {e.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                  <button
                    onClick={() => ae(e)}
                    className="p-1.5 rounded-lg hover:bg-brand/10 hover:text-brand text-text-muted transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => ce(e.id)}
                    className="p-1.5 rounded-lg hover:bg-danger/10 hover:text-danger text-text-muted transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {e.expanded && e.uebungen && e.uebungen.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs font-medium text-text-muted mb-3">Übungen</div>
                  <div className="space-y-2">
                    {e.uebungen.map((e) => {
                      let t = e.saetze_log
                      return (
                        <div className="p-2 rounded-lg bg-bg-elevated" key={e.id}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-text-primary text-sm">{e.uebungsname}</span>
                            {(!t || t.length === 0) && (
                              <span className="text-text-secondary text-xs">
                                {e.saetze}×{e.wdh}
                                {e.gewicht_kg ? ` @ ${e.gewicht_kg}kg` : ''}
                              </span>
                            )}
                          </div>
                          {e.notizen && (
                            <p className="mt-1.5 text-xs text-text-secondary flex items-start gap-1.5">
                              <StickyNote size={12} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                              <span>{e.notizen}</span>
                            </p>
                          )}
                          {t && t.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {t.map((e, t) => (
                                <span className="text-[11px] bg-bg px-2 py-0.5 rounded text-text-secondary" key={t}>
                                  S{t + 1}: {e.wdh ?? '?'}×{e.kg ?? '?'}kg
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <Modal open={d} onClose={oe} title={h ? 'Trainingseinheit bearbeiten' : 'Trainingseinheit eintragen'} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <input
            ref={S}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              e.target.files?.[0] && ie(e.target.files[0])
            }}
          />
          <div
            onClick={() => S.current?.click()}
            className={`relative flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all
              ${b ? 'border-brand/50 bg-brand/5' : 'border-border hover:border-brand/40 hover:bg-brand/5'}`}
          >
            {b ? (
              <>
                <img src={b} alt="Workout" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  {_ ? (
                    <div className="flex items-center gap-2 text-sm text-brand">
                      <Spinner size={14} />
                      <span>Analysiere Workout...</span>
                    </div>
                  ) : (
                    <div className="text-sm text-success font-medium flex items-center gap-1.5">
                      <Sparkles size={14} />
                      Daten automatisch ausgefüllt
                    </div>
                  )}
                  <div className="text-xs text-text-muted mt-0.5">Anderes Bild wählen</div>
                </div>
                <button
                  onClick={(e) => {
                    ;(e.stopPropagation(), x(null))
                  }}
                  className="p-1 rounded hover:bg-danger/10 hover:text-danger text-text-muted transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                  <Camera size={18} className="text-brand" />
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                    <Sparkles size={13} className="text-accent" />
                    Apple Watch Screenshot analysieren
                  </div>
                  <div className="text-xs text-text-muted">
                    {'Dauer, Kalorien & Herzfrequenz werden automatisch erkannt'}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Datum</label>
              <input
                type="date"
                className="input"
                value={P.datum}
                onChange={(e) =>
                  F((t) => ({
                    ...t,
                    datum: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">Trainingstyp</label>
              <input
                className="input"
                list="training-types-list"
                value={P.trainingstyp}
                onChange={(e) =>
                  F((t) => ({
                    ...t,
                    trainingstyp: e.target.value,
                  }))
                }
                placeholder="z.B. Kraft, Cardio, eigener Typ…"
              />
              <datalist id="training-types-list">
                {TQ.map((e) => (
                  <option value={e} key={e} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">Dauer</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    className="input pr-8"
                    placeholder="0"
                    value={P.dauer_h}
                    onChange={(e) =>
                      F((t) => ({
                        ...t,
                        dauer_h: e.target.value,
                      }))
                    }
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted pointer-events-none">
                    h
                  </span>
                </div>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    className="input pr-10"
                    placeholder="0"
                    value={P.dauer_m}
                    onChange={(e) =>
                      F((t) => ({
                        ...t,
                        dauer_m: e.target.value,
                      }))
                    }
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted pointer-events-none">
                    min
                  </span>
                </div>
              </div>
            </div>
            <div>
              <label className="label">Ø Puls (bpm)</label>
              <input
                type="number"
                className="input"
                placeholder="140"
                value={P.avg_puls}
                onChange={(e) =>
                  F((t) => ({
                    ...t,
                    avg_puls: e.target.value,
                  }))
                }
              />
            </div>
            <div className="col-span-2">
              <label className="label">Kalorien verbrannt</label>
              <input
                type="number"
                className="input"
                placeholder="450"
                value={P.kalorien_verbrannt}
                onChange={(e) =>
                  F((t) => ({
                    ...t,
                    kalorien_verbrannt: e.target.value,
                  }))
                }
              />
              {!P.avg_puls && !P.kalorien_verbrannt && (
                <button
                  type="button"
                  onClick={() => {
                    let e = parseInt(P.dauer_h || '0') * 60 + parseInt(P.dauer_m || '0'),
                      t = {
                        Kraft: 6,
                        Cardio: 9,
                        HIIT: 12,
                        Laufen: 10,
                        Radfahren: 7,
                        Schwimmen: 8,
                        Yoga: 3,
                        Stretching: 2,
                        Sonstiges: 6,
                      },
                      n = {
                        Kraft: 110,
                        Cardio: 145,
                        HIIT: 165,
                        Laufen: 150,
                        Radfahren: 135,
                        Schwimmen: 130,
                        Yoga: 85,
                        Stretching: 75,
                        Sonstiges: 120,
                      },
                      r = t[P.trainingstyp] ?? 6,
                      i = e > 0 ? Math.round(e * r) : 0,
                      a = n[P.trainingstyp] ?? 120
                    F((e) => ({
                      ...e,
                      kalorien_verbrannt: i > 0 ? String(i) : e.kalorien_verbrannt,
                      avg_puls: String(a),
                    }))
                  }}
                  className="mt-1.5 text-xs text-brand hover:text-brand/80 flex items-center gap-1 transition-colors"
                >
                  <Sparkles size={11} /> Von KI schätzen lassen
                </button>
              )}
            </div>
            <div>
              <label className="label">Notizen</label>
              <input
                type="text"
                className="input"
                placeholder="Optionale Notizen"
                value={P.notizen}
                onChange={(e) =>
                  F((t) => ({
                    ...t,
                    notizen: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <div className="text-sm font-medium text-text-primary mb-3">Übungen (optional)</div>
            <FQ entries={I} onChange={L} />
          </div>
          <div className="flex gap-3 pt-2 border-t border-border">
            <button onClick={() => f(false)} className="btn-secondary flex-1">
              Abbrechen
            </button>
            <button onClick={se} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={p}>
              {p && <Spinner size={16} />}Speichern
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
