// Kostenprognose ohne KI: feste Preistabelle (€ pro kg bzw. Liter) als Spanne Discounter bis Supermarkt.
// Richtwerte für Deutschland, gerundet; tatsächliche Preise schwanken nach Saison, Marke und Angebot.
// Eigene Rezepte (YouTube, Instagram, TikTok, eigene Eingabe) werden aus dem Zutatentext gelesen.

import { ZUTATEN, ZUTATEN_LISTE } from '../entdecken/zutaten'

/** [Discounter, Supermarkt] in € pro kg bzw. Liter */
export type Spanne = [number, number]

// ─── Preise der Entdecken-Zutaten ────────────────────────────────────────────

const PREIS_ZUTAT: Record<string, Spanne> = {
  tomate: [2, 3.5], kirschtomaten: [4, 7], tomaten_stueckig: [1.2, 2.2], tomatenmark: [3.5, 6], gurke: [2, 3.3],
  paprika: [3.5, 5.5], zwiebel: [1, 2], rote_zwiebel: [1.8, 3], knoblauch: [6, 10], karotte: [1, 2], brokkoli: [3, 5],
  spinat: [3.5, 7], gruenkohl: [3, 5], zucchini: [2, 3.5], aubergine: [2.5, 4], blumenkohl: [2.5, 4], weisskohl: [1, 1.8],
  rotkohl: [1.2, 2], suesskartoffel: [2.5, 4], kartoffel: [1, 2], kuerbis: [1.8, 3], lauch: [2, 3.5], champignons: [4, 6.5],
  rucola: [10, 16], blattsalat: [3, 5], avocado: [6, 9], rote_bete: [2, 4], topinambur: [5, 8], chicoree: [4, 6],
  spargel: [10, 16], fenchel: [3, 5], mais: [2.5, 4.5], erbsen: [2.5, 4], gruene_bohnen: [3, 5], ingwer: [5, 9],
  petersilie: [15, 25], basilikum: [20, 35], schnittlauch: [15, 25], minze: [20, 35], kimchi: [10, 16], sauerkraut: [1.5, 3],
  zitronensaft: [3, 5], oliven: [7, 12], apfel: [2, 3.5], banane: [1.3, 2], heidelbeeren: [10, 16], himbeeren: [12, 20],
  erdbeeren: [5, 9], orange: [2, 3], mango: [4, 6], kiwi: [3, 5], birne: [2.5, 4], datteln: [6, 10], ananas: [2, 3.5],
  haferflocken: [1, 2], vollkornbrot: [2.5, 5], vollkorn_nudeln: [1.8, 3.5], nudeln: [1.4, 3], vollkornreis: [2.5, 4],
  basmatireis: [2.5, 4.5], quinoa: [7, 12], couscous: [2.5, 4.5], bulgur: [2.5, 4.5], hirse: [3, 5], buchweizen: [4, 7],
  reisnudeln: [5, 8], wrap: [4, 7], polenta: [2, 4], vollkornmehl: [1.2, 2.2], backpulver: [8, 15],
  kichererbsen: [2, 3.5], linsen_rot: [3, 5], linsen_braun: [2.5, 4.5], kidneybohnen: [2, 3.5], weisse_bohnen: [2, 3.5],
  tofu: [6, 10], raeuchertofu: [8, 12], edamame: [8, 12], tempeh: [14, 20], sojadrink: [1.2, 2.2], miso: [15, 25],
  sojasauce: [5, 10], mandeln: [10, 16], walnuesse: [12, 20], cashews: [12, 20], haselnuesse: [12, 20], mandelmus: [18, 30],
  erdnussmus: [6, 10], sonnenblumenkerne: [4, 7], kuerbiskerne: [9, 15], chiasamen: [8, 14], leinsamen: [3, 6], sesam: [6, 10],
  tahini: [12, 20], olivenoel: [8, 14], rapsoel: [2, 3.5], kokosoel: [8, 14], kokosmilch: [3, 5.5],
  ei: [4.5, 6.5], joghurt: [1.5, 3], skyr: [3, 5], magerquark: [2.5, 4], huettenkaese: [5, 8], frischkaese: [6, 10],
  mozzarella: [6, 10], feta: [9, 14], parmesan: [17, 28], gouda: [8, 13], milch: [1, 1.6], kefir: [2, 3.5],
  buttermilch: [1.2, 2], sahne: [4, 6], butter: [8, 11], haehnchenbrust: [9, 14], putenbrust: [10, 16], rinderhack: [9, 14],
  rinderfilet: [32, 55], schweinefilet: [12, 18], kochschinken: [12, 20], lachs: [20, 30], raeucherlachs: [25, 40],
  thunfisch: [8, 14], forelle: [18, 28], kabeljau: [12, 22], makrele: [12, 18], sardinen: [8, 14], garnelen: [20, 32],
  honig: [8, 14], ahornsirup: [20, 35], kakao: [10, 18], kurkuma: [20, 40], zimt: [20, 40], gewuerze: [25, 50],
  salz: [0.5, 1.5], senf: [3, 6], balsamico: [3, 8], gemuesebruehe: [0.3, 0.6], wasser: [0, 0],
}

// ─── Zusätzliche Lebensmittel für frei geschriebene Rezepte ──────────────────

export interface ExtraArtikel {
  /** Anzeigename auf der Einkaufsliste */
  name: string
  preis: Spanne
  bereich: string
  /** Gewicht eines Stücks in g */
  stueck?: number
}

const EXTRA: Record<string, ExtraArtikel> = {
  kraeuter_frisch: { name: 'Frische Kräuter', preis: [20, 35], bereich: 'Obst & Gemüse', stueck: 10 },
  zitrone: { name: 'Zitronen', preis: [3, 5], bereich: 'Obst & Gemüse', stueck: 100 },
  limette: { name: 'Limetten', preis: [5, 8], bereich: 'Obst & Gemüse', stueck: 70 },
  fruehlingszwiebel: { name: 'Frühlingszwiebeln', preis: [6, 10], bereich: 'Obst & Gemüse', stueck: 15 },
  schalotte: { name: 'Schalotten', preis: [4, 6], bereich: 'Obst & Gemüse', stueck: 30 },
  chili_frisch: { name: 'Chilischoten', preis: [15, 25], bereich: 'Obst & Gemüse', stueck: 10 },
  sellerie: { name: 'Sellerie', preis: [2, 4], bereich: 'Obst & Gemüse', stueck: 60 },
  salat_eisberg: { name: 'Eisbergsalat', preis: [2, 3.5], bereich: 'Obst & Gemüse', stueck: 500 },
  obst: { name: 'Obst', preis: [2.5, 5], bereich: 'Obst & Gemüse', stueck: 150 },
  gemuese: { name: 'Gemüse (gemischt)', preis: [2.5, 4], bereich: 'Obst & Gemüse' },
  gewuerzgurken: { name: 'Gewürzgurken', preis: [3, 5], bereich: 'Konserven & Vorrat', stueck: 40 },
  eiklar: { name: 'Eiklar', preis: [4, 6], bereich: 'Milch & Eier' },
  kondensmilch: { name: 'Kondensmilch', preis: [2, 3.5], bereich: 'Milch & Eier' },
  lamm: { name: 'Lammfleisch', preis: [18, 28], bereich: 'Fleisch & Fisch' },
  steak: { name: 'Steak (Hüfte)', preis: [20, 32], bereich: 'Fleisch & Fisch', stueck: 200 },
  fisch: { name: 'Fisch', preis: [12, 22], bereich: 'Fleisch & Fisch', stueck: 125 },
  fleisch: { name: 'Fleisch', preis: [8, 14], bereich: 'Fleisch & Fisch' },
  linsenwaffeln: { name: 'Linsen-/Reiswaffeln', preis: [8, 12], bereich: 'Brot, Getreide & Nudeln', stueck: 8 },
  proteinpulver: { name: 'Proteinpulver', preis: [20, 35], bereich: 'Konserven & Vorrat' },
  ballaststoffe: { name: 'Kleie / Flohsamenschalen', preis: [8, 15], bereich: 'Brot, Getreide & Nudeln' },
  kaese: { name: 'Käse', preis: [9, 14], bereich: 'Milch & Eier' },
  mascarpone: { name: 'Mascarpone', preis: [7, 11], bereich: 'Milch & Eier' },
  ricotta: { name: 'Ricotta', preis: [6, 10], bereich: 'Milch & Eier' },
  saure_sahne: { name: 'Saure Sahne / Schmand', preis: [3.5, 6], bereich: 'Milch & Eier' },
  griech_joghurt: { name: 'Griechischer Joghurt', preis: [3, 5], bereich: 'Milch & Eier' },
  speck: { name: 'Speck', preis: [10, 16], bereich: 'Fleisch & Fisch' },
  salami: { name: 'Salami / Chorizo', preis: [12, 20], bereich: 'Fleisch & Fisch' },
  hackfleisch: { name: 'Hackfleisch', preis: [7, 11], bereich: 'Fleisch & Fisch' },
  haehnchen: { name: 'Hähnchen', preis: [6, 10], bereich: 'Fleisch & Fisch' },
  rindfleisch: { name: 'Rindfleisch', preis: [14, 24], bereich: 'Fleisch & Fisch' },
  schweinefleisch: { name: 'Schweinefleisch', preis: [7, 12], bereich: 'Fleisch & Fisch' },
  wurst: { name: 'Würstchen', preis: [7, 12], bereich: 'Fleisch & Fisch', stueck: 50 },
  lasagne: { name: 'Lasagneplatten', preis: [2, 4], bereich: 'Brot, Getreide & Nudeln' },
  gnocchi: { name: 'Gnocchi', preis: [3, 5], bereich: 'Brot, Getreide & Nudeln' },
  mehl: { name: 'Mehl', preis: [0.7, 1.5], bereich: 'Brot, Getreide & Nudeln' },
  brot: { name: 'Brot / Brötchen', preis: [2.5, 5], bereich: 'Brot, Getreide & Nudeln', stueck: 60 },
  teig: { name: 'Blätterteig / Pizzateig', preis: [4, 6], bereich: 'Brot, Getreide & Nudeln', stueck: 275 },
  zucker: { name: 'Zucker', preis: [1, 1.8], bereich: 'Konserven & Vorrat' },
  passata: { name: 'Passierte Tomaten', preis: [1.2, 2.2], bereich: 'Konserven & Vorrat' },
  sosse: { name: 'Ketchup / Mayonnaise', preis: [3, 6], bereich: 'Konserven & Vorrat' },
  pesto: { name: 'Pesto', preis: [8, 14], bereich: 'Konserven & Vorrat' },
  wuerzsauce: { name: 'Würzsaucen', preis: [8, 14], bereich: 'Konserven & Vorrat' },
  schokolade: { name: 'Schokolade', preis: [7, 14], bereich: 'Konserven & Vorrat' },
  vanille: { name: 'Vanillezucker / Vanille', preis: [15, 30], bereich: 'Öle & Gewürze' },
  hefe: { name: 'Hefe', preis: [3, 6], bereich: 'Konserven & Vorrat', stueck: 42 },
  essig: { name: 'Essig', preis: [1.5, 4], bereich: 'Öle & Gewürze' },
  sesamoel: { name: 'Sesamöl', preis: [12, 20], bereich: 'Öle & Gewürze' },
  wein: { name: 'Wein (zum Kochen)', preis: [4, 8], bereich: 'Konserven & Vorrat' },
  nuesse: { name: 'Nüsse', preis: [10, 18], bereich: 'Nüsse, Samen & Trockenfrüchte' },
  erdnuesse: { name: 'Erdnüsse', preis: [6, 10], bereich: 'Nüsse, Samen & Trockenfrüchte' },
  trockenobst: { name: 'Rosinen / Trockenobst', preis: [5, 9], bereich: 'Nüsse, Samen & Trockenfrüchte' },
  kokosraspel: { name: 'Kokosraspeln', preis: [6, 10], bereich: 'Nüsse, Samen & Trockenfrüchte' },
}

// ─── Suchwörter → Zutat ──────────────────────────────────────────────────────

export function norm(text: string): string {
  return text.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[éè]/g, 'e').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Kein Einkauf: Nahrungsergänzung, Wasser */
const IGNORIERT = /\b(magnesium|vitamin|omega 3 kapseln|zink|kreatin|wasser|leitungswasser|eiswuerfel)\b/

/** Ergebnis der Zuordnung: Entdecken-Zutat (`id`) oder Zusatzartikel (`x:schluessel`) */
type Ziel = string

const WOERTER: [string, Ziel][] = []
const wort = (ziel: Ziel, ...begriffe: string[]) => begriffe.forEach(b => WOERTER.push([norm(b), ziel]))

// Gängige Schreibweisen aus Rezepten im Internet (zuerst, damit sie bei gleich langen Begriffen Vorrang haben)
wort('nudeln', 'nudeln', 'eiernudeln', 'mie nudeln', 'glasnudeln', 'pasta', 'spaghetti', 'penne', 'fusilli', 'tagliatelle', 'linguine', 'rigatoni', 'farfalle', 'makkaroni', 'maccheroni', 'bandnudeln', 'spätzle', 'orzo', 'tortellini')
wort('vollkorn_nudeln', 'vollkornpasta', 'vollkornspaghetti')
wort('basmatireis', 'reis', 'jasminreis', 'langkornreis', 'risottoreis', 'milchreis', 'sushireis')
wort('vollkornreis', 'naturreis')
wort('haehnchenbrust', 'hähnchenbrustfilet', 'hühnerbrust', 'hähnchenfilet', 'hühnchenbrust', 'chicken')
wort('putenbrust', 'putenfilet', 'putenschnitzel', 'pute', 'putenbruststreifen', 'putenhack')
wort('rinderhack', 'rinderhackfleisch')
wort('rinderfilet', 'rindersteak', 'steak', 'entrecote', 'rumpsteak')
wort('schweinefilet', 'schweinelende')
wort('kochschinken', 'schinken')
wort('lachs', 'lachs', 'lachsfilet')
wort('makrele', 'makrele', 'makrelen')
wort('forelle', 'forelle', 'forellen')
wort('kabeljau', 'kabeljau', 'seelachs', 'fischfilet', 'alaska seelachs')
wort('garnelen', 'shrimps', 'scampi', 'krabben', 'riesengarnelen')
wort('olivenoel', 'olivenöl extra vergine')
wort('rapsoel', 'kochspray', 'avocado kochspray', 'öl', 'sonnenblumenöl', 'pflanzenöl', 'speiseöl', 'bratöl')
wort('butter', 'margarine', 'butterschmalz')
wort('sahne', 'schlagsahne', 'kochsahne', 'schlagobers')
wort('milch', 'vollmilch', 'fettarme milch')
wort('joghurt', 'naturjoghurt', 'probiotika')
wort('magerquark', 'quark', 'speisequark')
wort('frischkaese', 'frischkäse', 'philadelphia')
wort('gouda', 'emmentaler', 'cheddar', 'bergkäse', 'mozzarella gerieben', 'reibekäse', 'gratinkäse', 'pizzakäse')
wort('parmesan', 'grana padano', 'pecorino')
wort('feta', 'schafskäse', 'hirtenkäse', 'feta käse')
wort('ei', 'eier', 'eigelb', 'vollei', 'spiegelei', 'spiegeleier', 'rührei', 'gekochte eier')
wort('tomaten_stueckig', 'gehackte tomaten', 'geschälte tomaten', 'dosentomaten', 'tomaten aus der dose', 'pizzatomaten')
wort('kartoffel', 'kartoffeln', 'drillinge', 'salzkartoffeln', 'pellkartoffeln', 'bratkartoffeln', 'ofenkartoffeln', 'kartoffelpüree')
wort('karotte', 'möhre', 'möhren', 'karotten')
wort('zwiebel', 'zwiebeln', 'gemüsezwiebel')
wort('knoblauch', 'knoblauchzehe', 'knoblauchzehen', 'knoblauchpulver')
wort('paprika', 'paprikaschote', 'paprikaschoten')
wort('champignons', 'pilze', 'champignon', 'egerlinge')
wort('spinat', 'babyspinat', 'blattspinat')
wort('blattsalat', 'salat', 'kopfsalat', 'romanasalat', 'feldsalat', 'salatherz')
wort('gurke', 'salatgurke')
wort('mais', 'zuckermais')
wort('kidneybohnen', 'bohnen', 'schwarze bohnen')
wort('gemuesebruehe', 'brühe', 'gemüsebrühe', 'hühnerbrühe', 'rinderbrühe', 'fond', 'brühwürfel', 'gemüsefond', 'instantbrühe')
wort('gewuerze', 'pfeffer', 'schwarzer pfeffer', 'paprikapulver', 'chiliflocken', 'chilipulver', 'cayennepfeffer', 'oregano', 'thymian', 'rosmarin',
  'kreuzkümmel', 'kümmel', 'curry', 'currypulver', 'garam masala', 'muskat', 'muskatnuss', 'lorbeer', 'lorbeerblatt', 'majoran', 'italienische kräuter',
  'kräuter der provence', 'gewürz', 'zimtstange', 'nelken', 'koriander gemahlen', 'cumin', 'chili flocken', 'pul biber', 'za atar', 'sumach')
wort('honig', 'agavendicksaft', 'sirup')
wort('sojasauce', 'sojasoße', 'tamari', 'soja sauce')
wort('kokosmilch', 'kokosnussmilch')
wort('zitronensaft', 'limettensaft')
wort('balsamico', 'balsamicoessig', 'aceto balsamico')
wort('haferflocken', 'hafer', 'porridge')
wort('vollkornbrot', 'vollkornbrötchen', 'vollkorntoast')
wort('wrap', 'wraps', 'tortilla', 'tortillas', 'tortillafladen')
wort('tofu', 'naturtofu', 'seidentofu')
wort('linsen_rot', 'rote linsen')
wort('linsen_braun', 'linsen', 'tellerlinsen', 'belugalinsen')
wort('kichererbsen', 'kichererbse')
wort('erdnussmus', 'erdnussbutter')
wort('kakao', 'kakaopulver', 'backkakao')
wort('avocado', 'avocados')

wort('x:kraeuter_frisch', 'koriander', 'dill', 'frische kräuter', 'kräuter', 'thai basilikum', 'estragon', 'salbei', 'bärlauch', 'kresse')
wort('x:zitrone', 'zitrone', 'zitronen', 'bio zitrone', 'zitronenschale', 'zitronenabrieb')
wort('x:limette', 'limette', 'limetten')
wort('x:fruehlingszwiebel', 'frühlingszwiebel', 'frühlingszwiebeln', 'lauchzwiebel', 'lauchzwiebeln')
wort('x:schalotte', 'schalotte', 'schalotten')
wort('x:chili_frisch', 'chili', 'chilischote', 'chilischoten', 'jalapeno', 'peperoni')
wort('x:sellerie', 'sellerie', 'staudensellerie', 'knollensellerie', 'stangensellerie')
wort('x:salat_eisberg', 'eisbergsalat')
wort('x:gemuese', 'gemüse', 'tk gemüse', 'tiefkühlgemüse', 'gemüsemischung', 'pfannengemüse', 'ofengemüse', 'wokgemüse', 'wok gemüse', 'kaisergemüse', 'suppengrün', 'grillgemüse', 'gemüsepfanne')
wort('x:obst', 'obst', 'früchte', 'beeren', 'tk beeren', 'obstsalat')
wort('x:gewuerzgurken', 'gewürzgurken', 'gewürzgurke', 'essiggurken', 'cornichons')
wort('x:eiklar', 'eiklar', 'eiweiß flüssig')
wort('x:kondensmilch', 'kondensmilch')
wort('x:lamm', 'lamm', 'lammkotelett', 'lammkoteletts', 'lammfilet', 'lammhack')
wort('x:steak', 'hüftsteak', 'rinderhüftsteak', 'rinderhüfte')
wort('x:fisch', 'fisch', 'saibling', 'saiblingfilet', 'zander', 'dorsch', 'tilapia', 'pangasius', 'thunfischsteak', 'wildlachs', 'wildlachsfilet')
wort('x:fleisch', 'fleisch', 'proteinquelle')
wort('x:linsenwaffeln', 'linsenwaffeln', 'reiswaffeln', 'maiswaffeln', 'linsenwaffel', 'reiswaffel')
wort('x:proteinpulver', 'whey', 'proteinpulver', 'eiweißpulver', 'reis protein', 'whey isolat', 'casein')
wort('x:ballaststoffe', 'kleie', 'haferkleie', 'flohsamenschalen', 'flohsamen')
wort('x:kaese', 'käse', 'reibkäse', 'halloumi', 'burrata', 'camembert', 'brie', 'ziegenkäse')
wort('x:mascarpone', 'mascarpone')
wort('x:ricotta', 'ricotta')
wort('x:saure_sahne', 'saure sahne', 'schmand', 'creme fraiche', 'crème fraîche', 'creme fraîche', 'sauerrahm', 'creme legere')
wort('x:griech_joghurt', 'griechischer joghurt', 'griechischen joghurt', 'joghurt griechischer art')
wort('x:speck', 'speck', 'bacon', 'speckwürfel', 'schinkenwürfel', 'pancetta', 'guanciale')
wort('x:salami', 'salami', 'chorizo', 'pepperoni salami')
wort('x:hackfleisch', 'hackfleisch', 'gemischtes hackfleisch', 'hack', 'schweinehack', 'hackfleisch gemischt')
wort('x:haehnchen', 'hähnchen', 'hähnchenschenkel', 'hähnchenkeulen', 'hähnchenoberschenkel', 'hühnchen', 'chicken wings', 'huhn', 'hähnchenteile')
wort('x:rindfleisch', 'rindfleisch', 'gulasch', 'rindergulasch', 'roastbeef', 'beef')
wort('x:schweinefleisch', 'schweinefleisch', 'schnitzel', 'schweineschnitzel', 'schweinenacken', 'kotelett', 'pulled pork', 'schweinebauch')
wort('x:wurst', 'würstchen', 'wurst', 'bratwurst', 'wiener', 'frankfurter', 'cabanossi')
wort('x:lasagne', 'lasagneplatten', 'lasagneblätter', 'lasagne platten')
wort('x:gnocchi', 'gnocchi', 'schupfnudeln')
wort('x:mehl', 'getreide', 'mehl', 'weizenmehl', 'dinkelmehl', 'speisestärke', 'stärke', 'maisstärke', 'semmelbrösel', 'paniermehl', 'grieß')
wort('x:brot', 'sauerteigbrot', 'roggenbrot', 'dinkelbrot', 'brot', 'brötchen', 'toast', 'toastbrot', 'baguette', 'ciabatta', 'fladenbrot', 'pitabrot', 'pita', 'burger brötchen', 'buns', 'naan')
wort('x:teig', 'blätterteig', 'pizzateig', 'filoteig', 'yufkateig', 'mürbeteig')
wort('x:zucker', 'zucker', 'brauner zucker', 'rohrzucker', 'puderzucker', 'kokosblütenzucker', 'erythrit')
wort('x:passata', 'passierte tomaten', 'passata', 'tomatensauce', 'tomatensoße')
wort('x:sosse', 'dressing', 'salatdressing', 'ketchup', 'mayonnaise', 'mayo', 'barbecuesauce', 'bbq sauce', 'remoulade', 'senf mayonnaise')
wort('x:pesto', 'pesto', 'pesto rosso', 'pesto genovese')
wort('x:wuerzsauce', 'sriracha', 'worcestersauce', 'fischsauce', 'austernsauce', 'hoisinsauce', 'teriyakisauce', 'sweet chili sauce', 'currypaste', 'harissa', 'tabasco', 'gochujang')
wort('x:schokolade', 'schokolade', 'zartbitterschokolade', 'schokodrops', 'kuvertüre', 'nutella')
wort('x:vanille', 'vanillezucker', 'vanille', 'vanilleextrakt', 'vanilleschote', 'bourbon vanille')
wort('x:hefe', 'hefe', 'trockenhefe', 'frischhefe')
wort('x:essig', 'essig', 'weißweinessig', 'apfelessig', 'reisessig', 'rotweinessig')
wort('x:sesamoel', 'sesamöl', 'trüffelöl', 'leinöl', 'walnussöl')
wort('x:wein', 'weißwein', 'rotwein', 'wein')
wort('x:nuesse', 'nüsse', 'pinienkerne', 'pistazien', 'pekannüsse', 'macadamia', 'nussmischung')
wort('x:erdnuesse', 'erdnüsse', 'erdnuss')
wort('x:trockenobst', 'rosinen', 'cranberries', 'getrocknete tomaten', 'aprikosen getrocknet', 'trockenobst')
wort('x:kokosraspel', 'kokosraspeln', 'kokosflocken')

for (const z of ZUTATEN_LISTE) {
  if (z.id === 'wasser') continue
  wort(z.id, z.name.replace(/\(.*?\)/g, ''), ...(z.plural ? [z.plural] : []), ...z.alias)
}

// Längere Begriffe zuerst, damit „Olivenöl“ nicht als „Oliven“ und „rote Linsen“ nicht als „Linsen“ zählt
WOERTER.sort((a, b) => b[0].length - a[0].length)

/** Findet die Zutat im Text: der früheste Treffer gewinnt, bei gleicher Stelle der längere Begriff */
export function findeZutat(text: string): Ziel | null {
  const t = ` ${norm(text)} `
  let best: { pos: number; len: number; ziel: Ziel } | null = null
  for (const [w, ziel] of WOERTER) {
    if (!w) continue
    // Kurze Begriffe (Ei, Öl) nur als ganzes Wort, sonst am Wortanfang (Knoblauchzehen → Knoblauch)
    // (Begriffe sind normalisiert und enthalten nur a–z, Ziffern und Leerzeichen)
    const pos = w.length <= 3 ? t.search(new RegExp(` ${w}(?:er|s|n)? `)) : t.indexOf(` ${w}`)
    if (pos < 0) continue
    if (!best || pos < best.pos || (pos === best.pos && w.length > best.len)) best = { pos, len: w.length, ziel }
  }
  if (best) return best.ziel
  // Zusammengesetzte Wörter wie „Schmetterlingsnudeln“ oder „Hühnerbrühe“: Begriff am Wortende
  for (const [w, ziel] of WOERTER) {
    if (w.length >= 5 && !w.includes(' ') && new RegExp(`[a-z]${w}(?:n|s|en)? `).test(t)) return ziel
  }
  return null
}

// ─── Mengen lesen ────────────────────────────────────────────────────────────

const BRUCH: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 }

/** Einheiten und ihr Gewicht in g (Löffel und Packungen als Durchschnitt) */
const EINHEIT: [RegExp, number | 'stueck'][] = [
  [/^(kg|kilo|kilogramm)$/, 1000], [/^(g|gr|gramm)$/, 1], [/^(mg)$/, 0.001],
  [/^(l|liter)$/, 1000], [/^(ml|milliliter)$/, 1], [/^(cl)$/, 10], [/^(dl)$/, 100],
  [/^(el|essloeffel|essl)$/, 12], [/^(tl|teeloeffel|teel)$/, 4], [/^(msp|messerspitze)$/, 0.3], [/^(prise|prisen)$/, 0.5],
  [/^(dose|dosen)$/, 400], [/^(glas|glaeser)$/, 350], [/^(becher)$/, 200], [/^(packung|packungen|pck|pkg|paeckchen|pack)$/, 250],
  [/^(bund|bunde)$/, 30], [/^(zehe|zehen)$/, 4], [/^(scheibe|scheiben)$/, 30], [/^(handvoll|hand)$/, 30], [/^(tasse|tassen|cup|cups)$/, 150],
  [/^(schuss|spritzer)$/, 10], [/^(knolle|knollen)$/, 50], [/^(stueck|stk|st|stuecke)$/, 'stueck'], [/^(kopf|koepfe)$/, 'stueck'],
  [/^(stange|stangen)$/, 'stueck'], [/^(zweig|zweige)$/, 2], [/^(blatt|blaetter)$/, 1], [/^(wuerfel)$/, 'stueck'], [/^(filet|filets)$/, 'stueck'],
]

/** Gewicht eines Stücks in g */
function stueckGramm(ziel: Ziel): number {
  if (ziel.startsWith('x:')) return EXTRA[ziel.slice(2)]?.stueck ?? 100
  const e = ZUTATEN[ziel]?.einheit
  if (e?.stueck) return e.g
  const STUECK: Record<string, number> = {
    haehnchenbrust: 150, putenbrust: 150, lachs: 125, kabeljau: 125, forelle: 125, makrele: 125, schweinefilet: 400, rinderfilet: 180,
    mozzarella: 125, feta: 200, gemuesebruehe: 500, wrap: 60, vollkornbrot: 50, tofu: 200, raeuchertofu: 200, kokosmilch: 400,
    kidneybohnen: 250, kichererbsen: 250, weisse_bohnen: 250, mais: 285, tomaten_stueckig: 400, blattsalat: 300, brokkoli: 400, blumenkohl: 800,
  }
  return STUECK[ziel] ?? 100
}

export interface ZeileGelesen {
  /** Originalzeile ohne Aufzählungszeichen */
  text: string
  ziel: Ziel | null
  /** Menge in g (bzw. ml) für das ganze Rezept; null, wenn keine Menge angegeben ist */
  gramm: number | null
  /** optionale Zutat, z. B. „(zum Garnieren)“ */
  optional: boolean
}

function zahl(s: string): number | null {
  const t = s.trim()
  if (BRUCH[t] !== undefined) return BRUCH[t]
  const gemischt = t.match(/^(\d+)\s*([½¼¾⅓⅔⅛])$/)
  if (gemischt) return Number(gemischt[1]) + BRUCH[gemischt[2]]
  const bruch = t.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (bruch) return Number(bruch[2]) ? Number(bruch[1]) / Number(bruch[2]) : null
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Liest eine Zutatenzeile wie „800 g Hokkaido-Kürbis“, „2 EL Olivenöl“, „1-2 Zwiebeln“ */
export function leseZeile(roh: string): ZeileGelesen | null {
  const text = roh.replace(/^\s*(?:[-–•*]|\d+[.)](?=\s))\s*/, '').trim()
  if (!text || text.length > 160 || /:$/.test(text)) return null
  const optional = /optional|zum garnieren|nach belieben|nach geschmack|zum servieren|zum bestreuen|evtl/i.test(text)
  const ohneKlammern = text.replace(/\(.*?\)/g, ' ')
  const m = ohneKlammern.match(/^\s*(?:ca\.?|etwa|circa)?\s*(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?\s*[½¼¾⅓⅔⅛]?|[½¼¾⅓⅔⅛])(?:\s*(?:-|–|bis)\s*(\d+(?:[.,]\d+)?))?\s*([a-zA-ZäöüÄÖÜß.]+)?\s*(.*)$/)
  let gramm: number | null = null
  let rest = ohneKlammern
  if (m) {
    const a = zahl(m[1])
    const b = m[2] ? zahl(m[2]) : null
    const anzahl = a !== null && b !== null ? (a + b) / 2 : a
    const einheitWort = norm(m[3] ?? '').replace(/\s/g, '')
    const einheit = EINHEIT.find(([re]) => re.test(einheitWort))
    rest = einheit ? m[4] : `${m[3] ?? ''} ${m[4]}`
    const ziel = findeZutat(rest) ?? findeZutat(ohneKlammern)
    if (anzahl !== null && anzahl > 0) {
      if (!einheit || einheit[1] === 'stueck') gramm = ziel ? anzahl * stueckGramm(ziel) : null
      else gramm = anzahl * einheit[1]
      // Löffel Gewürze sind leichter als Löffel Öl oder Honig
      if (ziel === 'gewuerze' && einheit && /^(el|tl|essloeffel|teeloeffel)/.test(einheitWort)) gramm = anzahl * (/^e/.test(einheitWort) ? 6 : 2)
      // „1 Dose Kokosmilch“ ist 400 ml, „1 Packung Feta“ 200 g: Stückgewicht der Zutat nutzen, wenn bekannt
      if (ziel && einheit && /^(packung|packungen|pck|pkg|paeckchen|pack|becher)$/.test(einheitWort)) {
        const s = stueckGramm(ziel)
        if (s !== 100) gramm = anzahl * s
      }
    }
    return { text, ziel, gramm, optional }
  }
  const ziel = findeZutat(rest)
  return { text, ziel, gramm, optional }
}

/** Liest einen Zutatentext (eine Zutat pro Zeile) */
export function leseZutatentext(zutatenText: string | null | undefined): ZeileGelesen[] {
  if (!zutatenText) return []
  const teile: string[] = []
  for (const zeile of zutatenText.split(/\r?\n|;/)) {
    // „150g Hähnchenbrust, 300g Gemüse, 1 EL Öl“ sind drei Zutaten; „Zwiebel, gewürfelt“ bleibt eine
    const stuecke = zeile.split(/,\s+(?![^(]*\))/)
    const zusammen: string[] = []
    for (const st of stuecke) {
      if (zusammen.length && !/^\s*[\d½¼¾⅓⅔⅛]/.test(st) && !findeZutat(st)) zusammen[zusammen.length - 1] += `, ${st}`
      else zusammen.push(st)
    }
    teile.push(...zusammen)
  }
  return teile.map(leseZeile).filter((z): z is ZeileGelesen => !!z && !IGNORIERT.test(norm(z.text)))
}

// ─── Kosten ──────────────────────────────────────────────────────────────────

export function preisProKg(ziel: Ziel): Spanne | null {
  if (ziel.startsWith('x:')) return EXTRA[ziel.slice(2)]?.preis ?? null
  return PREIS_ZUTAT[ziel] ?? null
}

export function extraArtikel(ziel: Ziel): ExtraArtikel | undefined {
  return ziel.startsWith('x:') ? EXTRA[ziel.slice(2)] : undefined
}

/** Standardmenge, wenn ein Rezept nur „Salz“ oder „frischer Basilikum“ ohne Menge nennt */
function standardGramm(ziel: Ziel): number {
  if (['olivenoel', 'rapsoel', 'kokosoel', 'x:sesamoel', 'butter'].includes(ziel)) return 10
  if (ziel === 'x:kraeuter_frisch' || ['petersilie', 'basilikum', 'schnittlauch', 'minze'].includes(ziel)) return 10
  if (ZUTATEN[ziel]?.basis || ['salz', 'gewuerze', 'zimt', 'kurkuma'].includes(ziel)) return 2
  return stueckGramm(ziel)
}

export interface Kosten {
  min: number
  max: number
  /** Zutaten mit Preis */
  bepreist: number
  /** Zutaten insgesamt (ohne Wasser) */
  gesamt: number
  /** Zutaten, die nicht erkannt wurden */
  ohnePreis: string[]
}

export const KEINE_KOSTEN: Kosten = { min: 0, max: 0, bepreist: 0, gesamt: 0, ohnePreis: [] }

export function addiere(a: Kosten, b: Kosten): Kosten {
  return { min: a.min + b.min, max: a.max + b.max, bepreist: a.bepreist + b.bepreist, gesamt: a.gesamt + b.gesamt, ohnePreis: [...a.ohnePreis, ...b.ohnePreis] }
}

export function skaliere(k: Kosten, faktor: number): Kosten {
  return { ...k, min: k.min * faktor, max: k.max * faktor }
}

/** Kosten für eine Menge einer Zutat */
export function kostenFuer(ziel: Ziel, gramm: number): Kosten {
  const p = preisProKg(ziel)
  if (!p) return { ...KEINE_KOSTEN, gesamt: 1, ohnePreis: [ziel] }
  return { min: (p[0] * gramm) / 1000, max: (p[1] * gramm) / 1000, bepreist: 1, gesamt: 1, ohnePreis: [] }
}

/** Kosten eines Entdecken-Rezepts (Zutaten mit ID und Gramm), für alle Portionen des Rezepts */
export function kostenZutaten(zutaten: { id: string; g: number }[]): Kosten {
  return zutaten.filter(z => z.id !== 'wasser').reduce((k, z) => addiere(k, kostenFuer(z.id, z.g)), KEINE_KOSTEN)
}

/** Kosten einer gelesenen Zeile mal Faktor; null, wenn sie nicht zählt (Wasser, optionale unbekannte Zutat) */
export function kostenZeile(z: ZeileGelesen, faktor = 1): Kosten | null {
  if (z.ziel === 'wasser') return null
  if (!z.ziel) return z.optional ? null : { ...KEINE_KOSTEN, gesamt: 1, ohnePreis: [z.text] }
  return kostenFuer(z.ziel, (z.gramm ?? standardGramm(z.ziel)) * faktor)
}

/** Kosten eines frei geschriebenen Rezepts, für alle Portionen des Rezepts */
export function kostenText(zutatenText: string | null | undefined): Kosten {
  return leseZutatentext(zutatenText).reduce((k, z) => {
    const kz = kostenZeile(z)
    return kz ? addiere(k, kz) : k
  }, KEINE_KOSTEN)
}

/** Reicht die Erkennung für eine Prognose? (mindestens die Hälfte der Zutaten und mind. 2 mit Preis) */
export function kostenBrauchbar(k: Kosten): boolean {
  return k.bepreist >= 2 && k.bepreist / Math.max(1, k.gesamt) >= 0.5
}

const EURO = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** „2,10–2,90 €“; bei sehr kleinen Unterschieden nur ein Wert */
export function euroSpanne(min: number, max: number): string {
  const a = Math.max(0.01, Math.round(min * 10) / 10)
  const b = Math.max(a, Math.round(max * 10) / 10)
  if (b - a < 0.1) return `${EURO.format(a)} €`
  return `${EURO.format(a)}–${EURO.format(b)} €`
}
