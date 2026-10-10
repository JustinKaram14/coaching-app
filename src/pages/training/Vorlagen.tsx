// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { addDays, addWeeks, format, getDay, parseISO } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, BookOpen, CalendarDays, ChevronDown, ChevronUp, Layers, Plus, Trash2 } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'

export const BQ = ['Kraft', 'Cardio', 'HIIT', 'Yoga', 'Stretching', 'Schwimmen', 'Radfahren', 'Laufen', 'Sonstiges']
export const VQ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
export const HQ = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  0: 7,
}
export function UQ(template) {
  let prefix = template.plan_name ? `${template.plan_name} · ` : ''
  return prefix && template.name.startsWith(prefix) && template.name.length > prefix.length ? template.name.slice(prefix.length) : template.name
}
export function WQ(text) {
  return text ? text.split(',').map(Number).filter(Boolean) : []
}
export function TrainingVorlagen({ embedded: isEmbedded = false, onBuildPlan: handleBuildPlan }) {
  let { user: authUser } = useAuth(),
    navigate = useNavigate(),
    [templates, setTemplates] = useState([]),
    [loading, setLoading] = useState(true),
    [showCreate, setShowCreate] = useState(false),
    [saving, setSaving] = useState(false),
    [draft, setDraft] = useState({
      name: '',
      trainingstyp: 'Kraft',
      wochentage: [],
    }),
    [exerciseRows, setExerciseRows] = useState([
      {
        uebungsname: '',
        saetze: '',
        wdh: '',
        gewicht_kg: '',
      },
    ]),
    [planTarget, setPlanTarget] = useState(null),
    [weeks, setWeeks] = useState('8'),
    [startDay, setStartDay] = useState(format(new Date(), 'yyyy-MM-dd')),
    [scheduling, setScheduling] = useState(false),
    [notice, setNotice] = useState('')
  async function loadTemplates() {
    if (!authUser) return
    let { data: templateRows } = await supabase.from('training_vorlagen').select('*').eq('user_id', authUser.id).order('created_at', {
      ascending: false,
    })
    if (!templateRows?.length) {
      ;(setTemplates([]), setLoading(false))
      return
    }
    let templateIds = templateRows.map((templateRow) => templateRow.id),
      { data: exerciseData } = await supabase.from('vorlagen_uebungen').select('*').in('vorlage_id', templateIds).order('reihenfolge'),
      byTemplate = (exerciseData ?? []).reduce(
        (acc, row) => (
          acc[row.vorlage_id] || (acc[row.vorlage_id] = []),
          acc[row.vorlage_id].push({
            id: row.id,
            uebungsname: row.uebungsname,
            wdh_text: row.wdh_text ?? null,
            saetze: String(row.saetze ?? ''),
            wdh: String(row.wdh ?? ''),
            gewicht_kg: String(row.gewicht_kg ?? ''),
          }),
          acc
        ),
        {},
      )
    ;(setTemplates(
      templateRows.map((templateRow) => ({
        ...templateRow,
        uebungen: byTemplate[templateRow.id] ?? [],
      })),
    ),
      setLoading(false))
  }
  useEffect(() => {
    loadTemplates()
  }, [authUser])
  function toggleWeekday(weekday) {
    setDraft((prev) => ({
      ...prev,
      wochentage: prev.wochentage.includes(weekday) ? prev.wochentage.filter((other) => other !== weekday) : [...prev.wochentage, weekday].sort(),
    }))
  }
  function addExerciseRow() {
    setExerciseRows((prev) => [
      ...prev,
      {
        uebungsname: '',
        saetze: '',
        wdh: '',
        gewicht_kg: '',
      },
    ])
  }
  function removeExerciseRow(rowIndex) {
    setExerciseRows((prev) => prev.filter((row, index) => index !== rowIndex))
  }
  function updateExerciseRow(rowIndex, field, newValue) {
    setExerciseRows((prev) => {
      let copy = [...prev]
      return (
        (copy[rowIndex] = {
          ...copy[rowIndex],
          [field]: newValue,
        }),
        copy
      )
    })
  }
  async function saveTemplate() {
    if (!authUser || !draft.name) return
    setSaving(true)
    let { data: created } = await supabase
      .from('training_vorlagen')
      .insert({
        user_id: authUser.id,
        name: draft.name,
        trainingstyp: draft.trainingstyp,
        wochentage: draft.wochentage.join(',') || null,
      })
      .select()
      .single()
    if (created) {
      let filled = exerciseRows.filter((row) => row.uebungsname.trim())
      filled.length &&
        (await supabase.from('vorlagen_uebungen').insert(
          filled.map((row, sortOrder) => ({
            vorlage_id: created.id,
            uebungsname: row.uebungsname,
            saetze: row.saetze ? parseInt(row.saetze) : null,
            wdh: row.wdh ? parseInt(row.wdh) : null,
            gewicht_kg: row.gewicht_kg ? parseFloat(row.gewicht_kg) : null,
            reihenfolge: sortOrder,
          })),
        ))
    }
    ;(await loadTemplates(),
      setShowCreate(false),
      setDraft({
        name: '',
        trainingstyp: 'Kraft',
        wochentage: [],
      }),
      setExerciseRows([
        {
          uebungsname: '',
          saetze: '',
          wdh: '',
          gewicht_kg: '',
        },
      ]),
      setSaving(false))
  }
  async function deleteTemplate(templateId) {
    ;(await supabase.from('training_vorlagen').delete().eq('id', templateId), setTemplates((list) => list.filter((template) => template.id !== templateId)))
  }
  function toggleExpanded(templateId) {
    setTemplates((list) =>
      list.map((template) =>
        template.id === templateId
          ? {
              ...template,
              expanded: !template.expanded,
            }
          : template,
      ),
    )
  }
  async function scheduleWeeks() {
    if (!authUser || !planTarget) return
    let weekdays = WQ(planTarget.wochentage)
    if (!weekdays.length) return
    setScheduling(true)
    let weekCount = parseInt(weeks) || 8,
      events = [],
      firstDay = parseISO(startDay)
    for (let week = 0; week < weekCount; week++)
      for (let weekday of weekdays) {
        let weekStart = addWeeks(firstDay, week),
          offset = weekday - HQ[getDay(weekStart)]
        offset < 0 && (offset += 7)
        let targetDate = addDays(weekStart, offset)
        format(targetDate, 'yyyy-MM-dd') >= startDay &&
          events.push({
            user_id: authUser.id,
            coach_id: authUser.id,
            client_id: authUser.id,
            titel: planTarget.name,
            datum: format(targetDate, 'yyyy-MM-dd'),
            typ: 'training',
          })
      }
    let unique = events.filter((event, position, all) => all.findIndex((other) => other.datum === event.datum) === position || true)
    ;(await supabase.from('kalender_events').insert(unique),
      setScheduling(false),
      setPlanTarget(null),
      setNotice(`${unique.length} Kalendereinträge erstellt.`),
      window.setTimeout(() => setNotice(''), 4e3))
  }
  let grouped = (() => {
      let planMap = new Map(),
        singles = []
      for (let template of templates) template.plan_name ? (planMap.get(template.plan_name) ?? planMap.set(template.plan_name, []).get(template.plan_name)).push(template) : singles.push(template)
      for (let planTemplates of planMap.values()) planTemplates.sort((first, second) => (first.plan_reihenfolge ?? 0) - (second.plan_reihenfolge ?? 0))
      return {
        plans: [...planMap],
        single: singles,
      }
    })(),
    renderTemplate = (template, position) => {
      let weekdays = WQ(template.wochentage)
      return (
        <div
          className="card enter"
          style={{
            '--d': 60 + position * 55,
          }}
          key={template.id}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text-primary truncate">{UQ(template)}</div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="text-xs text-text-muted">
                  {template.trainingstyp} · {template.uebungen?.length ?? 0} Übungen
                </span>
                {weekdays.length > 0 && (
                  <div className="flex gap-1">
                    {VQ.map((dayLabel, dayIndex) => (
                      <span
                        className={`text-xs w-5 h-5 rounded flex items-center justify-center font-medium ${weekdays.includes(dayIndex + 1) ? 'bg-brand/20 text-brand' : 'text-text-muted'}`}
                        key={dayLabel}
                      >
                        {dayLabel[0]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {weekdays.length > 0 && (
                <button
                  onClick={() => setPlanTarget(template)}
                  className="p-1.5 rounded-lg hover:bg-success/10 hover:text-success text-text-muted transition-colors"
                  title="Im Kalender eintragen"
                  aria-label="Im Kalender eintragen"
                >
                  <CalendarDays size={16} />
                </button>
              )}
              <button
                onClick={() => toggleExpanded(template.id)}
                className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
                aria-label={template.expanded ? 'Übungen ausblenden' : 'Übungen anzeigen'}
              >
                {template.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button
                onClick={() => deleteTemplate(template.id)}
                className="p-1.5 rounded-lg hover:bg-danger/10 hover:text-danger text-text-muted transition-colors"
                aria-label="Vorlage löschen"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          {template.expanded && (template.uebungen?.length ?? 0) > 0 && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              {template.uebungen.map((exercise, exerciseIndex) => (
                <div
                  className="flex items-center justify-between gap-3 text-sm p-2.5 rounded-xl bg-bg-elevated"
                  key={exerciseIndex}
                >
                  <span className="font-medium text-text-primary min-w-0 truncate">{exercise.uebungsname}</span>
                  <span className="text-text-secondary text-xs whitespace-nowrap">
                    {exercise.saetze && (exercise.wdh_text || exercise.wdh) ? `${exercise.saetze}×${exercise.wdh_text || exercise.wdh}` : ''}
                    {exercise.gewicht_kg ? ` @ ${exercise.gewicht_kg}kg` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {isEmbedded ? (
          <p className="text-text-secondary text-sm">Deine Trainingstage zum Starten und für den Kalender.</p>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/training')}
              className="p-2 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Zurück"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="section-title text-2xl">Trainingsvorlagen</h1>
              <p className="text-text-secondary text-sm mt-0.5">Push Day, Pull Day, Legs…</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {handleBuildPlan && (
            <button onClick={handleBuildPlan} className="btn-secondary flex items-center gap-2 text-sm">
              <Layers size={16} /> Eigenen Plan bauen
            </button>
          )}
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Vorlage erstellen
          </button>
        </div>
      </div>
      {notice && (
        <div className="card !p-4 border-success/40 bg-success/5 text-sm text-text-primary enter" role="status">
          {notice}
        </div>
      )}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : templates.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={BookOpen}
              title="Noch keine Vorlagen"
              description="Erstelle eine Vorlage für deinen typischen Trainingstag oder baue dir einen kompletten Plan aus dem Übungspool."
              action={
                handleBuildPlan ? (
                  <button onClick={handleBuildPlan} className="btn-primary flex items-center gap-2 mx-auto">
                    <Layers size={16} /> Eigenen Plan bauen
                  </button>
                ) : (
                  <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 mx-auto">
                    <Plus size={16} /> Erste Vorlage erstellen
                  </button>
                )
              }
            />
          </div>
        ) : (
          <>
            {grouped.plans.map(([planName, planDays]) => (
              <section className="space-y-3" aria-label={`Plan ${planName}`} key={planName}>
                <div className="flex items-center gap-2 px-1">
                  <Layers size={16} className="text-brand" aria-hidden="true" />
                  <h2 className="section-title text-base">{planName}</h2>
                  <span className="text-xs text-text-muted">
                    {planDays.length} {planDays.length === 1 ? 'Tag' : 'Tage'}
                  </span>
                </div>
                {planDays.map((template, position) => renderTemplate(template, position))}
              </section>
            ))}
            {grouped.single.length > 0 && (
              <section className="space-y-3" aria-label="Einzelne Vorlagen">
                {grouped.plans.length > 0 && <h2 className="section-title text-base px-1">Einzelne Vorlagen</h2>}
                {grouped.single.map((template, position) => renderTemplate(template, position))}
              </section>
            )}
          </>
        )}
      </div>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Vorlage erstellen" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input
                type="text"
                className="input"
                placeholder="z.B. Push Day"
                value={draft.name}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                autoFocus
              />
            </div>
            <div>
              <label className="label">Typ</label>
              <select
                className="input"
                value={draft.trainingstyp}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    trainingstyp: event.target.value,
                  }))
                }
              >
                {BQ.map((trainingType) => (
                  <option key={trainingType}>{trainingType}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Wiederkehrende Tage (optional)</label>
            <div className="flex gap-2">
              {VQ.map((dayLabel, dayIndex) => (
                <button
                  type="button"
                  onClick={() => toggleWeekday(dayIndex + 1)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${draft.wochentage.includes(dayIndex + 1) ? 'bg-brand/20 text-brand border-brand/40' : 'bg-bg-elevated text-text-muted border-border hover:border-border-light'}`}
                  key={dayLabel}
                >
                  {dayLabel}
                </button>
              ))}
            </div>
            {draft.wochentage.length > 0 && (
              <p className="text-xs text-text-muted mt-1.5">
                Jede Woche: {draft.wochentage.map((day) => VQ[day - 1]).join(', ')} — du kannst diese Tage dann automatisch im
                Kalender eintragen lassen.
              </p>
            )}
          </div>
          <div className="border-t border-border pt-4">
            <div className="text-sm font-medium text-text-primary mb-3">Übungen</div>
            <div className="space-y-3">
              {exerciseRows.map((row, rowIndex) => (
                <div className="p-3 bg-bg-elevated rounded-lg space-y-2" key={rowIndex}>
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 text-sm py-2"
                      placeholder="Übungsname (z.B. Bankdrücken)"
                      value={row.uebungsname}
                      onChange={(event) => updateExerciseRow(rowIndex, 'uebungsname', event.target.value)}
                    />
                    <button
                      onClick={() => removeExerciseRow(rowIndex)}
                      className="p-2 rounded hover:bg-danger/10 hover:text-danger text-text-muted"
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
                        placeholder="4"
                        value={row.saetze}
                        onChange={(event) => updateExerciseRow(rowIndex, 'saetze', event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Wdh.</label>
                      <input
                        type="number"
                        className="input text-sm py-2"
                        placeholder="8"
                        value={row.wdh}
                        onChange={(event) => updateExerciseRow(rowIndex, 'wdh', event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Gewicht (kg)</label>
                      <input
                        type="number"
                        step="0.5"
                        className="input text-sm py-2"
                        placeholder="80"
                        value={row.gewicht_kg}
                        onChange={(event) => updateExerciseRow(rowIndex, 'gewicht_kg', event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addExerciseRow} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                <Plus size={14} /> Übung hinzufügen
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-border">
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
              Abbrechen
            </button>
            <button
              onClick={saveTemplate}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={saving || !draft.name}
            >
              {saving && <Spinner size={16} />}Vorlage speichern
            </button>
          </div>
        </div>
      </Modal>
      <Modal open={!!planTarget} onClose={() => setPlanTarget(null)} title="Im Kalender eintragen">
        {planTarget && (
          <div className="space-y-4">
            <div className="p-3 bg-brand/5 border border-brand/20 rounded-xl">
              <div className="font-medium text-text-primary">{planTarget.name}</div>
              <div className="text-xs text-text-muted mt-0.5">
                Tage:{' '}
                {WQ(planTarget.wochentage)
                  .map((day) => VQ[day - 1])
                  .join(', ')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Startdatum</label>
                <input type="date" className="input" value={startDay} onChange={(event) => setStartDay(event.target.value)} />
              </div>
              <div>
                <label className="label">Wie viele Wochen?</label>
                <input type="number" className="input" min="1" max="52" value={weeks} onChange={(event) => setWeeks(event.target.value)} />
              </div>
            </div>
            <p className="text-xs text-text-muted">
              Es werden ca. {WQ(planTarget.wochentage).length * (parseInt(weeks) || 8)} Kalendereinträge erstellt. Jeder kann danach
              einzeln bearbeitet oder gelöscht werden.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setPlanTarget(null)} className="btn-secondary flex-1">
                Abbrechen
              </button>
              <button onClick={scheduleWeeks} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={scheduling}>
                {scheduling && <Spinner size={16} />}Einträge erstellen
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
