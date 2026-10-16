import type { Rezept, RezeptDef } from './types'
import { berechneRezept } from './engine'
import { FRUEHSTUECK } from './start/fruehstueck'
import { SNACKS } from './start/snacks'
import { SALATE_SUPPEN } from './start/salate-suppen'
import { HAUPTGERICHTE } from './start/hauptgerichte'

export const START_DEFS: RezeptDef[] = [...FRUEHSTUECK, ...SNACKS, ...SALATE_SUPPEN, ...HAUPTGERICHTE]

export const START_REZEPTE: Rezept[] = START_DEFS.map(berechneRezept)
