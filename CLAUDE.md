# Coaching App

## Workflow: Testen und Committen

- Sobald eine Änderung sicher fertig ist, wird sie **committet**. Nicht sammeln, nicht liegen lassen.
- **Vor jedem Commit immer testen und prüfen**, dass alles wirklich funktioniert:
  - `npm run build` (führt `tsc` und `vite build` aus) muss ohne Fehler durchlaufen.
  - Die geänderte Funktion im Dev-Server (`npm run dev`) bzw. im Browser ausprobieren, nicht nur den Build prüfen.
  - Bei Änderungen an Supabase Edge Functions oder Migrationen: Aufruf und Ergebnis prüfen, soweit möglich.
- Nur committen, wenn Build und Test erfolgreich waren. Schlägt etwas fehl, erst beheben, dann committen.
- Commit-Nachrichten im bisherigen Stil (`feat: ...`, `fix: ...`), kurz und aussagekräftig.
- Keine Secrets (`.env`, API-Keys) committen.
