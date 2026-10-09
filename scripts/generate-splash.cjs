// Erzeugt die iOS-Startbilder (apple-touch-startup-image) für die als Web-App gespeicherte Startseite.
// Aufruf: npm run splash
//
// iOS zeigt beim Start einer Web-App zuerst ein statisches Bild (weiß, wenn keins hinterlegt ist).
// Die Startanimation in index.html beginnt mit der kompakten Hantel des HLX-Logos mittig auf Markengrün.
// Diese Bilder zeigen exakt dieses erste Bild (gleiche Größe und Position wie in der Animation), damit der Übergang
// vom Systemstartbild in die Animation ohne Sprung bleibt.
// Gibt die passenden <link>-Zeilen für index.html aus.
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const BRAND = '#075640'

// Nachgezeichnetes Hantel-Logo (scripts/hlx-logo.json) und Skalierung des ersten Bildes der Animation
const LOGO = require('./hlx-logo.json')
const ART_UNITS = 360 // Breite der SVG-Zeichenfläche in index.html
const ART_VW = 0.94 // Breite der Zeichenfläche: min(94vw, 420px, 120vh)
const ART_VH = 1.2
const ART_MAX_CSS = 420
const PUSH_START = 0.94 // Startgröße des Push-Ins
const OUT_DIR = path.join(__dirname, '..', 'public', 'splash')

// CSS-Pixel (Breite x Höhe im Hochformat) und Pixeldichte der gängigen iPhones
const PHONES = [
  { w: 440, h: 956, dpr: 3, name: 'iPhone 16 Pro Max' },
  { w: 430, h: 932, dpr: 3, name: 'iPhone 14/15/16 Plus & Pro Max' },
  { w: 428, h: 926, dpr: 3, name: 'iPhone 12/13 Pro Max, 14 Plus' },
  { w: 402, h: 874, dpr: 3, name: 'iPhone 16 Pro' },
  { w: 393, h: 852, dpr: 3, name: 'iPhone 14 Pro, 15, 15 Pro, 16' },
  { w: 390, h: 844, dpr: 3, name: 'iPhone 12/13/14, 12/13 Pro' },
  { w: 414, h: 896, dpr: 3, name: 'iPhone XS Max, 11 Pro Max' },
  { w: 414, h: 896, dpr: 2, name: 'iPhone XR, 11' },
  { w: 420, h: 912, dpr: 3, name: 'iPhone Air' },
  { w: 375, h: 812, dpr: 3, name: 'iPhone X, XS, 11 Pro' },
  { w: 360, h: 780, dpr: 3, name: 'iPhone 12/13 mini' },
  { w: 414, h: 736, dpr: 3, name: 'iPhone 6/7/8 Plus' },
  { w: 375, h: 667, dpr: 2, name: 'iPhone SE (2./3. Gen.), 8' },
]

// iPads gibt es im Hoch- und Querformat, in Safari bleiben device-width/-height die Hochformat-Maße
const TABLETS = [
  { w: 744, h: 1133, dpr: 2, name: 'iPad mini (6./7. Gen.)' },
  { w: 768, h: 1024, dpr: 2, name: 'iPad 9,7", iPad mini 4/5' },
  { w: 810, h: 1080, dpr: 2, name: 'iPad 10,2"' },
  { w: 820, h: 1180, dpr: 2, name: 'iPad 10,9" (10. Gen.), iPad Air 10,9"/11"' },
  { w: 834, h: 1112, dpr: 2, name: 'iPad Pro 10,5", iPad Air 3' },
  { w: 834, h: 1194, dpr: 2, name: 'iPad Pro 11"' },
  { w: 834, h: 1210, dpr: 2, name: 'iPad Pro 11" (M4)' },
  { w: 1024, h: 1366, dpr: 2, name: 'iPad Pro 12,9", iPad Air 13"' },
  { w: 1032, h: 1376, dpr: 2, name: 'iPad Pro 13" (M4)' },
]

const DEVICES = [
  ...PHONES.map((d) => ({ ...d, orient: 'portrait' })),
  ...TABLETS.flatMap((d) => [
    { ...d, orient: 'portrait' },
    { ...d, orient: 'landscape' },
  ]),
]

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const links = []
  for (const d of DEVICES) {
    const landscape = d.orient === 'landscape'
    const vw = landscape ? d.h : d.w // sichtbare Breite/Höhe der Seite in CSS-Pixeln
    const vh = landscape ? d.w : d.h
    const pw = vw * d.dpr
    const ph = vh * d.dpr
    const file = `ios-${pw}x${ph}.png`
    // px je Einheit der Zeichenfläche; Bildmitte entspricht der Mitte (180, 200) der Zeichenfläche
    const u = (Math.min(ART_VW * vw, ART_MAX_CSS, ART_VH * vh) / ART_UNITS) * d.dpr * PUSH_START
    const [tx, ty] = LOGO.t0
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}"><rect width="100%" height="100%" fill="${BRAND}"/>` +
      `<g transform="translate(${pw / 2} ${ph / 2}) scale(${u}) translate(-180 -200)">` +
      `<g transform="translate(${tx} ${ty}) scale(${LOGO.k})" fill="#fff" fill-rule="evenodd">` +
      `<path transform="translate(${LOGO.dx} 0)" d="${LOGO.left}"/><path transform="translate(${-LOGO.dx} 0)" d="${LOGO.right}"/>` +
      `</g></g></svg>`
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(path.join(OUT_DIR, file))
    links.push(
      `    <link rel="apple-touch-startup-image" href="/coaching-app/splash/${file}" ` +
        `media="(device-width: ${d.w}px) and (device-height: ${d.h}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: ${d.orient})" /> <!-- ${d.name}${landscape ? ', Querformat' : ''} -->`,
    )
  }
  console.log(links.join('\n'))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
