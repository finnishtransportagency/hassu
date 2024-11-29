import { SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { AsiakirjaTyyppi } from "hassu-common/graphql/apiModel";
import { AloituskuulutusKutsuAdapterProps } from "../adapter/aloituskuulutusKutsuAdapter";

export class AloitusKuulutus10TR extends SuunnittelunAloitusPdf {
  constructor(params: AloituskuulutusKutsuAdapterProps) {
    super(params, "asiakirja.aloituskuulutus.otsikko_kuulutus_suunnittelun_aloittamisesta", AsiakirjaTyyppi.ALOITUSKUULUTUS);
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    const paragraphs = [];
    if (this.params.vahainenMenettely) {
      paragraphs.push(this.paragraphFromKey("asiakirja.aloituskuulutus.kappale1_vahainen_menettely"));
    } else if (this.params.suunnitteluSopimus) {
      paragraphs.push(this.paragraphFromKey("asiakirja.aloituskuulutus.kappale1_suunnittelusopimus"));
    } else {
      paragraphs.push(this.paragraphFromKey("asiakirja.aloituskuulutus.kappale1"));
    }

    return [
      ...paragraphs,
      this.hankkeenKuvausParagraph(),
      this.paragraphFromKey("asiakirja.aloituskuulutus.kappale2"),
      this.paragraphFromKey("asiakirja.aloituskuulutus.kappale3"),
      this.params.vahainenMenettely
        ? this.paragraphFromKey("asiakirja.aloituskuulutus.kappale4_vahainen_menettely")
        : this.paragraphFromKey("asiakirja.aloituskuulutus.kappale4"),
      this.tietosuojaParagraph(),

      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.params.yhteystiedot, undefined, true)),
    ];
  }
}
