const { PNG } = require('pngjs')
const fs = require('fs')
const path = require('path')

function createIcon(size, outputPath) {
  const png = new PNG({ width: size, height: size })
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.42

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const cornerRadius = size * 0.22
      const inRoundedRect =
        x >= cornerRadius && x <= size - cornerRadius &&
        y >= cornerRadius && y <= size - cornerRadius
      const inCorner =
        (x < cornerRadius && y < cornerRadius && Math.sqrt((x - cornerRadius) ** 2 + (y - cornerRadius) ** 2) > cornerRadius) ||
        (x > size - cornerRadius && y < cornerRadius && Math.sqrt((x - (size - cornerRadius)) ** 2 + (y - cornerRadius) ** 2) > cornerRadius) ||
        (x < cornerRadius && y > size - cornerRadius && Math.sqrt((x - cornerRadius) ** 2 + (y - (size - cornerRadius)) ** 2) > cornerRadius) ||
        (x > size - cornerRadius && y > size - cornerRadius && Math.sqrt((x - (size - cornerRadius)) ** 2 + (y - (size - cornerRadius)) ** 2) > cornerRadius)

      if (inCorner) {
        png.data[idx] = 0
        png.data[idx + 1] = 0
        png.data[idx + 2] = 0
        png.data[idx + 3] = 0
        continue
      }

      // Background: #0a0b0f
      png.data[idx] = 10
      png.data[idx + 1] = 11
      png.data[idx + 2] = 15
      png.data[idx + 3] = 255

      // Lightning bolt shape (Zap icon approximation)
      const nx = (x / size - 0.5) * 2
      const ny = (y / size - 0.5) * 2
      const inZap =
        (nx > -0.18 && nx < 0.08 && ny > -0.5 && ny < 0.05) ||
        (nx > -0.08 && nx < 0.2 && ny > -0.05 && ny < 0.5) ||
        (nx > -0.25 && nx < 0.25 && ny > -0.08 && ny < 0.08)

      if (inZap) {
        // Primary color #6366f1
        png.data[idx] = 99
        png.data[idx + 1] = 102
        png.data[idx + 2] = 241
        png.data[idx + 3] = 255
      }
    }
  }

  const buffer = PNG.sync.write(png)
  fs.writeFileSync(outputPath, buffer)
  console.log(`Created: ${outputPath} (${size}x${size})`)
}

const publicDir = path.join(__dirname, '..', 'public')
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })

createIcon(192, path.join(publicDir, 'icon-192.png'))
createIcon(512, path.join(publicDir, 'icon-512.png'))
createIcon(180, path.join(publicDir, 'apple-touch-icon.png'))

console.log('Icons generated!')
