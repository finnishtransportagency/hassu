import { KuulutusJulkaisuTila, Status, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { AbstractHyvaksymisPaatosVaiheTiedostoManager, AineistoPathsPair, S3Paths, getKuulutusSaamePDFt } from ".";
import { DBProjekti, HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu } from "../../database/model";
import { findJulkaisuWithAsianhallintaEventId, findJulkaisuWithTila, getAsiatunnus } from "../../projekti/projektiUtil";
import { synchronizeFilesToPublic } from "../synchronizeFilesToPublic";
import { nyt, parseOptionalDate } from "../../util/dateUtil";
import { isStatusGreaterOrEqualTo } from "hassu-common/statusOrder";
import { forEverySaameDo, forSuomiRuotsiDo, forSuomiRuotsiDoAsync } from "../../projekti/adapter/common";
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

  async deleteAineistotIfEpaaktiivinen(projektiStatus: Status): Promise<HyvaksymisPaatosVaiheJulkaisu[]> {
    if (!(isStatusGreaterOrEqualTo(projektiStatus, Status.EPAAKTIIVINEN_1) && this.julkaisut)) {
      return [];
    }
    const julkaisutSet = await this.julkaisut.reduce(
      async (modifiedJulkaisutPromise: Promise<Set<HyvaksymisPaatosVaiheJulkaisu>>, julkaisu) => {
        const modifiedJulkaisut = await modifiedJulkaisutPromise;
        await forSuomiRuotsiDoAsync(async (kieli) => {
          if (
            await this.deleteFilesWhenEpaaktiivinen(
              julkaisu.hyvaksymisPaatosVaihePDFt?.[kieli],
              "hyvaksymisKuulutusPDFPath",
              "ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath",
              "ilmoitusHyvaksymispaatoskuulutuksestaPDFPath",
              "hyvaksymisIlmoitusLausunnonantajillePDFPath",
              "hyvaksymisIlmoitusMuistuttajillePDFPath"
            )
          ) {
            modifiedJulkaisut.add(julkaisu);
          }
        });

        if (await this.deleteLadattuTiedostoWhenEpaaktiivinen(julkaisu.lahetekirje)) {
          modifiedJulkaisut.add(julkaisu);
        }

        if (await this.deleteKuulutusSaamePDFtWhenEpaaktiivinen(julkaisu.hyvaksymisPaatosVaiheSaamePDFt)) {
          modifiedJulkaisut.add(julkaisu);
        }

        if (await this.deleteAineistot(julkaisu.aineistoNahtavilla, julkaisu.hyvaksymisPaatos)) {
          modifiedJulkaisut.add(julkaisu);
        }
        if (julkaisu.maanomistajaluettelo) {
          await this.deleteSisainenTiedosto(julkaisu.maanomistajaluettelo);
          modifiedJulkaisut.add(julkaisu);
        }

        return modifiedJulkaisut;
      },
      Promise.resolve(new Set<HyvaksymisPaatosVaiheJulkaisu>())
    );
    return Array.from(julkaisutSet.values());
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
