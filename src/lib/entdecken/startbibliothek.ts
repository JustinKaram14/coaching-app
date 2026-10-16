import type { Rezept, RezeptDef } from './types'
import { berechneRezept } from './engine'
import { FRUEHSTUECK } from './start/fruehstueck'
import { SNACKS } from './start/snacks'
import { SALATE_SUPPEN } from './start/salate-suppen'
import { HAUPTGERICHTE } from './start/hauptgerichte'
import { DARM } from './start/darm'

export const START_DEFS: RezeptDef[] = [...FRUEHSTUECK, ...SNACKS, ...SALATE_SUPPEN, ...HAUPTGERICHTE, ...DARM]

export const START_REZEPTE: Rezept[] = START_DEFS.map(berechneRezept)
