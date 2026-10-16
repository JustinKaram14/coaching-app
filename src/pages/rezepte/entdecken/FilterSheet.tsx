import type { ReactNode } from 'react'
import { Sheet, Hinweis } from './gemeinsam'
import {
  ARTEN, DARM_ARTEN, GESUNDHEIT_REIHEN, KCAL_SPANNEN, REIHEN, type GesundheitsFilter,
} from '../../../lib/entdecken/katalog'
import { LEERER_FILTER, type FilterZustand, type Sortierung } from '../../../lib/entdecken/filter'
import { MAHLZEITEN } from '../../../lib/entdecken/types'

export function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={aktiv}
      className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
        aktiv ? 'bg-primary text-white border-brand' : 'border-border text-text-secondary hover:border-brand/50 hover:text-text-primary'}`}>
      {children}
    </button>
  )
}

function Gruppe({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">{titel}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

const SORTIERUNGEN: { id: Sortierung; label: string }[] = [
  { id: 'relevanz', label: 'Empfohlen' }, { id: 'kcal-auf', label: 'Wenigste kcal' }, { id: 'kcal-ab', label: 'Meiste kcal' },
  { id: 'zeit', label: 'Schnellste' }, { id: 'ballast', label: 'Meiste Ballaststoffe' },
]

export function FilterSheet({ filter, onChange, anzahl, onClose }: {
  filter: FilterZustand; onChange: (f: FilterZustand) => void; anzahl: number; onClose: () => void
}) {
  const umschalten = <T,>(liste: T[], x: T) => (liste.includes(x) ? liste.filter(y => y !== x) : [...liste, x])
  return (
    <Sheet titel="Filter" untertitel="Wirkt zusammen mit der Suche" onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button onClick={() => onChange({ ...LEERER_FILTER, suche: filter.suche })} className="btn-secondary">Zurücksetzen</button>
          <button onClick={onClose} className="btn-primary flex-1">{anzahl} {anzahl === 1 ? 'Rezept' : 'Rezepte'} anzeigen</button>
        </div>
      }>
      <div className="space-y-5">
        <Gruppe titel="Mahlzeit">
          {MAHLZEITEN.map(m => <Chip key={m} aktiv={filter.mahlzeiten.includes(m)} onClick={() => onChange({ ...filter, mahlzeiten: umschalten(filter.mahlzeiten, m) })}>{m}</Chip>)}
        </Gruppe>
        <Gruppe titel="Kalorien pro Portion">
          {KCAL_SPANNEN.map(s => <Chip key={s.id} aktiv={filter.kcal === s.id} onClick={() => onChange({ ...filter, kcal: filter.kcal === s.id ? null : s.id })}>{s.label}</Chip>)}
        </Gruppe>
        <Gruppe titel="Ernährungsart (alle gewählten müssen passen)">
          {ARTEN.map(a => <Chip key={a.id} aktiv={filter.arten.includes(a.id)} onClick={() => onChange({ ...filter, arten: umschalten(filter.arten, a.id) })}>{a.emoji} {a.label}</Chip>)}
        </Gruppe>
        <Gruppe titel="Reihe">
          {REIHEN.map(x => <Chip key={x.id} aktiv={filter.reihe === x.id} onClick={() => onChange({ ...filter, reihe: filter.reihe === x.id ? null : x.id })}>{x.emoji} {x.label}</Chip>)}
        </Gruppe>
        <div className="space-y-2">
          <Gruppe titel="Gesundheit">
            {(Object.keys(GESUNDHEIT_REIHEN) as GesundheitsFilter[]).map(g => (
              <Chip key={g} aktiv={filter.gesundheit.includes(g)} onClick={() => onChange({ ...filter, gesundheit: umschalten(filter.gesundheit, g), darmArt: g === 'darm' && filter.gesundheit.includes('darm') ? null : filter.darmArt })}>
                {GESUNDHEIT_REIHEN[g].emoji} {GESUNDHEIT_REIHEN[g].label}
              </Chip>
            ))}
          </Gruppe>
          {filter.gesundheit.includes('darm') && (
            <Gruppe titel="Darmfreundlich: Art">
              {DARM_ARTEN.map(d => <Chip key={d.id} aktiv={filter.darmArt === d.id} onClick={() => onChange({ ...filter, darmArt: filter.darmArt === d.id ? null : d.id })}>{d.label}</Chip>)}
            </Gruppe>
          )}
          <Hinweis lang />
        </div>
        <Gruppe titel="Zeit und Aufwand">
          {[15, 30, 45].map(min => <Chip key={min} aktiv={filter.maxZeit === min} onClick={() => onChange({ ...filter, maxZeit: filter.maxZeit === min ? null : min })}>bis {min} Min.</Chip>)}
          <Chip aktiv={filter.nurLeicht} onClick={() => onChange({ ...filter, nurLeicht: !filter.nurLeicht })}>Nur leichte Rezepte</Chip>
          <Chip aktiv={filter.nurFavoriten} onClick={() => onChange({ ...filter, nurFavoriten: !filter.nurFavoriten })}>♥ Nur Favoriten</Chip>
          <Chip aktiv={filter.nurEigene} onClick={() => onChange({ ...filter, nurEigene: !filter.nurEigene })}>Nur meine KI-Rezepte</Chip>
        </Gruppe>
        <Gruppe titel="Sortierung">
          {SORTIERUNGEN.map(s => <Chip key={s.id} aktiv={filter.sortierung === s.id} onClick={() => onChange({ ...filter, sortierung: s.id })}>{s.label}</Chip>)}
        </Gruppe>
      </div>
    </Sheet>
  )
}
