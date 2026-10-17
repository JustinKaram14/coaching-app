// Barcode-Erkennung: nativer BarcodeDetector (Android/Chrome), sonst zxing-wasm (iPhone/Safari, Firefox).
// Die .wasm-Datei wird mitgeliefert, damit der Scanner auch offline und in der Android-App funktioniert.
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

export interface Detektor {
  detect: (bild: ImageBitmapSource) => Promise<{ rawValue: string }[]>
}

const FORMATE = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']
let detektor: Promise<Detektor> | null = null

export function barcodeDetektor(): Promise<Detektor> {
  detektor ??= (async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Nativ = (window as any).BarcodeDetector
    if (Nativ) {
      const formate: string[] = await Nativ.getSupportedFormats?.().catch(() => []) ?? []
      if (formate.includes('ean_13')) return new Nativ({ formats: FORMATE }) as Detektor
    }
    const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill')
    prepareZXingModule({ overrides: { locateFile: (pfad: string, prefix: string) => (pfad.endsWith('.wasm') ? wasmUrl : prefix + pfad) } })
    return new BarcodeDetector({ formats: FORMATE as never }) as Detektor
  })()
  return detektor
}
