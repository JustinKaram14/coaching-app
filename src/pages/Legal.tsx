import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Shield, FileText, HeartPulse } from 'lucide-react'

const BETREIBER_NAME = '[Name]'
const BETREIBER_ADRESSE = '[Straße, Hausnr.]'
const BETREIBER_ORT = '[PLZ Ort]'
const BETREIBER_EMAIL = '[E-Mail]'
const BETREIBER_TEL = '[Telefonnummer]'
const APP_NAME = 'HLX Coaching App'
const STAND_DATUM = '18. Oktober 2026'

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
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'impressum' | 'datenschutz' | 'gesundheit'>(
    params.get('tab') === 'gesundheit' ? 'gesundheit' : params.get('tab') === 'datenschutz' ? 'datenschutz' : 'impressum',
  )

  return (
    <div className="min-h-screen bg-bg p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/login'))}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6 transition-colors">
          <ArrowLeft size={16} /> Zurück
        </button>

        <div className="card mb-6">
          <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl border border-border">
            <button
              onClick={() => setTab('impressum')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${tab === 'impressum' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <FileText size={14} /> Impressum
            </button>
            <button
              onClick={() => setTab('datenschutz')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${tab === 'datenschutz' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <Shield size={14} /> Datenschutz
            </button>
            <button
              onClick={() => setTab('gesundheit')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${tab === 'gesundheit' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <HeartPulse size={14} /> Gesundheit
            </button>
          </div>
        </div>

        {tab === 'impressum' && (
          <div className="card space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">Impressum</h1>
              <p className="text-xs text-text-muted">Angaben gemäß § 5 DDG</p>
            </div>

            <Section id="anbieter" title="Anbieter">
              <P>{BETREIBER_NAME}</P>
              <P>{BETREIBER_ADRESSE}</P>
              <P>{BETREIBER_ORT}</P>
            </Section>

            <Section id="kontakt" title="Kontakt">
              <P>E-Mail: <a href={`mailto:${BETREIBER_EMAIL}`} className="text-brand hover:underline">{BETREIBER_EMAIL}</a></P>
              <P>Telefon: {BETREIBER_TEL}</P>
            </Section>

            <Section id="inhalt" title="Verantwortlich für den Inhalt">
              <P>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:</P>
              <P>{BETREIBER_NAME}, {BETREIBER_ADRESSE}, {BETREIBER_ORT}</P>
            </Section>

            <Section id="haftung-inhalt" title="Haftung für Inhalte">
              <P>
                Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
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
              <p className="text-xs text-text-muted">Gemäß Art. 13 DSGVO | Stand: {STAND_DATUM}</p>
            </div>

            <Section id="verantwortlicher" title="1. Verantwortlicher (Art. 13 Abs. 1 lit. a DSGVO)">
              <P>Verantwortlicher im Sinne der DSGVO ist:</P>
              <P><strong className="text-text-primary">{BETREIBER_NAME}</strong><br />{BETREIBER_ADRESSE}<br />{BETREIBER_ORT}<br />E-Mail: {BETREIBER_EMAIL}</P>
              <P>Ein Datenschutzbeauftragter ist nicht bestellt, da die gesetzlichen Voraussetzungen (§ 38 BDSG) nicht vorliegen. Bei Fragen zum Datenschutz wenden Sie sich bitte an die oben genannte E-Mail-Adresse.</P>
            </Section>

            <Section id="verarbeitete-daten" title="2. Verarbeitete Daten und Zwecke">
              <P><strong className="text-text-primary">2.1 Konto- und Profildaten</strong></P>
              <Ul items={[
                'Name, E-Mail-Adresse und Passwort (nur als verschlüsselter Hash) zur Anmeldung',
                'Rolle (Client/Coach) und Zuordnung zu Ihrem Coach über den Einladungscode',
                'Aktivitätszeitstempel (letzte Nutzung)',
                'Ihre Einstellungen, z. B. Ziele, Erinnerungszeiten und ob Sie den optionalen KI-Funktionen zugestimmt haben',
              ]} />
              <P>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung der App und des Coachings)</P>

              <P className="mt-4"><strong className="text-text-primary">2.2 Gesundheits- und Fitnessdaten (besondere Kategorien, Art. 9 DSGVO)</strong></P>
              <Ul items={[
                'Körpergewicht und Zielgewicht',
                'Trainingseinheiten, Übungen, Sätze, Gewichte, Puls und verbrannte Kalorien',
                'Schlafzeiten, Schlafqualität und Herzratenvariabilität (HRV)',
                'Ernährungsdaten (Mahlzeiten, Kalorien, Makronährstoffe, Ballaststoffe, Wasser)',
                'Körperfotos (optional)',
                'Nahrungsergänzungsmittel',
                'Anamnese-Daten (Gesundheitszustand, Ziele, Allergien, Unverträglichkeiten)',
              ]} />
              <P>Diese Daten sind <strong className="text-text-primary">besondere Kategorien personenbezogener Daten</strong> gem. Art. 9 DSGVO.</P>
              <P>Rechtsgrundlage: Art. 9 Abs. 2 lit. a i.V.m. Art. 6 Abs. 1 lit. a DSGVO (<strong className="text-text-primary">ausdrückliche Einwilligung</strong>, erteilt bei der Registrierung, jederzeit widerruflich durch Löschen des Kontos)</P>

              <P className="mt-4"><strong className="text-text-primary">2.3 Rezepte, Einkaufsliste und Produkt-Check</strong></P>
              <Ul items={[
                'Eigene Rezepte (auch aus Links zu YouTube, Instagram, TikTok oder Webseiten übernommene) und Wochenpläne',
                'Einkaufsliste: Rezepte mit Portionen und eigene Artikel. Abgehakte Einträge werden nur auf Ihrem Gerät gespeichert.',
                'Produkt-Check: gescannte Barcodes, Bewertungen, Favoriten und Ihre Präferenzen (z. B. vegan)',
                'Favoriten, Ausschlüsse („Schmeckt mir nicht“) und Empfehlungen Ihres Coaches',
              ]} />
              <P>
                Die Kostenschätzung für Gerichte und Einkaufslisten wird ausschließlich in der App aus einer festen Preistabelle berechnet; dabei werden keine Daten an Dritte übermittelt.
                Die Suche in unserer Lebensmitteldatenbank (Bundeslebensmittelschlüssel 4.0 des Max Rubner-Instituts und Daten von Open Food Facts) findet auf unserem Server statt.
              </P>
              <P>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO</P>

              <P className="mt-4"><strong className="text-text-primary">2.4 KI-Funktionen (optional)</strong></P>
              <P>
                Wenn Sie die optionalen KI-Funktionen nutzen (z. B. Ernährungsanalyse per Foto oder Text, Screenshot-Auswertung, Koch-Assistent, KI-Rezepte und -Bilder,
                Rezept-Import aus Links, Lebensmittelsuche im Internet), werden die dafür eingegebenen Inhalte (Fotos, Screenshots, Text, Rezept-Links, Suchbegriffe) über unseren Server
                an die Google Gemini API übermittelt. Ihr Gerät verbindet sich dabei nicht direkt mit Google; Ihre IP-Adresse und Ihr Konto werden nicht an Google weitergegeben.
                Beim Rezept-Import ruft unser Server die verlinkte Seite ab; bei YouTube-Links wird das Video zusätzlich von Gemini ausgewertet.
              </P>
              <P>
                Dies erfolgt nur, wenn Sie dieser Verarbeitung ausdrücklich zugestimmt haben, bei der Registrierung oder später in der App. Ohne diese Einwilligung können Sie die App
                vollständig ohne KI nutzen; die Einwilligung wird zusätzlich auf dem Server geprüft. Sie können sie jederzeit in den Einstellungen widerrufen oder erneut erteilen.
              </P>
              <P>Rechtsgrundlage: Art. 9 Abs. 2 lit. a i.V.m. Art. 6 Abs. 1 lit. a DSGVO (optionale, widerrufliche Einwilligung)</P>

              <P className="mt-4"><strong className="text-text-primary">2.5 Datenweitergabe an den Coach</strong></P>
              <P>
                Ihr Coach kann Ihre Trainings-, Ernährungs-, Gewichts-, Schlaf- und Supplementdaten, Ihre Einstellungen, Rezepte und Ihren Fortschritt in der App einsehen und Ihnen Pläne, Rezepte, Challenges und Termine zuweisen.
                Körperfotos sind <strong className="text-text-primary">standardmäßig nicht</strong> für den Coach sichtbar; Sie können den Zugriff jederzeit in den Einstellungen gewähren oder entziehen.
              </P>
              <P>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Coaching-Vertrag) sowie für Gesundheitsdaten Ihre Einwilligung bei der Registrierung (Art. 9 Abs. 2 lit. a DSGVO)</P>

              <P className="mt-4"><strong className="text-text-primary">2.6 Push-Benachrichtigungen (optional)</strong></P>
              <P>
                Wenn Sie Benachrichtigungen erlauben, speichern wir die von Ihrem Browser erzeugte Push-Adresse. Erinnerungen und Nachrichten Ihres Coaches werden über den Push-Dienst
                des Browser- bzw. Geräteherstellers zugestellt (z. B. Google Firebase Cloud Messaging, Apple Push Notification Service, Mozilla Push Service). Dabei erhält der jeweilige Dienst
                den Inhalt der Benachrichtigung und die Push-Adresse. Sie können Benachrichtigungen jederzeit in den Einstellungen der App oder Ihres Browsers abschalten.
              </P>
              <P>Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung über die Browser-Abfrage)</P>

              <P className="mt-4"><strong className="text-text-primary">2.7 Bereitstellung der Web-App (Server-Logdateien)</strong></P>
              <P>
                Die Web-App wird über GitHub Pages ausgeliefert. Beim Aufruf verarbeitet GitHub technisch notwendige Verbindungsdaten (IP-Adresse, Zeitpunkt, aufgerufene Datei, Browser-Kennung),
                um die Seite auszuliefern und die Sicherheit des Dienstes zu gewährleisten. Schriftarten und alle Programmteile werden von dort ausgeliefert; es werden keine Inhalte von Google Fonts
                oder ähnlichen Diensten geladen.
              </P>
              <P>Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer sicheren und funktionsfähigen Bereitstellung)</P>
            </Section>

            <Section id="empfaenger" title="3. Empfänger / Auftragsverarbeiter (Art. 13 Abs. 1 lit. e und f DSGVO)">
              <div className="space-y-3">
                <div className="p-3 bg-bg-elevated rounded-xl border border-border">
                  <P><strong className="text-text-primary">Supabase Inc.</strong> (Datenbank, Anmeldung, Dateispeicher, Server-Funktionen) – Auftragsverarbeiter</P>
                  <P>Adresse: 970 Toa Payoh North #07-04, Singapore 318992</P>
                  <P>Serverstandort: Irland (EU, Region eu-west-1). Ein Zugriff aus Drittländern (z. B. für Support) ist nur auf Grundlage der EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO) im Auftragsverarbeitungsvertrag möglich.</P>
                  <P>Datenschutz: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">supabase.com/privacy</a></P>
                </div>
                <div className="p-3 bg-bg-elevated rounded-xl border border-border">
                  <P><strong className="text-text-primary">GitHub, Inc.</strong> (Auslieferung der Web-App über GitHub Pages)</P>
                  <P>Adresse: 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA</P>
                  <P>Drittlandübermittlung in die USA auf Grundlage des Angemessenheitsbeschlusses zum EU-US Data Privacy Framework (Art. 45 DSGVO), dem GitHub angehört, ergänzend Standardvertragsklauseln.</P>
                  <P>Datenschutz: <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">GitHub-Datenschutzerklärung</a></P>
                </div>
                <div className="p-3 bg-bg-elevated rounded-xl border border-border">
                  <P><strong className="text-text-primary">Google LLC / Google Ireland Ltd.</strong> (Gemini API – nur bei optionaler KI-Nutzung)</P>
                  <P>Adresse: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland; Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</P>
                  <P>
                    Übermittelt werden nur die Inhalte, die Sie für die jeweilige KI-Funktion eingeben, über unseren Server. Eine Übermittlung in die USA ist möglich; sie erfolgt auf Grundlage des
                    EU-US Data Privacy Framework (Art. 45 DSGVO), dem Google angehört, ergänzend Standardvertragsklauseln. Wir nutzen den kostenpflichtigen Zugang der Gemini API; nach den
                    Bedingungen von Google werden die Inhalte dabei nicht zur Verbesserung von Google-Produkten verwendet, sondern nur für begrenzte Zeit zur Missbrauchserkennung gespeichert.
                  </P>
                  <P>Datenschutz: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">policies.google.com/privacy</a></P>
                </div>
                <div className="p-3 bg-bg-elevated rounded-xl border border-border">
                  <P><strong className="text-text-primary">Open Food Facts</strong> (gemeinnützige Lebensmitteldatenbank, Frankreich)</P>
                  <P>
                    Bei Barcode-Scans, im Produkt-Check und wenn unsere eigene Datenbank zu einer Suche wenig findet, fragt Ihr Gerät direkt bei Open Food Facts an. Dabei werden der Barcode
                    bzw. Suchbegriff sowie technisch bedingt Ihre IP-Adresse übermittelt; Produktbilder werden von Open Food Facts geladen. Weitere Daten (Name, Gesundheitsdaten) werden nicht übermittelt.
                  </P>
                  <P>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung der von Ihnen genutzten Funktion)</P>
                  <P>Datenschutz: <a href="https://world.openfoodfacts.org/privacy" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">openfoodfacts.org/privacy</a></P>
                </div>
                <div className="p-3 bg-bg-elevated rounded-xl border border-border">
                  <P><strong className="text-text-primary">Pexels</strong> (Fotodatenbank für Rezeptbilder)</P>
                  <P>Unser Server sucht dort nur mit dem Rezeptnamen nach einem passenden Foto. Es werden keine personenbezogenen Daten übermittelt.</P>
                </div>
                <div className="p-3 bg-bg-elevated rounded-xl border border-border">
                  <P><strong className="text-text-primary">Push-Dienste der Browser- und Gerätehersteller</strong> (nur bei aktivierten Benachrichtigungen, siehe 2.6)</P>
                  <P>z. B. Google (Chrome, Android), Apple (Safari, iOS), Mozilla (Firefox). Diese Anbieter können ihren Sitz außerhalb der EU haben; die Übermittlung erfolgt auf Grundlage Ihrer Einwilligung bzw. des Data Privacy Framework.</P>
                </div>
              </div>
            </Section>

            <Section id="speicherdauer" title="4. Speicherdauer (Art. 13 Abs. 2 lit. a DSGVO)">
              <P>Ihre Daten werden gespeichert, solange Ihr Konto aktiv ist. Nach Löschung Ihres Kontos werden alle personenbezogenen Daten und Gesundheitsdaten unverzüglich gelöscht (Kaskadenlöschung). Gesetzliche Aufbewahrungsfristen (z. B. nach HGB, AO) sind zu beachten, sofern anwendbar.</P>
              <P>Einzelne Einträge (z. B. Mahlzeiten, Rezepte, Artikel der Einkaufsliste, gescannte Produkte) können Sie jederzeit selbst löschen. Ungültig gewordene Push-Adressen werden automatisch entfernt.</P>
              <P>Technische Logs in Supabase (Verbindungs- und Fehlerprotokolle) werden nach spätestens 30 Tagen automatisch gelöscht. Für Server-Logdateien von GitHub und Inhalte bei Google gelten die Fristen dieser Anbieter.</P>
            </Section>

            <Section id="rechte" title="5. Ihre Rechte als betroffene Person (Art. 15–22 DSGVO)">
              <Ul items={[
                'Recht auf Auskunft (Art. 15): Sie können jederzeit Auskunft über Ihre gespeicherten Daten anfordern.',
                'Recht auf Berichtigung (Art. 16): Unrichtige Daten können Sie direkt in der App berichtigen.',
                'Recht auf Löschung (Art. 17): Sie können Ihr Konto und alle Daten jederzeit unter Einstellungen → Konto löschen unwiderruflich löschen.',
                'Recht auf Einschränkung der Verarbeitung (Art. 18)',
                'Recht auf Datenübertragbarkeit (Art. 20): Ihre Daten können auf Anfrage als CSV/JSON exportiert werden.',
                'Recht auf Widerspruch (Art. 21) gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 6 Abs. 1 lit. f DSGVO)',
                'Recht auf Widerruf der Einwilligung (Art. 7 Abs. 3): Sie können Einwilligungen jederzeit widerrufen, z. B. die KI-Einwilligung und Benachrichtigungen in den Einstellungen. Der Widerruf berührt nicht die Rechtmäßigkeit der vor dem Widerruf erfolgten Verarbeitung.',
              ]} />
              <P>Zur Ausübung Ihrer Rechte wenden Sie sich an: <a href={`mailto:${BETREIBER_EMAIL}`} className="text-brand hover:underline">{BETREIBER_EMAIL}</a></P>
            </Section>

            <Section id="beschwerde" title="6. Beschwerderecht bei der Aufsichtsbehörde (Art. 77 DSGVO)">
              <P>Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, insbesondere in dem Mitgliedstaat Ihres Aufenthaltsortes, Ihres Arbeitsplatzes oder des Ortes des mutmaßlichen Verstoßes.</P>
              <P>
                Zuständig für uns ist die Datenschutz-Aufsichtsbehörde des Bundeslandes, in dem der Verantwortliche seinen Sitz hat. Eine Übersicht aller Behörden mit Kontaktdaten finden Sie unter{' '}
                <a href="https://www.bfdi.bund.de/DE/Service/Anschriften/Laender/Laender-node.html" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">bfdi.bund.de – Anschriften der Landesdatenschutzbehörden</a>.
              </P>
            </Section>

            <Section id="sicherheit" title="7. Datensicherheit">
              <P>
                Die Übertragung von Daten zwischen App und Server erfolgt ausschließlich verschlüsselt (HTTPS/TLS). Alle Daten werden in einer Supabase-Datenbank mit Row-Level Security (RLS) gespeichert:
                Jede Person kann nur auf ihre eigenen Daten zugreifen, ein Coach zusätzlich auf die Daten der eigenen Klienten im oben beschriebenen Umfang. Körperfotos liegen in einem nicht öffentlichen
                Speicher mit Zugriffskontrollen.
              </P>
              <P>Die Anmeldung erfolgt über signierte Tokens (JWT) mit automatischer Erneuerung. Passwörter werden nicht im Klartext gespeichert. Eine Sicherheitsrichtlinie (Content Security Policy) beschränkt, mit welchen Diensten die App Verbindungen aufbauen darf.</P>
            </Section>

            <Section id="cookies" title="8. Cookies und lokaler Speicher">
              <P>
                Diese App verwendet keine Tracking- oder Werbe-Cookies und keine Analyse-Dienste. Gespeichert werden ausschließlich technisch notwendige Daten auf Ihrem Gerät: das Anmelde-Token sowie
                lokale Einstellungen und Zwischenstände (z. B. Design hell/dunkel, laufendes Workout, abgehakte Einträge der Einkaufsliste, zwischengespeicherte Listen für die Nutzung ohne Verbindung).
                Diese Daten verlassen Ihr Gerät nicht, sofern sie nicht ohnehin mit Ihrem Konto gespeichert werden.
              </P>
              <P>Eine Einwilligung ist hierfür nicht erforderlich, da die Speicherung für die von Ihnen gewünschte Nutzung unbedingt erforderlich ist (§ 25 Abs. 2 Nr. 2 TDDDG).</P>
            </Section>

            <Section id="aenderungen" title="9. Änderungen dieser Datenschutzerklärung">
              <P>
                Wir behalten uns vor, diese Datenschutzerklärung bei Änderungen der Rechtslage oder bei Änderungen der App anzupassen. Die aktuelle Version ist stets in der App unter Einstellungen → Datenschutz abrufbar.
              </P>
            </Section>

            <p className="text-xs text-text-muted pt-4 border-t border-border">Stand: {STAND_DATUM} | Erstellt unter Berücksichtigung der DSGVO (EU 2016/679), des BDSG, des DDG und des TDDDG</p>
          </div>
        )}

        {tab === 'gesundheit' && (
          <div className="card space-y-6" data-testid="gesundheitshinweis">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">Gesundheitshinweis</h1>
              <p className="text-xs text-text-muted">Zu Rezepten, Nährwerten und Ernährungs-Tags in der App | Stand: {STAND_DATUM}</p>
            </div>

            <Section id="keine-beratung" title="Keine ärztliche Empfehlung">
              <P>
                Alle Inhalte zu Ernährung und Gesundheit in dieser App dienen der allgemeinen Information und Motivation. Das betrifft Rezepte,
                Nährwerte, Tags wie „Ballaststoffreich“, „Darmfreundlich“, „Probiotisch“, „Präbiotisch“, „Fermentiert“ oder „Entzündungshemmend / Omega-3“,
                den Antioxidantien-Score, den Pflanzenzähler sowie Tagesziele und Vorschläge.
              </P>
              <P>
                Sie sind <strong className="text-text-primary">keine ärztliche, therapeutische oder ernährungsmedizinische Beratung</strong>, stellen keine Diagnose und ersetzen keine Behandlung.
                Bei Erkrankungen, Schwangerschaft, Stillzeit, Medikamenteneinnahme, Essstörungen oder anderen gesundheitlichen Fragen sprich bitte mit deiner Ärztin, deinem Arzt oder einer qualifizierten Ernährungsfachkraft, bevor du deine Ernährung änderst.
              </P>
            </Section>

            <Section id="schaetzwerte" title="Wie die Werte entstehen">
              <P>
                Nährwerte und Tags werden aus Durchschnittswerten der Zutaten berechnet und sind <strong className="text-text-primary">Schätzungen</strong>.
                Abweichungen entstehen durch Produkt, Zubereitung, Garverluste und Portionsgröße. Die Schwellenwerte für jedes Tag stehen in der App im Rezept unter „So wird gerechnet“.
              </P>
              <P>Der Antioxidantien-Score (1 bis 3 Punkte) ist ein einfacher Richtwert aus Zutaten und Mengen und keine Laboranalyse.</P>
            </Section>

            <Section id="allergien" title="Allergien und Unverträglichkeiten">
              <P>
                Die Filter, die Anamnese-Auswertung und die Ausschlussliste helfen beim Aussortieren, ersetzen aber nicht die eigene Prüfung. Spuren, Kreuzkontamination und Zutaten in Fertigprodukten sind nicht erfasst.
                Texte aus der Anamnese werden automatisch gelesen und können falsch oder unvollständig erkannt werden. <strong className="text-text-primary">Bei Allergien prüfe bitte immer die Zutatenliste selbst.</strong>
              </P>
            </Section>

            <Section id="darm" title="Probiotische, präbiotische und fermentierte Lebensmittel">
              <P>
                Ob ein Lebensmittel lebende Kulturen enthält, hängt vom Produkt ab; Erhitzen zerstört sie. Eine bestimmte Wirkung auf Verdauung oder Gesundheit wird nicht zugesagt.
                Ballaststoffreiche und präbiotische Zutaten (z. B. Zwiebel, Lauch, Topinambur, Hülsenfrüchte) können bei empfindlichem Darm Blähungen verursachen. Bei Reizdarm, Histaminintoleranz, geschwächtem Immunsystem oder Unsicherheit halte bitte Rücksprache mit einer Ärztin oder einem Arzt.
              </P>
            </Section>

            <Section id="ki" title="KI-Rezepte und KI-Fotos">
              <P>
                Rezepte, die per KI erzeugt werden, können Fehler enthalten. Die App rechnet Nährwerte und Ernährungsart nach und verwirft offensichtlich unpassende Vorschläge, eine Garantie gibt es nicht.
                Fotos in der App sind KI-generierte Bilder und zeigen das Gericht nur beispielhaft.
              </P>
            </Section>

            <Section id="naehrwerte" title="Nährwertdaten">
              <P>
                Grundnahrungsmittel: Bundeslebensmittelschlüssel (BLS), Version 4.0, Max Rubner-Institut (2025), DOI 10.25826/Data20251217-134202-0.
                Markenprodukte: Open Food Facts (openfoodfacts.org), Datenbank unter Open Database License (ODbL).
                Die Werte sind Durchschnitts- bzw. Herstellerangaben und können vom tatsächlichen Produkt abweichen.
              </P>
            </Section>

            <Section id="coach" title="Empfehlungen deines Coaches">
              <P>Rezept-Empfehlungen deines Coaches sind Ernährungs- und Trainingstipps im Rahmen des Coachings und ersetzen keine ärztliche Beratung.</P>
            </Section>

            <p className="text-xs text-text-muted pt-4 border-t border-border">Stand: {STAND_DATUM}</p>
          </div>
        )}
      </div>
    </div>
  )
}
