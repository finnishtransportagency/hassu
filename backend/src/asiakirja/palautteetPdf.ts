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

    const table = {
      title: this.projektiNimi + " palautteet",
      headers: [{ label: "Nimi" }, { label: "Kysymys tai palaute" }, { label: "Vastaanotettu" }, { label: "Liite", align: "center" }],
      rows: this.palautteet.map((p) => {
        let kysymysTaiPalaute = p.kysymysTaiPalaute ?? "";
        if (p.yhteydenottotapaPuhelin || p.yhteydenottotapaEmail) {
          kysymysTaiPalaute += "\n\n";
          if (p.yhteydenottotapaPuhelin && p.puhelinnumero) {
            kysymysTaiPalaute += "Kansalainen toivoo yhteydenottoa puhelimitse: " + p.puhelinnumero + "\n";
          }
          if (p.yhteydenottotapaEmail && p.sahkoposti) {
            kysymysTaiPalaute += "Kansalainen toivoo yhteydenottoa sähköpostitse: " + p.sahkoposti + "\n";
          }
        }
        const etunimi = p.etunimi?.trim() ?? "";
        const sukunimi = p.sukunimi?.trim() ?? "";
        let nimi: string;
        if (etunimi || sukunimi) {
          nimi = p.etunimi + " " + p.sukunimi;
        } else {
          nimi = "-";
        }
        return [nimi, kysymysTaiPalaute, formatDateTime(p.vastaanotettu), p.liite ? "X" : ""];
      }),
    };
    // A4 595.28 x 841.89 (portrait) (about width sizes)
    // width
    await doc.table(table, {
      columnsSize: [100, 350, 70, 20],
    });

    return this.generatePdfDocument(doc);
  }

  private async generatePdfDocument(doc: PDFKit.PDFDocument): Promise<EnhancedPDF> {
    return new Promise<EnhancedPDF>((resolve) => {
      const buffers = Array<Buffer>();
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const all = Buffer.concat(buffers);
        const sisalto = all.toString("base64");
        resolve({ __typename: "PDF", nimi: "Palautteet.pdf", sisalto, textContent: "" });
      });
      doc.end();
    });
  }
}
