// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { useEffect, useState } from 'react'
import { proofUrl } from '../../lib/challenges'

export function ProofImage({ path: e }) {
  let [t, n] = useState(null)
  return (
    useEffect(() => {
      let t = false
      return (
        proofUrl(e).then((e) => {
          t || n(e)
        }),
        () => {
          t = true
        }
      )
    }, [e]),
    t ? (
      <a href={t} target="_blank" rel="noreferrer">
        <img
          src={t}
          alt="Nachweis des Klienten"
          className="w-24 h-24 rounded-2xl object-cover border border-border"
          loading="lazy"
        />
      </a>
    ) : (
      <div className="w-24 h-24 rounded-2xl bg-bg-elevated" />
    )
  )
}
