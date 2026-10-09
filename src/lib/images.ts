// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.

export async function compressImage(e, t = 1600, n = 0.85) {
  try {
    let r = await createImageBitmap(e, {
        imageOrientation: 'from-image',
      }),
      i = Math.min(1, t / Math.max(r.width, r.height)),
      a = Math.max(1, Math.round(r.width * i)),
      o = Math.max(1, Math.round(r.height * i)),
      s = document.createElement('canvas')
    return (
      (s.width = a),
      (s.height = o),
      s.getContext('2d').drawImage(r, 0, 0, a, o),
      r.close?.(),
      (await new Promise((e) => s.toBlob(e, 'image/jpeg', n))) ?? e
    )
  } catch {
    return e
  }
}
