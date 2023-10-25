import { KuulutusJulkaisuTila, Status, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { AineistoPathsPair, S3Paths, VaiheAineisto, getKuulutusSaamePDFt } from ".";
import { DBProjekti, LadattuTiedosto, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../../database/model";
import { findJulkaisuWithAsianhallintaEventId, findJulkaisuWithTila, getAsiatunnus } from "../../projekti/projektiUtil";
import { synchronizeFilesToPublic } from "../synchronizeFilesToPublic";
import { parseOptionalDate } from "../../util/dateUtil";
import { Dayjs } from "dayjs";
import { isProjektiStatusGreaterOrEqualTo } from "hassu-common/statusOrder";
import { forEverySaameDo, forSuomiRuotsiDo, forSuomiRuotsiDoAsync } from "../../projekti/adapter/common";
import { AsianhallintaSynkronointi } from "@hassu/asianhallinta";
import { assertIsDefined } from "../../util/assertions";
import { ProjektiPaths } from "../../files/ProjektiPath";

export class NahtavillaoloVaiheAineisto extends VaiheAineisto<NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu> {
  getAineistot(vaihe: NahtavillaoloVaihe): AineistoPathsPair[] {
    const paths = this.projektiPaths.nahtavillaoloVaihe(this.vaihe);
    return [
      { aineisto: vaihe.aineistoNahtavilla, paths },
      { aineisto: vaihe.lisaAineisto, paths },
    ];
  }

  getLadatutTiedostot(vaihe: NahtavillaoloVaihe): LadattuTiedosto[] {
    return getKuulutusSaamePDFt(vaihe.nahtavillaoloSaamePDFt);
  }

  async synchronize(): Promise<boolean> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      return synchronizeFilesToPublic(
        this.oid,
        this.projektiPaths.nahtavillaoloVaihe(julkaisu),
        parseOptionalDate(julkaisu.kuulutusPaiva),
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
    if (!(isProjektiStatusGreaterOrEqualTo({ status: projektiStatus }, Status.EPAAKTIIVINEN_1) && this.julkaisut)) {
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

        if (await this.deleteAineistot(julkaisu.aineistoNahtavilla, julkaisu.lisaAineisto)) {
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
    const paths = new ProjektiPaths(projekti.oid).nahtavillaoloVaihe(julkaisu);
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
      s3Paths.pushYllapitoFilesIfDefined(pdf?.kuulutusPDF?.tiedosto, pdf?.kuulutusIlmoitusPDF?.tiedosto);
    });

    s3Paths.pushYllapitoFilesIfDefined(julkaisu.lahetekirje?.tiedosto);

    assertIsDefined(projekti.velho?.suunnittelustaVastaavaViranomainen);
    return {
      toimenpideTyyppi: julkaisu.uudelleenKuulutus ? "UUDELLEENKUULUTUS" : "ENSIMMAINEN_VERSIO",
      asianhallintaEventId: julkaisu.asianhallintaEventId,
      asiatunnus,
      dokumentit: s3Paths.getDokumentit(),
      vaylaAsianhallinta: projekti.velho.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
    };
  }
}
