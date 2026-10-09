// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { cn } from '../../lib/utils'
import { Avatar } from './Avatar'
import { useMemo, useState } from 'react'
import {
  BEARD_STYLES,
  BROW_STYLES,
  EYE_STYLES,
  FACE_SHAPES,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTH_STYLES,
  RANDOM_NAMES,
  SHIRT_COLORS,
  SKIN_COLORS,
  randomCharacterConfig,
} from '../../lib/game'
import { Dices, Shuffle } from 'lucide-react'
import { SegmentedTabs } from '../ui/SegmentedTabs'

export const FIGURE_TABS = [
  {
    key: 'gesicht',
    label: 'Gesicht',
  },
  {
    key: 'haare',
    label: 'Haare',
  },
  {
    key: 'mimik',
    label: 'Mimik',
  },
  {
    key: 'stil',
    label: 'Bart & Stil',
  },
]
export function ColorPicker({ label, colors, value, onPick }) {
  return (
    <div>
      <div className="text-xs font-semibold text-text-secondary mb-2">{label}</div>
      <div className="flex flex-wrap gap-2.5" role="group" aria-label={label}>
        {colors.map((t, i) => (
          <button
            type="button"
            onClick={() => onPick(t)}
            aria-pressed={value === t}
            aria-label={`${label} ${i + 1}`}
            className={cn(
              'w-10 h-10 rounded-full border-2 transition-all active:scale-90',
              value === t ? 'border-brand ring-2 ring-brand/40 scale-105' : 'border-border-light',
            )}
            style={{
              backgroundColor: t,
            }}
            key={t}
          />
        ))}
      </div>
    </div>
  )
}
export function StylePicker({ label, items, value, config, apply, onPick }) {
  return (
    <div>
      <div className="text-xs font-semibold text-text-secondary mb-2">{label}</div>
      <div className="grid grid-cols-4 gap-2" role="group" aria-label={label}>
        {items.map((e) => (
          <button
            type="button"
            onClick={() => onPick(e.key)}
            aria-pressed={value === e.key}
            className={cn(
              'rounded-2xl border p-1 flex flex-col items-center gap-0.5 transition-all active:scale-95',
              value === e.key ? 'border-brand bg-brand/10' : 'border-border bg-bg-elevated hover:border-brand/40',
            )}
            key={e.key}
          >
            <Avatar
              view="head"
              size={58}
              config={{
                ...config,
                ...apply(e.key),
              }}
              label=""
            />
            <span className="text-[11px] font-semibold text-text-secondary leading-tight text-center">{e.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
export function CharacterEditor({ config, name, equipped, onConfig, onName, autoFocusName }) {
  let [tab, setTab] = useState('gesicht'),
    patch = (t) =>
      onConfig({
        ...config,
        ...t,
      }),
    remaining = useMemo(() => 16 - name.length, [name])
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3">
        <div className="relative rounded-4xl bg-gradient-to-b from-brand/10 to-transparent px-8 pt-4">
          <Avatar config={config} equipped={equipped} size={210} idle label="Vorschau deiner Figur" />
        </div>
        <button
          type="button"
          onClick={() => onConfig(randomCharacterConfig())}
          className="btn-secondary !px-4 !py-2 text-sm flex items-center gap-2"
        >
          <Dices size={16} aria-hidden="true" /> Zufällige Figur
        </button>
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="char-name" className="label !mb-1">
            Name deiner Figur
          </label>
          <span
            className={cn('text-xs tabular-nums', remaining < 4 ? 'text-warning' : 'text-text-muted')}
            aria-live="polite"
          >
            {remaining} übrig
          </span>
        </div>
        <div className="flex gap-2">
          <input
            id="char-name"
            className="input"
            maxLength={16}
            autoComplete="off"
            autoFocus={autoFocusName}
            placeholder="z. B. Hugo"
            value={name}
            onChange={(e) => onName(limitCharacterName(e.target.value))}
          />
          <button
            type="button"
            aria-label="Zufälliger Name"
            title="Zufälliger Name"
            onClick={() => onName(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)])}
            className="shrink-0 w-12 rounded-2xl bg-bg-elevated border border-border-input text-text-secondary hover:text-brand hover:border-brand/50 flex items-center justify-center transition-colors"
          >
            <Shuffle size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="text-xs text-text-muted mt-1.5">Du kannst den Namen später jederzeit ändern.</p>
      </div>
      <SegmentedTabs tabs={FIGURE_TABS} value={tab} onChange={(e) => setTab(e)} label="Bereich der Figur" />
      <div
        className="space-y-5 enter"
        style={{
          '--d': 0,
        }}
        key={tab}
      >
        {tab === 'gesicht' && (
          <>
            <ColorPicker
              label="Hautton"
              colors={SKIN_COLORS}
              value={config.skin}
              onPick={(e) =>
                patch({
                  skin: e,
                })
              }
            />
            <StylePicker
              label="Gesichtsform"
              items={FACE_SHAPES}
              value={config.face}
              config={config}
              apply={(e) => ({
                face: e,
              })}
              onPick={(e) =>
                patch({
                  face: e,
                })
              }
            />
          </>
        )}
        {tab === 'haare' && (
          <>
            <StylePicker
              label="Frisur"
              items={HAIR_STYLES}
              value={config.hairStyle}
              config={config}
              apply={(e) => ({
                hairStyle: e,
              })}
              onPick={(e) =>
                patch({
                  hairStyle: e,
                })
              }
            />
            <ColorPicker
              label="Haarfarbe"
              colors={HAIR_COLORS}
              value={config.hairColor}
              onPick={(e) =>
                patch({
                  hairColor: e,
                })
              }
            />
          </>
        )}
        {tab === 'mimik' && (
          <>
            <StylePicker
              label="Augen"
              items={EYE_STYLES}
              value={config.eyes}
              config={config}
              apply={(e) => ({
                eyes: e,
              })}
              onPick={(e) =>
                patch({
                  eyes: e,
                })
              }
            />
            <StylePicker
              label="Augenbrauen"
              items={BROW_STYLES}
              value={config.brows}
              config={config}
              apply={(e) => ({
                brows: e,
              })}
              onPick={(e) =>
                patch({
                  brows: e,
                })
              }
            />
            <StylePicker
              label="Mund"
              items={MOUTH_STYLES}
              value={config.mouth}
              config={config}
              apply={(e) => ({
                mouth: e,
              })}
              onPick={(e) =>
                patch({
                  mouth: e,
                })
              }
            />
          </>
        )}
        {tab === 'stil' && (
          <>
            <StylePicker
              label="Bart"
              items={BEARD_STYLES}
              value={config.beard}
              config={config}
              apply={(e) => ({
                beard: e,
              })}
              onPick={(e) =>
                patch({
                  beard: e,
                })
              }
            />
            <ColorPicker
              label="Shirt-Farbe"
              colors={SHIRT_COLORS}
              value={config.shirt}
              onPick={(e) =>
                patch({
                  shirt: e,
                })
              }
            />
          </>
        )}
      </div>
    </div>
  )
}
export function limitCharacterName(e) {
  return e
    .replace(/^\s+/, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 16)
}
