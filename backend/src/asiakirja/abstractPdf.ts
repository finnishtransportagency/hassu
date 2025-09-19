import PDFDocument from "pdfkit";
import { EnhancedPDF } from "./asiakirjaTypes";
import { assertIsDefined } from "../util/assertions";
import { convertPdfFileName, linkExtractRegEx } from "./asiakirjaUtil";
import PDFStructureElement = PDFKit.PDFStructureElement;
import PDFKitReference = PDFKit.PDFKitReference;
import { SuunnitteluSopimus, SuunnitteluSopimusJulkaisu } from "../database/model";
import { fileService } from "../files/fileService";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

const INDENTATION_BODY = 186;

export type ParagraphOptions = {
  spacingAfter?: number;
  markupAllowed?: boolean;
};

export abstract class AbstractPdf {
  private title!: string;
  private fileName!: string;
  protected fileBasePath!: string;
  protected doc!: PDFKit.PDFDocument;
  private textContent = "";
  private baseline: number | "alphabetic" | undefined;
  protected logo?: string | Buffer;
  private sopimus?: SuunnitteluSopimusJulkaisu | SuunnitteluSopimus | null;
  protected kieli: KaannettavaKieli;
  protected oid: string;
  protected sopimusLogo?: string | Buffer;
  protected osapuoltenLogot: (string | Buffer)[] = [];

  constructor(kieli: KaannettavaKieli, oid: string) {
    this.kieli = kieli;
    this.oid = oid;
  }

  setupPDF(
    header: string,
    nimi: string,
    fileName: string,
    suunnitteluSopimus: SuunnitteluSopimusJulkaisu | SuunnitteluSopimus | null | undefined,
    baseline?: number | "alphabetic"
  ): void {
    this.title = header + "; " + nimi;
    // Clean filename by joining allowed characters together
    this.fileName = convertPdfFileName(fileName);
    this.fileBasePath = __dirname;
    this.setupAccessibleDocument();
    this.baseline = baseline;
    this.sopimus = suunnitteluSopimus;
  }

  protected paragraphBold(text: string, options?: ParagraphOptions): PDFStructureElement {
    return this.doc.struct("P", {}, [
      () => {
        this.doc.font("ArialMTBold").text(text, { baseline: this.baseline }).font("ArialMT");
        if (options?.spacingAfter) {
          this.doc.moveDown(options.spacingAfter);
        }
      },
    ]);
  }

  protected paragraph(text: string, options?: ParagraphOptions): PDFStructureElement {
    const parts = text.split(linkExtractRegEx);
    if (parts.length == 1) {
      const strings = text.split("*");
      if (strings.length === 1 || !options?.markupAllowed) {
        return this.doc.struct("P", {}, () =>
          this.doc.text(text, { baseline: this.baseline, underline: false, link: undefined }).moveDown(1 + (options?.spacingAfter ?? 0))
        );
      } else {
        return this.getParagraphWithBoldText(strings, options);
      }
    }
    return this.getParagraphWithLinks(parts, options);
  }

  private getParagraphWithLinks(parts: string[], options?: ParagraphOptions) {
    const children = parts.map((part, index) => {
      const isLink = index % 2 === 1;
      const continued = index < parts.length - 1;

      const tag = isLink ? "Link" : "P";
      const link = isLink ? part : null;
      const alt = isLink ? part : undefined;
      const color = isLink ? "blue" : "black";
      const underline = !!isLink;

      return this.doc.struct(tag, { alt }, () => {
        this.doc.fillColor(color).text(part, {
          baseline: this.baseline,
          link,
          continued,
          underline,
        });
        if (!continued) {
          // Jos viimeinen elementti on tyhjä, jostain syystä rivi ei vaihdu normaalilla tavalla,
          // joten tehdään ylimääräinen rivivaihto
          const moveDown = part === "" ? 2 : 1;
          this.doc.moveDown(moveDown + (options?.spacingAfter ?? 0));
        }
      });
    });

    return this.doc.struct("P", {}, children);
  }

  private getParagraphWithBoldText(strings: string[], options?: ParagraphOptions) {
    return this.doc.struct("P", {}, () => {
      strings.forEach((string, index) => {
        const bold = index % 2 === 1;
        const last = index === strings.length - 1;
        this.doc.font(bold ? "ArialMTBold" : "ArialMT");
        this.doc.text(string, { continued: !last, baseline: bold ? "hanging" : "top" });
      });
      this.doc.moveDown(1 + (options?.spacingAfter ?? 0));
    });
  }

  private setupAccessibleDocument(): void {
    const doc = new PDFDocument({
      pdfVersion: "1.7ext3",
      size: "A4",
      tagged: true,
      info: { Title: this.title },
      lang: "fi",
      displayTitle: true,
      bufferPages: true,
      margins: { bottom: 120, left: 72, right: 72, top: 72 },
    });
    this.doc = doc;

    const SRGB_IEC61966_ICC_PROFILE_B64 =
      "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";

    // noinspection HttpUrlsUsage
    const xmp = `
    <?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>
    <x:xmpmeta xmlns:x="adobe:ns:meta/">
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
            <rdf:Description xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/" rdf:about="">
                <pdfaid:part>3</pdfaid:part>
                <pdfaid:conformance>B</pdfaid:conformance>
            </rdf:Description>
        </rdf:RDF>
    </x:xmpmeta>
    <?xpacket end="w"?>
  `;

    // PDF/A standard requires embedded color profile.
    const colorProfile = Buffer.from(SRGB_IEC61966_ICC_PROFILE_B64, "base64");
    const refColorProfile = doc.ref({
      Length: colorProfile.length,
      N: 3,
    });
    refColorProfile.write(colorProfile);
    refColorProfile.end(undefined);

    // noinspection JSPrimitiveTypeWrapperUsage
    const refOutputIntent = doc.ref({
      Type: "OutputIntent",
      S: "GTS_PDFA1",
      // tslint:disable-next-line:no-construct
      Info: new String("sRGB IEC61966-2.1"), // NOSONAR
      // tslint:disable-next-line:no-construct
      OutputConditionIdentifier: new String("sRGB IEC61966-2.1"), // NOSONAR
      DestOutputProfile: refColorProfile,
    });
    refOutputIntent.end(undefined);

    // Metadata defines document type.
    const metadata = xmp.trim();
    const refMetadata = doc.ref({
      Length: metadata.length,
      Type: "Metadata",
      Subtype: "XML",
    });
    refMetadata.compress = false;
    refMetadata.write(Buffer.from(metadata, "utf-8"));
    refMetadata.end(undefined);

    // Add manually created objects to catalog. Data structure is internal to PDFKit, so it needs some hacking.
    type Catalog = { OutputIntents: PDFKitReference[]; Metadata: PDFKitReference };
    type InternalDoc = typeof PDFDocument & { _root: { data: Catalog } };

    const internalDoc: InternalDoc = doc as InternalDoc;
    const data = internalDoc._root.data;
    data.OutputIntents = [refOutputIntent];
    data.Metadata = refMetadata;

    // PDF/A standard requires fonts to be embedded.
    const arialFontFile = __dirname + "/files/arialmt.ttf";
    doc.registerFont("ArialMT", arialFontFile);
    doc.registerFont("ArialMTBold", __dirname + "/files/ARIALBOLDMT.OTF");

    doc.on("pageAdded", () => {
      // add room for header to be insterted afterwards
      this.doc.moveDown(3);
    });

    // Capture inserted text for testing purposes
    const originalTextFunc = doc.text;
    doc.text = (...args) => {
      this.textContent = this.textContent + args[0];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (args.length > 1 && args?.[1]?.continued !== undefined && args[1]?.continued === false) {
        this.textContent = this.textContent + "\n";
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return originalTextFunc.apply(doc, args);
    };
    const originalMoveDownFunc = doc.moveDown;
    doc.moveDown = (...args) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.textContent = this.textContent + "\n".repeat(args[0] | 1);
      return originalMoveDownFunc.apply(doc, args);
    };
  }

  // etusivua lukuunottamatta ylatunniste lisataan jalkikateen, ettei se sotke normaalin sisallon muotoilua
  private appendExtraHeaders() {
    const pageRange = this.doc.bufferedPageRange();
    for (let page = pageRange.start + 1; page < pageRange.start + pageRange.count; page++) {
      this.doc.switchToPage(page);
      this.appendHeader();
    }
  }

  iPostLogo(): string {
    const isVaylaTilaaja = this.isVaylaTilaaja();
    const isElyTilaaja = this.isElyTilaaja();
    if (isVaylaTilaaja) {
      return this.fileBasePath + "/files/vaylaipost.png";
    } else if (isElyTilaaja) {
      return this.fileBasePath + "/files/elyipost.png";
    } else {
      return this.fileBasePath + "/files/evk.png";
    }
  }

  protected appendHeader(asiaTunnusX = 350, logoX = 19) {
    assertIsDefined(this.logo, "PDF:stä puuttuu logo");
    this.doc.image(this.logo, logoX, 32, { height: 75 });
    this.doc.fontSize(12).fillColor("black").text(this.asiatunnus(), asiaTunnusX, 64);
    this.doc.moveDown(3);
  }

  async loadLogo(): Promise<string | Buffer> {
    const isVaylaTilaaja = this.isVaylaTilaaja();
    const isElyTilaaja = this.isElyTilaaja();
    if (isVaylaTilaaja) {
      return this.fileBasePath + "/files/vayla.png";
    } else if (isElyTilaaja) {
      return this.fileBasePath + "/files/ely.png";
    } else {
      return this.fileBasePath + "/files/evk.png";
    }
  }

  async loadSuunnitteluSopimus(): Promise<string | Buffer | undefined> {
    if (this.sopimus?.logo) {
      const tiedosto = this.sopimus.logo?.[this.kieli];
      assertIsDefined(tiedosto, "suunnittelusopimuksessa tulee aina olla kunnan logo");
      return await fileService.getProjektiFile(this.oid, tiedosto);
    }
  }

  async loadOsapuoltenLogot(): Promise<(string | Buffer)[]> {
    const logot: (string | Buffer)[] = [];
    if (this.sopimus?.osapuolet && this.sopimus.osapuolet.length > 0) {
      for (const osapuoli of this.sopimus.osapuolet) {
        const osapuolenLogo = osapuoli.osapuolenLogo?.[this.kieli];
        if (osapuolenLogo) {
          const logoData = await fileService.getProjektiFile(this.oid, osapuolenLogo);
          if (logoData) logot.push(logoData);
        }
      }
    }
    return logot;
  }

  protected sopimusLogoElement(): PDFKit.PDFStructureElement {
    return this.doc.struct("DIV", {}, () => {
      const currentY = this.doc.y;
      const bottomMargin = 100;
      const maxLogoHeight = 50;

      if (this.osapuoltenLogot && this.osapuoltenLogot.length > 0) {
        const baseY = this.doc.page.height - bottomMargin;
        const logoCount = Math.min(this.osapuoltenLogot.length, 3);
        const logot = this.osapuoltenLogot.slice(0, logoCount);

        const maxLogoAreaWidth = this.doc.page.width / 3;
        const logoMargin = 20;
        const logoAreaWidth = maxLogoAreaWidth - logoMargin;
        const totalAreaWidth = logoCount * maxLogoAreaWidth;
        let xPosition = this.doc.page.width / 2 - totalAreaWidth / 2;

        for (const logo of logot) {
          const logoAreaCenterX = xPosition + logoAreaWidth / 2;

          const center = "center" as const;
          const logoOptions = {
            fit: [logoAreaWidth, maxLogoHeight] as [number, number],
            align: center,
            valign: center,
          };

          this.doc.image(logo, logoAreaCenterX - logoAreaWidth / 2, baseY - maxLogoHeight, logoOptions);

          xPosition += maxLogoAreaWidth;
        }
      } else if (this.sopimusLogo) {
        const baseY = this.doc.page.height - bottomMargin;
        const x = this.doc.page.width / 2 - maxLogoHeight;
        this.doc.image(this.sopimusLogo, x, baseY - maxLogoHeight, {
          fit: [maxLogoHeight * 2, maxLogoHeight],
          align: "center",
          valign: "center",
        });
      }

      this.doc.y = currentY;
    });
  }

  protected addContent(): void {
    throw new Error("Method 'addContent()' must be implemented.");
  }

  protected getIndention() {
    return INDENTATION_BODY;
  }

  public async pdf(luonnos: boolean): Promise<EnhancedPDF> {
    this.logo = await this.loadLogo();
    this.sopimusLogo = await this.loadSuunnitteluSopimus();
    this.osapuoltenLogot = await this.loadOsapuoltenLogot();

    this.doc.addStructure(
      this.doc.struct("Document", {}, () => {
        this.appendHeader();
        this.doc.text("", this.getIndention());
      })
    );

    this.addContent();
    this.appendExtraHeaders();
    if (luonnos) {
      this.addDraftWatermark();
    }
    return this.finishPdfDocument();
  }

  private addDraftWatermark() {
    this.doc.save();
    const pageRange = this.doc.bufferedPageRange();
    for (let page = pageRange.start; page < pageRange.start + pageRange.count; page++) {
      this.doc.switchToPage(page);
      const x = 100;
      const y = 570;
      this.doc
        .rotate(-50, { origin: [x, y] })
        .fontSize(120)
        .opacity(0.1)
        .fillColor("black")
        .text("LUONNOS", x, y, { width: 1000 });
      this.doc.restore();
    }
  }

  private finishPdfDocument() {
    return new Promise<EnhancedPDF>((resolve) => {
      const buffers = Array<Uint8Array>();
      this.doc.on("data", buffers.push.bind(buffers));
      this.doc.on("end", () => {
        const all = Buffer.concat(buffers);
        const sisalto = all.toString("base64");
        resolve({ __typename: "PDF", nimi: this.fileName, sisalto, textContent: this.textContent });
      });
      this.doc.end();
    });
  }

  abstract isVaylaTilaaja(): boolean;

  abstract isElyTilaaja(): boolean;

  abstract asiatunnus(): string;
}
