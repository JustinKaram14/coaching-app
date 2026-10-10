// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.

export const isMissingColumn = (error) =>
  !!error && /column|schema cache|PGRST204|42703/i.test(`${error.message ?? ''} ${error.code ?? ''}`)
export function omitKeys(object, keys) {
  return Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)))
}
export const isMissingTable = (error) =>
  !!error &&
  (/42P01|PGRST205|does not exist|schema cache/i.test(`${error.code ?? ''} ${error.message ?? ''}`) || isMissingColumn(error))
