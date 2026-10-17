import { useEffect, useRef, useState } from 'react'
import { Flashlight, X } from 'lucide-react'
import { barcodeDetektor } from '../../lib/produktcheck/scanner'

/** Vollbild-Kamera mit Scanrahmen. `pausiert` hält die Erkennung an (z. B. solange ein Ergebnis angezeigt wird). */
export function ScannerVollbild({ onErkannt, onSchliessen, pausiert, children }: {
  onErkannt: (code: string) => void
  onSchliessen: () => void
  pausiert: boolean
  children?: React.ReactNode
}) {
  const video = useRef<HTMLVideoElement>(null)
  const strom = useRef<MediaStream | null>(null)
  const pause = useRef(pausiert)
  const letzter = useRef('')
  const [fehler, setFehler] = useState('')
  const [lampe, setLampe] = useState<boolean | null>(null)

  pause.current = pausiert
  useEffect(() => { if (!pausiert) letzter.current = '' }, [pausiert])

  useEffect(() => {
    let aktiv = true
    let timer: ReturnType<typeof setTimeout>
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(async s => {
        if (!aktiv) { s.getTracks().forEach(t => t.stop()); return }
        strom.current = s
        const spur = s.getVideoTracks()[0]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((spur.getCapabilities?.() as any)?.torch) setLampe(false)
        if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}) }
        const detektor = await barcodeDetektor()
        const runde = async () => {
          if (!aktiv) return
          const v = video.current
          if (!pause.current && v && v.readyState >= 2) {
            try {
              const codes = await detektor.detect(v)
              const code = codes[0]?.rawValue
              if (code && code !== letzter.current && /^\d{8,14}$/.test(code)) {
                letzter.current = code
                navigator.vibrate?.(60)
                onErkannt(code)
              }
            } catch { /* nächster Versuch */ }
          }
          timer = setTimeout(runde, 250)
        }
        runde()
      })
      .catch(() => setFehler('Kein Kamerazugriff. Bitte die Kamera in den Einstellungen erlauben oder den Barcode eingeben.'))
    return () => { aktiv = false; clearTimeout(timer); strom.current?.getTracks().forEach(t => t.stop()) }
  }, [onErkannt])

  async function lampeUmschalten() {
    const spur = strom.current?.getVideoTracks()[0]
    if (!spur || lampe === null) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await spur.applyConstraints({ advanced: [{ torch: !lampe } as any] }).then(() => setLampe(!lampe)).catch(() => {})
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video ref={video} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-[78%] max-w-sm aspect-[4/3]">
          {['top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl', 'top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl',
            'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl'].map(k => (
            <span key={k} className={`absolute w-12 h-12 border-white/90 ${k}`} />
          ))}
        </div>
      </div>
      <div className="absolute top-0 inset-x-0 flex justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button onClick={onSchliessen} className="w-12 h-12 rounded-full bg-black/40 text-white flex items-center justify-center" aria-label="Scanner schließen"><X size={22} /></button>
        {lampe !== null && (
          <button onClick={lampeUmschalten} className={`w-12 h-12 rounded-full flex items-center justify-center ${lampe ? 'bg-white text-black' : 'bg-black/40 text-white'}`} aria-label="Taschenlampe" aria-pressed={lampe}>
            <Flashlight size={20} />
          </button>
        )}
      </div>
      {fehler
        ? <p className="absolute inset-x-6 top-1/2 text-center text-white text-sm bg-black/60 rounded-2xl p-4">{fehler}</p>
        : !pausiert && <p className="absolute inset-x-0 bottom-[22%] text-center text-white/90 text-sm">Barcode in den Rahmen halten</p>}
      {children && <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{children}</div>}
    </div>
  )
}
