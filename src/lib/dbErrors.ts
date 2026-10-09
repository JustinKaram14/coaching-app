// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.

export const isMissingColumn = (e) =>
  !!e && /column|schema cache|PGRST204|42703/i.test(`${e.message ?? ''} ${e.code ?? ''}`)
export function omitKeys(e, t) {
  return Object.fromEntries(Object.entries(e).filter(([e]) => !t.includes(e)))
}
export const isMissingTable = (e) =>
  !!e &&
  (/42P01|PGRST205|does not exist|schema cache/i.test(`${e.code ?? ''} ${e.message ?? ''}`) || isMissingColumn(e))
