import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield, FileText } from 'lucide-react'

const BETREIBER_NAME = '[Name]'
const BETREIBER_ADRESSE = '[Straße, Hausnr.]'
const BETREIBER_ORT = '[PLZ Ort]'
const BETREIBER_EMAIL = '[E-Mail]'
const BETREIBER_TEL = '[Telefonnummer]'
const APP_NAME = 'HLX Coaching App'
const STAND_DATUM = '29. Juli 2026'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-lg font-bold text-text-primary border-b border-border pb-2">{title}</h2>
      <div className="space-y-2 text-sm text-text-secondary leading-relaxed">{children}</div>
    </section>
  )
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={className}>{children}</p>
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}

export function Legal() {
  const [tab, setTab] = useState<'impressum' | 'datenschutz'>('impressum')

  return (
    <div className="min-h-screen bg-bg p-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6 transition-colors">
          <ArrowLeft size={16} /> Zurück
        </Link>

        <div className="card mb-6">
          <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl border border-border">
            <button
              onClick={() => setTab('impressum')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'impressum' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <FileText size={14} /> Impressum
            </button>
            <button
              onClick={() => setTab('datenschutz')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'datenschutz' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <Shield size={14} /> Datenschutz
            </button>
          </div>
        </div>

        {tab === 'impressum' && (
          <div className="card space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">Impressum</h1>
              <p className="text-xs text-text-muted">Angaben gemäß § 5 TMG</p>
            </div>

            <Section id="anbieter" title="Anbieter">
              <P>{BETREIBER_NAME}</P>
              <P>{BETREIBER_ADRESSE}</P>
              <P>{BETREIBER_ORT}</P>
            </Section>

            <Section id="kontakt" title="Kontakt">
              <P>E-Mail: <a href={`mailto:${BETREIBER_EMAIL}`} className="text-primary hover:underline">{BETREIBER_EMAIL}</a></P>
              <P>Telefon: {BETREIBER_TEL}</P>
            </Section>

            <Section id="inhalt" title="Verantwortlich für den Inhalt">
              <P>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:</P>
              <P>{BETREIBER_NAME}, {BETREIBER_ADRESSE}, {BETREIBER_ORT}</P>
            </Section>

            <Section id="haftung-inhalt" title="Haftung für Inhalte">
              <P>
                Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
                Die {APP_NAME} ist eine private Coaching-Plattform, die ausschließlich registrierten Nutzern mit gültigem Einladungscode zugänglich ist.
              </P>
              <P>
                <strong className="text-text-primary">Kein medizinischer Rat:</strong> Die in dieser App erfassten Daten (Training, Ernährung, Schlaf, Gewicht) dienen ausschließlich der persönlichen Dokumentation und dem Coaching-Zweck. Sie ersetzen keine ärztliche Beratung, Diagnose oder Behandlung.
              </P>
            </Section>

            <Section id="haftung-links" title="Haftung für Links">
              <P>
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.
              </P>
            </Section>

            <Section id="urheber" title="Urheberrecht">
              <P>
                Die durch den Betreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors.
              </P>
            </Section>

            <p className="text-xs text-text-muted pt-4 border-t border-border">Stand: {STAND_DATUM}</p>
          </div>
        )}

        {tab === 'datenschutz' && (
          <div className="card space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">Datenschutzerklärung</h1>
              <p className="text-xs text-text-muted">Gemäß DSGVO Art. 13 | Stand: {STAND_DATUM}</p>
            </div>

            <Section id="verantwortlicher" title="1. Verantwortlicher (Art. 13 Abs. 1 lit. a DSGVO)">
              <P>Verantwortlicher im Sinne der DSGVO ist:</P>
              <P><strong className="text-text-primary">{BETREIBER_NAME}</strong><br />{BETREIBER_ADRESSE}<br />{BETREIBER_ORT}<br />E-Mail: {BETREIBER_EMAIL}</P>
            </Section>

            <Section id="verarbeitete-daten" title="2. Verarbeitete Daten und Zwecke">
              <P><strong className="text-text-primary">2.1 Konto- und Profildaten</strong></P>
              <Ul items={['Name, E-Mail-Adresse (zur Identifikation und Anmeldung)', 'Rolle (Client/Coach)', 'Aktivitätszeitstempel (letzter Login)']} />
              <P>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</P>

              <P className="mt-4"><strong className="text-text-primary">2.2 Gesundheits- und Fitnessdaten (besondere Kategorien, Art. 9 DSGVO)</strong></P>
              <Ul items={['Körpergewicht und Zielgewicht', 'Trainingseinheiten, Übungen, Sätze, Gewichte', 'Schlafzeiten und Schlafqualität', 'Ernährungsdaten (Mahlzeiten, Kalorien, Makronährstoffe)', 'Körperfotos (optional, nur bei expliziter Freigabe)', 'Nahrungsergänzungsmittel', 'Anamnese-Daten (Gesundheitszustand, Ziele, Allergien)']} />
              <P>Diese Daten sind <strong className="text-text-primary">besondere Kategorien personenbezogener Daten</strong> gem. Art. 9 DSGVO.</P>
              <P>Rechtsgrundlage: Art. 9 Abs. 2 lit. a i.V.m. Art. 6 Abs. 1 lit. a DSGVO (<strong className="text-text-primary">ausdrückliche Einwilligung</strong>, erteilt bei der Registrierung)</P>

              <P className="mt-4"><strong className="text-text-primary">2.3 KI-Analyse (optional)</strong></P>
              <P>
                Wenn Sie die optionale Funktion zur KI-gestützten Analyse von Fotos oder Screenshots nutzen (z. B. Ernährungsanalyse, Trainingsauswertung),
                werden Bilddaten an die Google Gemini API übermittelt. Dies erfolgt nur, wenn Sie dieser Verarbeitung bei der Registrierung ausdrücklich zugestimmt haben.
                Sie können diese Funktion jederzeit in den Einstellungen deaktivieren.
              </P>
              <P>Rechtsgrundlage: Art. 9 Abs. 2 lit. a i.V.m. Art. 6 Abs. 1 lit. a DSGVO (optionale, widerrufliche Einwilligung)</P>

              <P className="mt-4"><strong className="text-text-primary">2.4 Datenweitergabe an den Coach</strong></P>
              <P>
                Ihr Coach kann Ihre Trainings-, Ernährungs-, Gewichts- und Schlafdaten einsehen. Körperfotos sind <strong className="text-text-primary">standardmäßig nicht</strong> für den Coach sichtbar; Sie können den Zugriff jederzeit in den Einstellungen gewähren oder entziehen.
              </P>
              <P>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Coaching-Vertrag) sowie Ihre Einwilligung bei der Registrierung</P>
            </Section>

            <Section id="empfaenger" title="3. Empfänger / Auftragsverarbeiter (Art. 13 Abs. 1 lit. e DSGVO)">
              <div className="space-y-3">
                <div className="p-3 bg-bg-elevated rounded-xl border border-border">
                  <P><strong className="text-text-primary">Supabase Inc.</strong> (Datenbankdienst, Authentifizierung, Dateispeicher)</P>
                  <P>Adresse: 970 Toa Payoh North #07-04, Singapore 318992</P>
                  <P>Hosting: EU-Rechenzentrum (Frankfurt/Dublin) — keine Übermittlung in Drittländer für Kerndaten</P>
                  <P>Datenschutz: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com/privacy</a></P>
                </div>
                <div className="p-3 bg-bg-elevated rounded-xl border border-border">
                  <P><strong className="text-text-primary">Google LLC</strong> (Gemini AI API — nur bei optionaler KI-Nutzung)</P>
                  <P>Adresse: 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</P>
                  <P>Drittlandübermittlung in die USA; Rechtsgrundlage: Standardvertragsklauseln (SCCs) gem. Art. 46 Abs. 2 lit. c DSGVO</P>
                  <P>Datenschutz: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">policies.google.com/privacy</a></P>
                </div>
                <div className="p-3 bg-bg-elevated rounded-xl border border-border">
                  <P><strong className="text-text-primary">WorkoutX API</strong> (Übungsdatenbank — öffentliche Übungsinformationen)</P>
                  <P>Übermittlung: Nur Übungsname (kein Personenbezug)</P>
                </div>
                <div className="p-3 bg-bg-elevated rounded-xl border border-border">
                  <P><strong className="text-text-primary">Open Food Facts</strong> (Lebensmitteldatenbank)</P>
                  <P>Gemeinnützige Datenbank; nur Barcode/Produktname wird übermittelt (kein Personenbezug)</P>
                  <P>Datenschutz: <a href="https://world.openfoodfacts.org/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">openfoodfacts.org/privacy</a></P>
                </div>
              </div>
            </Section>

            <Section id="speicherdauer" title="4. Speicherdauer (Art. 13 Abs. 2 lit. a DSGVO)">
              <P>Ihre Daten werden gespeichert, solange Ihr Konto aktiv ist. Nach Löschung Ihres Kontos werden alle personenbezogenen Daten und Gesundheitsdaten unverzüglich gelöscht (Kaskadenlöschung). Gesetzliche Aufbewahrungsfristen (z. B. nach HGB, AO) sind zu beachten, sofern anwendbar.</P>
              <P>Technische Logs in Supabase (Verbindungsprotokolle, Fehlerprotokolle) werden nach spätestens 30 Tagen automatisch gelöscht.</P>
            </Section>

            <Section id="rechte" title="5. Ihre Rechte als betroffene Person (Art. 15–22 DSGVO)">
              <Ul items={[
                'Recht auf Auskunft (Art. 15): Sie können jederzeit Auskunft über Ihre gespeicherten Daten anfordern.',
                'Recht auf Berichtigung (Art. 16): Unrichtige Daten können Sie direkt in der App berichtigen.',
                'Recht auf Löschung (Art. 17): Sie können Ihr Konto und alle Daten jederzeit unter Einstellungen → Konto löschen unwiderruflich löschen.',
                'Recht auf Einschränkung der Verarbeitung (Art. 18)',
                'Recht auf Datenübertragbarkeit (Art. 20): Ihre Daten können auf Anfrage als CSV/JSON exportiert werden.',
                'Recht auf Widerspruch (Art. 21)',
                'Recht auf Widerruf der Einwilligung (Art. 7 Abs. 3): Sie können Einwilligungen jederzeit in den Einstellungen widerrufen. Der Widerruf berührt nicht die Rechtmäßigkeit der vor dem Widerruf erfolgten Verarbeitung.',
              ]} />
              <P>Zur Ausübung Ihrer Rechte wenden Sie sich an: <a href={`mailto:${BETREIBER_EMAIL}`} className="text-primary hover:underline">{BETREIBER_EMAIL}</a></P>
            </Section>

            <Section id="beschwerde" title="6. Beschwerderecht bei der Aufsichtsbehörde (Art. 13 Abs. 2 lit. d DSGVO)">
              <P>Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, insbesondere in dem Mitgliedstaat Ihres Aufenthaltsortes, Ihres Arbeitsplatzes oder des Ortes des mutmaßlichen Verstoßes.</P>
              <P>Zuständige Behörde (Deutschland): Bundesbeauftragter für den Datenschutz und die Informationsfreiheit (BfDI), <a href="https://www.bfdi.bund.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.bfdi.bund.de</a></P>
            </Section>

            <Section id="sicherheit" title="7. Datensicherheit">
              <P>
                Die Übertragung von Daten zwischen App und Server erfolgt ausschließlich verschlüsselt (HTTPS/TLS). Alle Daten werden in einer Supabase-Datenbank mit Row-Level Security (RLS) gespeichert — d. h., jeder Nutzer kann ausschließlich auf seine eigenen Daten zugreifen. Körperfotos sind im Storage mit Zugriffskontrollen gesichert.
              </P>
              <P>Authentifizierung erfolgt über sichere Tokens (JWT) mit automatischer Erneuerung. Passwörter werden nicht im Klartext gespeichert.</P>
            </Section>

            <Section id="cookies" title="8. Cookies und lokaler Speicher">
              <P>
                Diese App verwendet keine Tracking-Cookies. Es werden ausschließlich technisch notwendige Session-Tokens (zur Anmeldung) und lokale Sitzungsdaten (z. B. laufendes Workout im localStorage) gespeichert. Diese Daten verlassen Ihr Gerät nicht und sind für den Betrieb der App erforderlich.
              </P>
              <P>Eine Einwilligung nach § 25 TTDSG ist für technisch notwendige Cookies nicht erforderlich.</P>
            </Section>

            <Section id="aenderungen" title="9. Änderungen dieser Datenschutzerklärung">
              <P>
                Wir behalten uns vor, diese Datenschutzerklärung bei Änderungen der Rechtslage oder bei Änderungen der App anzupassen. Die aktuelle Version ist stets in der App unter Einstellungen → Datenschutz abrufbar.
              </P>
            </Section>

            <p className="text-xs text-text-muted pt-4 border-t border-border">Stand: {STAND_DATUM} | Erstellt unter Berücksichtigung der DSGVO (EU 2016/679), TMG und TTDSG</p>
          </div>
        )}
      </div>
    </div>
  )
}
