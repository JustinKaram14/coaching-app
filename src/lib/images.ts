// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.

export async function compressImage(file, maxSize = 1600, quality = 0.85) {
  try {
    let bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      }),
      scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height)),
      targetWidth = Math.max(1, Math.round(bitmap.width * scale)),
      targetHeight = Math.max(1, Math.round(bitmap.height * scale)),
      canvas = document.createElement('canvas')
    return (
      (canvas.width = targetWidth),
      (canvas.height = targetHeight),
      canvas.getContext('2d').drawImage(bitmap, 0, 0, targetWidth, targetHeight),
      bitmap.close?.(),
      (await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))) ?? file
    )
  } catch {
    return file
  }
}
