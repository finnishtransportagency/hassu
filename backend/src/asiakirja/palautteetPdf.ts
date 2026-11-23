// Contains code generated or recommended by Amazon Q
import { Palaute } from "../database/model";
import { EnhancedPDF } from "./asiakirjaTypes";

import PDFDocument from "pdfkit-table";
import { formatDateTime } from "hassu-common/util/dateUtils";

export class PalautteetPdf {
  private palautteet: Palaute[];
  private readonly projektiNimi: string;

  constructor(projektiNimi: string, palautteet: Palaute[]) {
    this.projektiNimi = projektiNimi;
    this.palautteet = palautteet;
  }

  async pdf(): Promise<EnhancedPDF> {
    const doc = new PDFDocument({ size: "A4", margins: { top: 30, bottom: 30, left: 30, right: 30 } });

    // textContent is built from the same data as the table rows instead of inheriting abstractPdf,
    // because palautteetPdf uses pdfkit-table directly and does not fit the abstractPdf template model.
    const rows = this.palautteet.map((p) => this.buildRow(p));
    const table = {
      title: this.projektiNimi + " palautteet",
      headers: [{ label: "Nimi" }, { label: "Kysymys tai palaute" }, { label: "Vastaanotettu" }, { label: "Liitteet", align: "center" }],
      rows,
    };
    // A4 595.28 x 841.89 (portrait) (about width sizes)
    // width
    await doc.table(table, {
      columnsSize: [100, 340, 70, 30],
    });

    const textContent = rows.map((row) => row.join(" | ")).join("\n");
    return this.generatePdfDocument(doc, textContent);
  }

  private buildRow(p: Palaute): string[] {
    let kysymysTaiPalaute = p.kysymysTaiPalaute ?? "";
    if (p.puhelinnumero || p.sahkoposti) {
      kysymysTaiPalaute += "\n\n";
      if (p.puhelinnumero) {
        kysymysTaiPalaute += "Puhelinnumero: " + p.puhelinnumero + "\n";
      }
      if (p.sahkoposti) {
        kysymysTaiPalaute += "Sähköposti: " + p.sahkoposti + "\n";
      }
    }
    kysymysTaiPalaute = kysymysTaiPalaute.trimEnd();
    const etunimi = p.etunimi?.trim() ?? "";
    const sukunimi = p.sukunimi?.trim() ?? "";
    const nimi = etunimi || sukunimi ? [etunimi, sukunimi].filter(Boolean).join(" ") : "-";
    return [nimi, kysymysTaiPalaute, formatDateTime(p.vastaanotettu), p.liite || (p.liitteet?.length ?? 0) > 0 ? "X" : ""];
  }

  private async generatePdfDocument(doc: InstanceType<typeof PDFDocument>, textContent: string): Promise<EnhancedPDF> {
    return new Promise<EnhancedPDF>((resolve) => {
      const buffers = Array<Buffer>();
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const all = Buffer.concat(buffers);
        const sisalto = all.toString("base64");
        resolve({ __typename: "PDF", nimi: "Palautteet.pdf", sisalto, textContent });
      });
      doc.end();
    });
  }
}
