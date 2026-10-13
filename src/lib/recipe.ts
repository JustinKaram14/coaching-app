// Rezept-Text → Zutatenliste und Kochschritte; Mengen auf Portionen umrechnen.
// Zutaten stehen als ein Eintrag pro Zeile, die Anleitung als nummerierte Schritte in den Rezept-Feldern.

export function parseIngredients(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split('\n')
    .map(line => line.replace(/^\s*(?:[-•*–]|\d+[.)])\s+/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)
}

export function parseSteps(text: string | null | undefined): string[] {
  if (!text) return []
  const steps: string[] = []
  let numbered = false
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\*\*/g, '').trim()
    if (!line) continue
    const match = line.match(/^(\d+)[.)]\s*(.*)$/)
    if (match) {
      numbered = true
      steps.push(match[2])
    } else if (numbered && steps.length) {
      steps[steps.length - 1] += ` ${line}`
    } else {
      steps.push(line)
    }
  }
  return steps.filter(Boolean)
}

const UNICODE_FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }

function formatAmount(value: number): string {
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 100) / 100
  return String(rounded).replace('.', ',')
}

function parseNumber(token: string): number | null {
  const text = token.trim()
  if (UNICODE_FRACTIONS[text] !== undefined) return UNICODE_FRACTIONS[text]
  const mixed = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const fraction = text.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (fraction) return Number(fraction[1]) / Number(fraction[2])
  const plain = text.replace(',', '.')
  return /^\d+(\.\d+)?$/.test(plain) ? Number(plain) : null
}

const AMOUNT = String.raw`\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔]`
const LEADING_AMOUNT = new RegExp(`^(${AMOUNT})(?:\\s*[-–]\\s*(${AMOUNT}))?(?=\\s|[a-zA-ZäöüÄÖÜ]|$)`)

// „200 g Mehl“ ×1,5 → „300 g Mehl“; Zeilen ohne führende Menge („Salz“) bleiben unverändert
export function scaleIngredient(line: string, factor: number): string {
  if (factor === 1) return line
  const match = line.match(LEADING_AMOUNT)
  if (!match) return line
  const first = parseNumber(match[1])
  if (first === null) return line
  const second = match[2] ? parseNumber(match[2]) : null
  const scaled = formatAmount(first * factor) + (second !== null ? `–${formatAmount(second * factor)}` : '')
  return scaled + line.slice(match[0].length)
}
