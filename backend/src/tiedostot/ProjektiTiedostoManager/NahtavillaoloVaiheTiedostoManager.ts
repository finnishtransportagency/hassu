import { KuulutusJulkaisuTila, Status, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { AineistoPathsPair, S3Paths, VaiheTiedostoManager, getKuulutusSaamePDFt } from ".";
import { DBProjekti, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../../database/model";
import { findJulkaisuWithAsianhallintaEventId, findJulkaisuWithTila, getAsiatunnus } from "../../projekti/projektiUtil";
import { synchronizeFilesToPublic } from "../synchronizeFilesToPublic";
import { nyt, parseOptionalDate } from "../../util/dateUtil";
import { Dayjs } from "dayjs";
import { isStatusGreaterOrEqualTo } from "hassu-common/statusOrder";
import { forEverySaameDo, forSuomiRuotsiDo, forSuomiRuotsiDoAsync } from "../../projekti/adapter/common";
import { AsianhallintaSynkronointi } from "@hassu/asianhallinta";
import { assertIsDefined } from "../../util/assertions";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";
import { SisainenProjektiPaths } from "../../files/ProjektiPath";

export class NahtavillaoloVaiheTiedostoManager extends VaiheTiedostoManager<NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu> {
  getAineistot(vaihe: NahtavillaoloVaihe | NahtavillaoloVaiheJulkaisu): AineistoPathsPair[] {
    const paths = this.projektiPaths.nahtavillaoloVaihe(vaihe);
    return [{ aineisto: vaihe.aineistoNahtavilla, paths }];
  }

  getLadatutTiedostot(vaihe: NahtavillaoloVaihe): LadattuTiedostoPathsPair[] {
    const paths = this.projektiPaths.nahtavillaoloVaihe(vaihe);
    return [{ tiedostot: getKuulutusSaamePDFt(vaihe.nahtavillaoloSaamePDFt), paths }];
  }

  async synchronize(): Promise<boolean> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    const kuulutusPaiva: Dayjs | undefined = parseOptionalDate(julkaisu?.kuulutusPaiva);
    if (julkaisu && kuulutusPaiva?.isBefore(nyt())) {
      return synchronizeFilesToPublic(
        this.oid,
        this.projektiPaths.nahtavillaoloVaihe(julkaisu),
        kuulutusPaiva,
        parseOptionalDate(julkaisu.kuulutusVaihePaattyyPaiva)?.endOf("day")
      );
    }
    return true;
  }

  getKuulutusPaiva(): Dayjs | undefined {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      return parseOptionalDate(julkaisu.kuulutusPaiva);
    }
  }

  async deleteAineistotIfEpaaktiivinen(projektiStatus: Status): Promise<NahtavillaoloVaiheJulkaisu[]> {
    if (!(isStatusGreaterOrEqualTo(projektiStatus, Status.EPAAKTIIVINEN_1) && this.julkaisut)) {
      return [];
    }
    const julkaisutSet = await this.julkaisut.reduce(
      async (modifiedJulkaisutPromise: Promise<Set<NahtavillaoloVaiheJulkaisu>>, julkaisu: NahtavillaoloVaiheJulkaisu) => {
        const modifiedJulkaisut = await modifiedJulkaisutPromise;
        await forSuomiRuotsiDoAsync(async (kieli) => {
          const modified = await this.deleteFilesWhenEpaaktiivinen(
            julkaisu.nahtavillaoloPDFt?.[kieli],
            "nahtavillaoloPDFPath",
            "nahtavillaoloIlmoitusPDFPath",
            "nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath"
          );
          if (modified) {
            modifiedJulkaisut.add(julkaisu);
          }
        });

        if (await this.deleteLadattuTiedostoWhenEpaaktiivinen(julkaisu.lahetekirje)) {
          modifiedJulkaisut.add(julkaisu);
        }

        if (await this.deleteKuulutusSaamePDFtWhenEpaaktiivinen(julkaisu.nahtavillaoloSaamePDFt)) {
          modifiedJulkaisut.add(julkaisu);
        }

        if (await this.deleteAineistot(julkaisu.aineistoNahtavilla)) {
          modifiedJulkaisut.add(julkaisu);
        }
        if (julkaisu.aineistopaketti) {
          this.deleteAineistoZip(julkaisu.aineistopaketti);
        }
        if (julkaisu.maanomistajaluettelo) {
          await this.deleteSisainenTiedosto(julkaisu.maanomistajaluettelo);
          modifiedJulkaisut.add(julkaisu);
        }

        return modifiedJulkaisut;
      },
      Promise.resolve(new Set<NahtavillaoloVaiheJulkaisu>())
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
    const paths = this.projektiPaths.nahtavillaoloVaihe(julkaisu);
    const s3Paths = new S3Paths(paths);
    forSuomiRuotsiDo((kieli) => {
      const pdf = julkaisu.nahtavillaoloPDFt?.[kieli];
      s3Paths.pushYllapitoFilesIfDefined(
        pdf?.nahtavillaoloPDFPath,
        pdf?.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath,
        pdf?.nahtavillaoloIlmoitusPDFPath
      );
    });

    forEverySaameDo((kieli) => {
      const pdf = julkaisu.nahtavillaoloSaamePDFt?.[kieli];
      s3Paths.pushYllapitoFilesIfDefined(
        pdf?.kuulutusPDF?.tiedosto,
        pdf?.kuulutusIlmoitusPDF?.tiedosto,
        pdf?.kirjeTiedotettavillePDF?.tiedosto
      );
    });

    s3Paths.pushYllapitoFilesIfDefined(julkaisu.lahetekirje?.tiedosto);

    const s3SisainenPaths = new S3Paths(new SisainenProjektiPaths(projekti.oid).nahtavillaoloVaihe(julkaisu));
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
