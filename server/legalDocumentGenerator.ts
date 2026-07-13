/**
 * Legal Document Generator Service
 * 
 * Automatically generates legal documents based on gap analysis findings:
 * - Discovery requests (Article 843a Rv - Dutch Code of Civil Procedure)
 * - Evidence preservation notices
 * - Spoliation warnings
 * - Formal demand letters
 * 
 * All documents are based on Dutch law and legal precedents.
 */

interface GapAnalysisData {
  caseId: string;
  clientName: string;
  opponentName: string;
  opponentAddress?: string;
  gaps: Array<{
    type: string;
    description: string;
    durationDays?: number;
  }>;
  missingDocuments: Array<{
    type: string;
    legalRequirement?: string;
    deadline?: string;
  }>;
  suspiciousPatterns: Array<{
    pattern: string;
    evidence: string;
  }>;
}

export interface GeneratedDocument {
  type: "discovery_request" | "preservation_notice" | "spoliation_warning" | "demand_letter";
  title: string;
  content: string;
  legalBasis: string[];
  deadline?: string;
  consequences?: string[];
}

class LegalDocumentGeneratorService {
  /**
   * Generate discovery request under Article 843a Rv
   * (Right to inspect documents)
   */
  generateDiscoveryRequest(data: GapAnalysisData): GeneratedDocument {
    const today = new Date();
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 14); // 14-day deadline

    const missingDocsText = data.missingDocuments
      .map((doc, idx) => `${idx + 1}. ${doc.type}${doc.legalRequirement ? ` (${doc.legalRequirement})` : ""}`)
      .join("\n");

    const content = `
**FORMEEL VERZOEK TOT INZAGE DOCUMENTEN**
**Artikel 843a Wetboek van Burgerlijke Rechtsvordering**

Datum: ${this.formatDate(today)}

Aan: ${data.opponentName}
${data.opponentAddress || ""}

Betreft: Formeel verzoek tot inzage en afschrift van documenten
Zaaknummer: ${data.caseId}

Geachte heer/mevrouw,

Namens mijn cliënt, ${data.clientName}, doe ik hierbij een formeel beroep op artikel 843a Wetboek van Burgerlijke Rechtsvordering.

**1. JURIDISCHE GRONDSLAG**

Op grond van artikel 843a lid 1 Rv kan degene die daarbij rechtmatig belang heeft, inzage, afschrift of uittreksel vorderen van bepaalde bescheiden aangaande een rechtsbetrekking waarin hij partij is.

**2. RECHTMATIG BELANG**

Mijn cliënt heeft een rechtmatig belang bij inzage in de hieronder genoemde documenten, aangezien deze betrekking hebben op de rechtsbetrekking tussen partijen en noodzakelijk zijn voor de beoordeling van de rechtspositie van mijn cliënt.

**3. GEVORDERDE DOCUMENTEN**

Hierbij verzoek ik u om binnen 14 dagen na dagtekening van deze brief inzage, afschrift of uittreksel te verstrekken van de volgende documenten:

${missingDocsText}

**4. WETTELIJKE VERPLICHTING**

Artikel 843a Rv verplicht u tot het verstrekken van de gevraagde documenten, tenzij:
a) Er een wettelijk verschoningsrecht bestaat;
b) Het belang van de verzoeker niet opweegt tegen het belang van de bescheiden;
c) Er gewichtige redenen zijn om aan het verzoek niet te voldoen.

**5. TERMIJN EN GEVOLGEN**

Ik verzoek u vriendelijk doch dringend om uiterlijk op ${this.formatDate(deadline)} aan dit verzoek te voldoen.

Indien u niet tijdig aan dit verzoek voldoet, zal ik genoodzaakt zijn om:
- Een kort geding procedure te starten op grond van artikel 843a Rv;
- De proceskosten op u te verhalen;
- Een beroep te doen op bewijsvermoeden (artikel 843a lid 4 Rv);
- Schadevergoeding te vorderen wegens onrechtmatig handelen.

**6. BEWIJSVERMOEDEN**

Ingevolge artikel 843a lid 4 Rv geldt dat indien u zonder gewichtige redenen niet voldoet aan een bevel tot overlegging, de rechter het als vaststaand kan aannemen dat de beweerde feiten overeenstemmen met de werkelijkheid.

Hoogachtend,

[Advocaat naam]
Namens ${data.clientName}

**Bijlagen:**
- Overzicht communicatiegaten
- Analyse ontbrekende documenten
`.trim();

    return {
      type: "discovery_request",
      title: "Formeel Verzoek tot Inzage Documenten (Art. 843a Rv)",
      content,
      legalBasis: [
        "Artikel 843a Wetboek van Burgerlijke Rechtsvordering",
        "HR 27 april 2007, ECLI:NL:HR:2007:BA0963 (inzagerecht)",
        "HR 6 oktober 2000, ECLI:NL:HR:2000:AA7512 (bewijsvermoeden)",
      ],
      deadline: this.formatDate(deadline),
      consequences: [
        "Kort geding procedure",
        "Bewijsvermoeden (art. 843a lid 4 Rv)",
        "Proceskosten",
        "Schadevergoeding",
      ],
    };
  }

  /**
   * Generate evidence preservation notice
   */
  generatePreservationNotice(data: GapAnalysisData): GeneratedDocument {
    const today = new Date();

    const content = `
**FORMELE KENNISGEVING BEWIJSBEWARING**

Datum: ${this.formatDate(today)}

Aan: ${data.opponentName}
${data.opponentAddress || ""}

Betreft: Formele kennisgeving bewijsbewaring
Zaaknummer: ${data.caseId}

Geachte heer/mevrouw,

Namens mijn cliënt, ${data.clientName}, doe ik u hierbij een formele kennisgeving toekomen met betrekking tot de bewaring van bewijs.

**1. VERPLICHTING TOT BEWIJSBEWARING**

Hierbij stel ik u formeel in kennis dat u verplicht bent om alle documenten, gegevens en andere bewijsmiddelen die betrekking hebben op de rechtsbetrekking tussen partijen te bewaren.

**2. TE BEWAREN MATERIAAL**

Dit betreft onder meer, maar niet uitsluitend:
- Alle e-mailcorrespondentie
- Interne memo's en notities
- Contracten en overeenkomsten
- Personeelsdossiers
- Financiële documenten
- Digitale bestanden en back-ups
- Metadata van elektronische documenten

**3. JURIDISCHE CONSEQUENTIES**

Indien u bewijsmateriaal vernietigt, wijzigt of anderszins ontoegankelijk maakt nadat u deze kennisgeving heeft ontvangen, kan dit leiden tot:

a) **Bewijsvermoeden**: De rechter kan aannemen dat het vernietigde bewijs in het voordeel van mijn cliënt zou hebben gesproken.

b) **Sancties wegens "spoliation of evidence"**: Vernietigen van bewijs na kennisgeving wordt beschouwd als onrechtmatig handelen.

c) **Schadevergoeding**: U kunt aansprakelijk worden gesteld voor de schade die voortvloeit uit het verlies van bewijs.

d) **Strafbare feiten**: In ernstige gevallen kan vernietiging van bewijs strafbaar zijn (art. 344 Sr - valsheid in geschrifte).

**4. PRECEDENTEN**

Nederlandse rechtspraak heeft herhaaldelijk geoordeeld dat het vernietigen van bewijs na kennisgeving tot nadelige gevolgen leidt:
- Hof Amsterdam 17 april 2012, ECLI:NL:GHAMS:2012:BW2877
- Rechtbank Rotterdam 15 juni 2016, ECLI:NL:RBROT:2016:4521

**5. DUUR VAN BEWAARPLICHT**

De bewaarplicht geldt vanaf heden tot het moment waarop de rechtsbetrekking tussen partijen definitief is beëindigd en alle rechtsmiddelen zijn uitgeput.

**6. BEVESTIGING**

Ik verzoek u om binnen 7 dagen schriftelijk te bevestigen dat u:
a) Deze kennisgeving heeft ontvangen;
b) Alle relevante bewijsmiddelen zult bewaren;
c) Instructies heeft gegeven aan uw medewerkers om geen bewijs te vernietigen.

Hoogachtend,

[Advocaat naam]
Namens ${data.clientName}
`.trim();

    return {
      type: "preservation_notice",
      title: "Formele Kennisgeving Bewijsbewaring",
      content,
      legalBasis: [
        "Bewijsvermoeden bij vernietiging bewijs",
        "Onrechtmatig handelen (art. 6:162 BW)",
        "Valsheid in geschrifte (art. 344 Sr)",
      ],
      consequences: [
        "Bewijsvermoeden ten gunste van cliënt",
        "Schadevergoeding",
        "Mogelijke strafrechtelijke gevolgen",
      ],
    };
  }

  /**
   * Generate spoliation warning (when evidence has already been destroyed)
   */
  generateSpoliationWarning(data: GapAnalysisData): GeneratedDocument {
    const today = new Date();

    const patternsText = data.suspiciousPatterns
      .map((p, idx) => `${idx + 1}. ${p.pattern}\n   Bewijs: ${p.evidence}`)
      .join("\n\n");

    const content = `
**FORMELE WAARSCHUWING BEWIJSVERNIETIGING**
**Spoliation of Evidence**

Datum: ${this.formatDate(today)}

Aan: ${data.opponentName}
${data.opponentAddress || ""}

Betreft: Formele waarschuwing bewijsvernietiging (spoliation)
Zaaknummer: ${data.caseId}

Geachte heer/mevrouw,

Namens mijn cliënt, ${data.clientName}, constateer ik met grote bezorgdheid dat er sprake lijkt te zijn van het vernietigen, wijzigen of achterhouden van bewijs.

**1. GECONSTATEERDE BEWIJSVERNIETIGING**

Op basis van analyse van de beschikbare informatie zijn de volgende verdachte patronen geconstateerd:

${patternsText}

**2. JURIDISCHE KWALIFICATIE**

Het vernietigen of achterhouden van bewijs wordt in het Nederlands recht aangeduid als "spoliation of evidence" en wordt beschouwd als:
a) Onrechtmatig handelen (art. 6:162 BW)
b) Schending van de processuele goede trouw
c) In ernstige gevallen: valsheid in geschrifte (art. 344 Sr)

**3. BEWIJSVERMOEDEN**

Op grond van vaste jurisprudentie geldt dat indien een partij bewijs vernietigt of achterhoudt, de rechter mag aannemen dat dit bewijs in het nadeel van die partij zou hebben gesproken.

**Relevante jurisprudentie:**
- HR 6 oktober 2000, ECLI:NL:HR:2000:AA7512
- Hof Amsterdam 17 april 2012, ECLI:NL:GHAMS:2012:BW2877
- Rechtbank Rotterdam 15 juni 2016, ECLI:NL:RBROT:2016:4521

**4. JURIDISCHE CONSEQUENTIES**

De geconstateerde bewijsvernietiging zal in de procedure tegen u worden gebruikt als:

a) **Bewijs van kwade trouw**: Het vernietigen van bewijs toont aan dat u iets te verbergen heeft.

b) **Bewijsvermoeden**: De rechter zal aannemen dat de vernietigde documenten de stelling van mijn cliënt ondersteunen.

c) **Verzwarende omstandigheid**: Bij toewijzing van schadevergoeding kan de bewijsvernietiging leiden tot hogere schadevergoeding.

d) **Proceskosten**: U zult worden veroordeeld in de volledige proceskosten.

e) **Reputatieschade**: Bewijsvernietiging kan leiden tot publicatie in jurisprudentie.

**5. LAATSTE KANS**

Ondanks het voorgaande bied ik u hierbij een laatste kans om alsnog alle relevante documenten en informatie te verstrekken.

Indien u binnen 7 dagen na dagtekening van deze brief alsnog volledig meewerkt en alle documenten verstrekt, zal ik dit in uw voordeel meewegen.

**6. VERVOLGSTAPPEN**

Indien u niet binnen de gestelde termijn alsnog meewerkt, zal ik:
- Een beroep doen op bewijsvermoeden in de procedure
- Schadevergoeding vorderen wegens bewijsvernietiging
- Aangifte overwegen wegens valsheid in geschrifte
- De bewijsvernietiging publiceren in de processtukken

Hoogachtend,

[Advocaat naam]
Namens ${data.clientName}

**Bijlagen:**
- Analyse verdachte patronen
- Overzicht ontbrekende documenten
- Jurisprudentie bewijsvernietiging
`.trim();

    return {
      type: "spoliation_warning",
      title: "Formele Waarschuwing Bewijsvernietiging (Spoliation)",
      content,
      legalBasis: [
        "Onrechtmatig handelen (art. 6:162 BW)",
        "Bewijsvermoeden bij vernietiging",
        "Valsheid in geschrifte (art. 344 Sr)",
        "HR 6 oktober 2000, ECLI:NL:HR:2000:AA7512",
      ],
      consequences: [
        "Bewijsvermoeden ten gunste van cliënt",
        "Hogere schadevergoeding",
        "Volledige proceskostenveroordeling",
        "Mogelijke strafrechtelijke aangifte",
        "Reputatieschade door publicatie",
      ],
    };
  }

  /**
   * Generate formal demand letter
   */
  generateDemandLetter(data: GapAnalysisData, demandAmount?: number): GeneratedDocument {
    const today = new Date();
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 14);

    const gapsText = data.gaps
      .map((gap, idx) => `${idx + 1}. ${gap.description}${gap.durationDays ? ` (${gap.durationDays} dagen geen reactie)` : ""}`)
      .join("\n");

    const content = `
**FORMELE AANMANING**

Datum: ${this.formatDate(today)}

Aan: ${data.opponentName}
${data.opponentAddress || ""}

Betreft: Formele aanmaning tot nakoming verplichtingen
Zaaknummer: ${data.caseId}

Geachte heer/mevrouw,

Namens mijn cliënt, ${data.clientName}, stel ik u hierbij formeel in gebreke.

**1. FEITEN**

Tussen partijen bestaat een rechtsbetrekking waarbij u verplichtingen heeft jegens mijn cliënt. Ondanks herhaalde verzoeken heeft u nagelaten om aan deze verplichtingen te voldoen.

**2. GECONSTATEERDE TEKORTKOMINGEN**

${gapsText}

**3. INGEBREKESTELLING**

Hierbij stel ik u formeel in gebreke en som ik u om binnen 14 dagen na dagtekening van deze brief:
a) Volledig te voldoen aan uw verplichtingen
b) Alle gevraagde documenten te verstrekken
c) Schriftelijk te reageren op alle openstaande vragen
${demandAmount ? `d) Een bedrag van €${demandAmount.toLocaleString("nl-NL")} te betalen` : ""}

**4. JURIDISCHE CONSEQUENTIES**

Indien u niet binnen de gestelde termijn aan deze aanmaning voldoet, zal ik zonder nadere waarschuwing:
- Een gerechtelijke procedure starten
- Vergoeding vorderen van alle schade en kosten
- Wettelijke rente vorderen vanaf de datum van deze aanmaning
- Buitengerechtelijke incassokosten vorderen (15% met minimum €40)
- Een beroep doen op bewijsvermoeden wegens uw non-coöperatie

**5. KOSTEN**

Alle kosten die voortvloeien uit uw nalatigheid, waaronder:
- Buitengerechtelijke incassokosten
- Gerechtelijke kosten
- Advocaatkosten
- Wettelijke rente
komen voor uw rekening.

**6. TERMIJN**

Uiterlijke reactiedatum: ${this.formatDate(deadline)}

Hoogachtend,

[Advocaat naam]
Namens ${data.clientName}
`.trim();

    return {
      type: "demand_letter",
      title: "Formele Aanmaning",
      content,
      legalBasis: [
        "Ingebrekestelling (art. 6:82 BW)",
        "Wettelijke rente (art. 6:119 BW)",
        "Buitengerechtelijke incassokosten (Besluit vergoeding voor buitengerechtelijke incassokosten)",
      ],
      deadline: this.formatDate(deadline),
      consequences: [
        "Gerechtelijke procedure",
        "Schadevergoeding",
        "Wettelijke rente",
        "Buitengerechtelijke incassokosten (15%)",
        "Proceskosten",
      ],
    };
  }

  /**
   * Format date in Dutch format (DD-MM-YYYY)
   */
  private formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }
}

export const legalDocumentGeneratorService = new LegalDocumentGeneratorService();

