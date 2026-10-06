// Erzeugt alle App-Icons (PWA, iOS, Favicon, Android) aus assets/app-icon.jpg.
// Aufruf: npm run icons
//
// Das Quellbild darf beliebig groß/nicht quadratisch sein: erwartet wird weiße
// Schrift auf einfarbigem Hintergrund. Schrift und Hintergrundfarbe werden
// erkannt und pro Plattform mit passendem Rand neu auf eine Fläche gesetzt.
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SOURCE = path.join(ROOT, 'assets', 'app-icon.jpg')
const PUBLIC_DIR = path.join(ROOT, 'public')
const ANDROID_RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

// Anteil der Icon-Breite, den die Schrift einnimmt
const TEXT_ANY = 0.72 // normale Icons (abgerundetes Quadrat)
const TEXT_ROUND = 0.62 // rundes Android-Icon
const TEXT_MASKABLE = 0.6 // PWA maskable: Safe-Zone ist ein Kreis mit 80 % Durchmesser
const TEXT_ADAPTIVE = 0.5 // Android adaptive: Safe-Zone ist ein Kreis mit ~61 % Durchmesser
const CORNER_RADIUS = 0.22

const ANDROID_DENSITIES = {
  mdpi: { legacy: 48, foreground: 108 },
  hdpi: { legacy: 72, foreground: 162 },
  xhdpi: { legacy: 96, foreground: 216 },
  xxhdpi: { legacy: 144, foreground: 324 },
  xxxhdpi: { legacy: 192, foreground: 432 },
}

const hex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')

// Liest Hintergrundfarbe und Schrift (als weiße Maske mit Alpha) aus dem Quellbild.
async function readSource() {
  const { data, info } = await sharp(SOURCE)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height } = info

  // Hintergrund = Mittelwert eines Eckblocks (JPEG-Rauschen glätten)
  const block = 32
  const sum = [0, 0, 0]
  for (let y = 0; y < block; y++) {
    for (let x = 0; x < block; x++) {
      for (let c = 0; c < 3; c++) sum[c] += data[(y * width + x) * 3 + c]
    }
  }
  const bg = {
    r: Math.round(sum[0] / (block * block)),
    g: Math.round(sum[1] / (block * block)),
    b: Math.round(sum[2] / (block * block)),
  }
  const bgArr = [bg.r, bg.g, bg.b]

  // Alpha je Pixel: 0 = Hintergrund, 1 = Weiß
  const alpha = new Float32Array(width * height)
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      let a = 0
      for (let c = 0; c < 3; c++) {
        a += (data[i * 3 + c] - bgArr[c]) / (255 - bgArr[c])
      }
      a = Math.min(1, Math.max(0, a / 3))
      alpha[i] = a
      if (a > 0.5) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) throw new Error('Keine Schrift im Quellbild gefunden')

  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const rgba = Buffer.alloc(w * h * 4, 255)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      rgba[(y * w + x) * 4 + 3] = Math.round(alpha[(y + minY) * width + (x + minX)] * 255)
    }
  }
  const glyph = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer()
  return { bg, glyph, glyphWidth: w, glyphHeight: h }
}

function maskSvg(size, shape, radius) {
  const body =
    shape === 'circle'
      ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/>`
      : `<rect width="${size}" height="${size}" rx="${Math.round(size * radius)}"/>`
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${body}</svg>`)
}

// shape: 'square' (vollflächig), 'rounded' | 'circle' (Ecken transparent)
// transparent: nur Schrift ohne Hintergrund (Android-Vordergrund)
async function render(src, size, { text, shape = 'square', radius = CORNER_RADIUS, transparent = false }) {
  const gw = Math.round(size * text)
  const gh = Math.round((gw * src.glyphHeight) / src.glyphWidth)
  const glyph = await sharp(src.glyph).resize({ width: gw, height: gh, kernel: 'lanczos3' }).toBuffer()

  const layers = [{ input: glyph, left: Math.round((size - gw) / 2), top: Math.round((size - gh) / 2) }]
  if (shape !== 'square') layers.push({ input: maskSvg(size, shape, radius), blend: 'dest-in' })

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : { ...src.bg, alpha: 1 },
    },
  })
    .composite(layers)
    .png()
    .toBuffer()
}

function write(file, buffer) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, buffer)
  console.log('Created:', path.relative(ROOT, file))
}

async function main() {
  const src = await readSource()
  console.log(`Hintergrund ${hex(src.bg)}, Schrift ${src.glyphWidth}x${src.glyphHeight}px`)

  // PWA (Windows/Mac/Android-Installation) + iOS + Favicon
  for (const size of [192, 512]) {
    write(path.join(PUBLIC_DIR, `icon-${size}.png`), await render(src, size, { text: TEXT_ANY, shape: 'rounded' }))
    write(path.join(PUBLIC_DIR, `icon-maskable-${size}.png`), await render(src, size, { text: TEXT_MASKABLE }))
  }
  // iOS rundet selbst ab und füllt Transparenz schwarz -> vollflächig, ohne Alpha
  write(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), await render(src, 180, { text: TEXT_ANY }))
  write(
    path.join(PUBLIC_DIR, 'favicon.png'),
    await render(src, 64, { text: 0.84, shape: 'rounded', radius: 0.18 }),
  )

  // Android (Legacy-, runde und Adaptive-Icons)
  for (const [density, sizes] of Object.entries(ANDROID_DENSITIES)) {
    const dir = path.join(ANDROID_RES, `mipmap-${density}`)
    write(path.join(dir, 'ic_launcher.png'), await render(src, sizes.legacy, { text: TEXT_ANY, shape: 'rounded' }))
    write(path.join(dir, 'ic_launcher_round.png'), await render(src, sizes.legacy, { text: TEXT_ROUND, shape: 'circle' }))
    write(
      path.join(dir, 'ic_launcher_foreground.png'),
      await render(src, sizes.foreground, { text: TEXT_ADAPTIVE, transparent: true }),
    )
  }
  fs.writeFileSync(
    path.join(ANDROID_RES, 'values', 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${hex(src.bg).toUpperCase()}</color>\n</resources>`,
  )
  console.log('Updated: android/app/src/main/res/values/ic_launcher_background.xml')

  console.log('Icons generated!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
