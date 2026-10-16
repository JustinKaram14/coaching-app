// Schreibt die Zutatenliste für die Edge Function „generate-entdecken-rezept“ neu.
// Aufruf: npx tsx scripts/zutaten-fuer-edge.ts
import { writeFileSync } from 'node:fs'
import { ZUTATEN_LISTE } from '../src/lib/entdecken/zutaten'

const zeilen = ZUTATEN_LISTE.map(z => `${z.id}|${z.name}|${z.typ}${z.allergene.length ? `|${z.allergene.join(',')}` : ''}`)
const out = `// ERZEUGT aus src/lib/entdecken/zutaten.ts mit scripts/zutaten-fuer-edge.ts – nicht von Hand ändern.
// Format: id|Name|Herkunft|Allergene
export const ZUTATEN_ZEILEN: string[] = ${JSON.stringify(zeilen, null, 2)}
`
writeFileSync('supabase/functions/generate-entdecken-rezept/zutaten-liste.ts', out)
console.log(`${zeilen.length} Zutaten geschrieben`)
