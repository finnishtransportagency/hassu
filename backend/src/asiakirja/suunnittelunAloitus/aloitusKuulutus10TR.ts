import { SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { AsiakirjaTyyppi } from "../../../../common/graphql/apiModel";
import { AloituskuulutusKutsuAdapterProps } from "../adapter/aloituskuulutusKutsuAdapter";
import { assertIsDefined } from "../../util/assertions";
import { fileService } from "../../files/fileService";

export class AloitusKuulutus10TR extends SuunnittelunAloitusPdf {
  constructor(params: AloituskuulutusKutsuAdapterProps) {
    super(params, "asiakirja.aloituskuulutus.otsikko_kuulutus_suunnittelun_aloittamisesta", AsiakirjaTyyppi.ALOITUSKUULUTUS);
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    const paragraphs = [];
    if (this.params.suunnitteluSopimus) {
      paragraphs.push(this.paragraphFromKey("asiakirja.aloituskuulutus.kappale1_suunnittelusopimus"));
    } else {
      paragraphs.push(this.paragraphFromKey("asiakirja.aloituskuulutus.kappale1"));
    }

    return [
      ...paragraphs,
      this.hankkeenKuvausParagraph(),
      this.paragraphFromKey("asiakirja.aloituskuulutus.kappale2"),
      this.paragraphFromKey("asiakirja.aloituskuulutus.kappale3"),
      this.paragraphFromKey("asiakirja.aloituskuulutus.kappale4"),
      this.tietosuojaParagraph(),

      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.params.yhteystiedot, undefined, true)),
    ];
  }

  async loadLogo(): Promise<string | Buffer> {
    if (this.params.euRahoitusLogot) {
      assertIsDefined(this.params.euRahoitusLogot.logoFI, "suunnittelusopimuksessa tulee aina olla kunnan logo");
      return await fileService.getProjektiFile(this.params.oid, this.params.euRahoitusLogot.logoFI);
    }
    return super.loadLogo();
  }
}
