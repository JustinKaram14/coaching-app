// @ts-nocheck
// Übernommen aus dem Redesign-Paket. Typen und lokale Namen werden schrittweise verbessert.
import { useEffect, useState } from 'react'
import { proofUrl } from '../../lib/challenges'

export function ProofImage({ path: proofPath }) {
  let [url, setUrl] = useState(null)
  return (
    useEffect(() => {
      let cancelled = false
      return (
        proofUrl(proofPath).then((signedUrl) => {
          cancelled || setUrl(signedUrl)
        }),
        () => {
          cancelled = true
        }
      )
    }, [proofPath]),
    url ? (
      <a href={url} target="_blank" rel="noreferrer">
        <img
          src={url}
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
