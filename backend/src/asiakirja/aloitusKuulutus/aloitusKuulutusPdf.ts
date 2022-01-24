import { ProjektiTyyppi, Yhteystieto } from "../../../../common/graphql/apiModel";
import { DBProjekti } from "../../database/model/projekti";
import { AbstractPdf } from "../abstractPdf";

export abstract class AloitusKuulutusPdf extends AbstractPdf {
  constructor(projekti: DBProjekti) {
    super(projekti, "KUULUTUS SUUNNITTELUN ALOITTAMISESTA", "aloituskuulutus.pdf");
  }

  protected addContent() {
    const kuulutus = this.projekti.aloitusKuulutus;
    if (!kuulutus) {
      throw new Error("Projektilla ei ole kuulutusta");
    }
  }

  protected get projektiTyyppi() {
    let tyyppi = "";
    switch (this.projekti.tyyppi) {
      case ProjektiTyyppi.TIE:
        tyyppi = "tiesuunnitelma";
        break;
      case ProjektiTyyppi.YLEINEN:
        tyyppi = "yleissuunnitelma";
        break;
      case ProjektiTyyppi.RATA:
        tyyppi = "ratasuunnitelma";
        break;
    }
    return tyyppi;
  }

  protected get yhteystiedot() {
    const yt: Yhteystieto[] = [];
    const suunnitteluSopimus = this.projekti.suunnitteluSopimus;
    if (suunnitteluSopimus) {
      const { email, puhelinnumero, sukunimi, etunimi, kunta } = suunnitteluSopimus;
      yt.push({
        etunimi,
        sukunimi,
        puhelinnumero,
        sahkoposti: email,
        organisaatio: this.capitalize(kunta),
        __typename: "Yhteystieto",
      });
    }
    this.projekti.kayttoOikeudet
      .filter(({ esitetaanKuulutuksessa }) => !!esitetaanKuulutuksessa)
      .forEach((oikeus) => {
        yt.push({
          etunimi: oikeus.nimi.replace(/,/g, ""),
          sukunimi: "",
          puhelinnumero: oikeus.puhelinnumero,
          sahkoposti: oikeus.email,
          organisaatio: oikeus.organisaatio,
          __typename: "Yhteystieto",
        });
      });
    if (this.projekti.aloitusKuulutus?.esitettavatYhteystiedot) {
      this.projekti.aloitusKuulutus?.esitettavatYhteystiedot.forEach((yhteystieto) => {
        yt.push(yhteystieto);
      });
    }
    return yt;
  }

  protected get moreInfoElements(): PDFKit.PDFStructureElementChild[] {
    const structureElements = this.yhteystiedot.map(
      ({ organisaatio, etunimi, sukunimi, puhelinnumero, sahkoposti }) => {
        const element: PDFKit.PDFStructureElementChild = () => {
          const nimi = etunimi + (!!sukunimi ? " " + sukunimi : "");
          const noSpamSahkoposti = sahkoposti.replace(/@/g, "(at)");
          this.doc.text(`${organisaatio}, ${nimi}, puh. ${puhelinnumero}, ${noSpamSahkoposti} `).moveDown();
        };
        return element;
      }
    );
    return structureElements;
  }
}
