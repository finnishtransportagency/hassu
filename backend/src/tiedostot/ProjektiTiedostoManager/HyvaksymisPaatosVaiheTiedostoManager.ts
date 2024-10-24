import { KuulutusJulkaisuTila, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { AbstractHyvaksymisPaatosVaiheTiedostoManager, AineistoPathsPair, S3Paths, getKuulutusSaamePDFt } from ".";
import { DBProjekti, HyvaksymisPaatosVaihe } from "../../database/model";
import { findJulkaisuWithAsianhallintaEventId, findJulkaisuWithTila, getAsiatunnus } from "../../projekti/projektiUtil";
import { synchronizeFilesToPublic } from "../synchronizeFilesToPublic";
import { nyt, parseOptionalDate } from "../../util/dateUtil";
import { forEverySaameDo, forSuomiRuotsiDo } from "../../projekti/adapter/common";
import { AsianhallintaSynkronointi } from "@hassu/asianhallinta";
import { assertIsDefined } from "../../util/assertions";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";
import { Dayjs } from "dayjs";
import { SisainenProjektiPaths } from "../../files/ProjektiPath";

export class HyvaksymisPaatosVaiheTiedostoManager extends AbstractHyvaksymisPaatosVaiheTiedostoManager {
  getAineistot(vaihe: HyvaksymisPaatosVaihe): AineistoPathsPair[] {
    const paths = this.projektiPaths.hyvaksymisPaatosVaihe(this.vaihe);
    return [
      { aineisto: vaihe.aineistoNahtavilla, paths },
      { aineisto: vaihe.hyvaksymisPaatos, paths: paths.paatos },
    ];
  }

  getLadatutTiedostot(vaihe: HyvaksymisPaatosVaihe): LadattuTiedostoPathsPair[] {
    const paths = this.projektiPaths.hyvaksymisPaatosVaihe(vaihe);
    return [{ tiedostot: getKuulutusSaamePDFt(vaihe.hyvaksymisPaatosVaiheSaamePDFt), paths }];
  }

  async synchronize(): Promise<boolean> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    const kuulutusPaiva: Dayjs | undefined = parseOptionalDate(julkaisu?.kuulutusPaiva);
    if (julkaisu && kuulutusPaiva?.isBefore(nyt())) {
      return synchronizeFilesToPublic(
        this.oid,
        this.projektiPaths.hyvaksymisPaatosVaihe(julkaisu),
        kuulutusPaiva,
        parseOptionalDate(julkaisu.kuulutusVaihePaattyyPaiva)?.endOf("day")
      );
    }
    return true;
  }

  getAsianhallintaSynkronointi(
    projekti: DBProjekti,
    asianhallintaEventId: string | null | undefined
  ): AsianhallintaSynkronointi | undefined {
    const julkaisu = findJulkaisuWithAsianhallintaEventId(this.julkaisut, asianhallintaEventId);
    if (!julkaisu || !julkaisu.asianhallintaEventId) {
      // Yhteensopiva vanhan datan kanssa, josta asianhallintaEventId voi puuttua
      return;
    }
    const asiatunnus = getAsiatunnus(projekti.velho);
    assertIsDefined(asiatunnus);
    const paths = this.projektiPaths.hyvaksymisPaatosVaihe(julkaisu);
    const s3Paths = new S3Paths(paths);
    forSuomiRuotsiDo((kieli) => {
      const pdf = julkaisu.hyvaksymisPaatosVaihePDFt?.[kieli];
      s3Paths.pushYllapitoFilesIfDefined(
        pdf?.hyvaksymisKuulutusPDFPath,
        pdf?.hyvaksymisIlmoitusLausunnonantajillePDFPath,
        pdf?.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath,
        pdf?.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath,
        pdf?.hyvaksymisIlmoitusMuistuttajillePDFPath
      );
    });

    forEverySaameDo((kieli) => {
      const pdf = julkaisu.hyvaksymisPaatosVaiheSaamePDFt?.[kieli];
      s3Paths.pushYllapitoFilesIfDefined(
        pdf?.kuulutusPDF?.tiedosto,
        pdf?.kuulutusIlmoitusPDF?.tiedosto,
        pdf?.kirjeTiedotettavillePDF?.tiedosto
      );
    });

    s3Paths.pushYllapitoFilesIfDefined(julkaisu.lahetekirje?.tiedosto);

    const s3SisainenPaths = new S3Paths(new SisainenProjektiPaths(projekti.oid).hyvaksymisPaatosVaihe(julkaisu));
    s3SisainenPaths.pushYllapitoFilesIfDefined(julkaisu.maanomistajaluettelo);

    assertIsDefined(projekti.velho?.suunnittelustaVastaavaViranomainen);
    return {
      toimenpideTyyppi: julkaisu.uudelleenKuulutus ? "UUDELLEENKUULUTUS" : "ENSIMMAINEN_VERSIO",
      asianhallintaEventId: julkaisu.asianhallintaEventId,
      asiatunnus,
      dokumentit: [...s3Paths.getDokumentit(), ...s3SisainenPaths.getDokumentit()],
      vaylaAsianhallinta: projekti.velho.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      ilmoituksenVastaanottajat: this.getIlmoituksenVastaanottajat(julkaisu.ilmoituksenVastaanottajat),
      tiedotaAsianosaisia: julkaisu.uudelleenKuulutus?.tiedotaKiinteistonomistajia,
    };
  }
}
