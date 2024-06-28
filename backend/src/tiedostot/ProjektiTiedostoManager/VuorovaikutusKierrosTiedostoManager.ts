import { isStatusGreaterOrEqualTo } from "hassu-common/statusOrder";
import { AineistoPathsPair, NahtavillaoloVaiheTiedostoManager, S3Paths, VaiheTiedostoManager } from ".";
import { Aineisto, DBProjekti, LadattuTiedosto, VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu } from "../../database/model";
import { forEverySaameDo, forSuomiRuotsiDo, forSuomiRuotsiDoAsync } from "../../projekti/adapter/common";
import { nyt, parseOptionalDate } from "../../util/dateUtil";
import { synchronizeFilesToPublic } from "../synchronizeFilesToPublic";
import { Status, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { forEverySaameDoAsync } from "../../projekti/adapter/adaptToDB";
import { AsianhallintaSynkronointi } from "@hassu/asianhallinta";
import { findJulkaisuWithAsianhallintaEventId, getAsiatunnus } from "../../projekti/projektiUtil";
import { assertIsDefined } from "../../util/assertions";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";

export class VuorovaikutusKierrosTiedostoManager extends VaiheTiedostoManager<VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu> {
  private nahtavillaoloVaiheTiedostoManager: NahtavillaoloVaiheTiedostoManager;

  constructor(
    oid: string,
    vaihe: VuorovaikutusKierros | undefined | null,
    julkaisut: VuorovaikutusKierrosJulkaisu[] | undefined | null,
    nahtavillaoloVaiheTiedostoManager: NahtavillaoloVaiheTiedostoManager
  ) {
    super(oid, vaihe, julkaisut);
    this.nahtavillaoloVaiheTiedostoManager = nahtavillaoloVaiheTiedostoManager;
  }

  getAineistot(vaihe: VuorovaikutusKierros): AineistoPathsPair[] {
    const filePathInProjekti = this.projektiPaths.vuorovaikutus(vaihe).aineisto;
    return [{ aineisto: vaihe.aineistot, paths: filePathInProjekti }];
  }

  getLadatutTiedostot(vaihe: VuorovaikutusKierros): LadattuTiedostoPathsPair[] {
    const tiedostot: LadattuTiedosto[] = [];
    const saamePDFt = vaihe.vuorovaikutusSaamePDFt;
    if (saamePDFt) {
      forEverySaameDo((kieli) => {
        const pdft = saamePDFt[kieli];
        if (pdft) {
          tiedostot.push(pdft);
        }
      });
    }
    const paths = this.projektiPaths.vuorovaikutus(vaihe);
    return [{ tiedostot, paths }];
  }

  async synchronize(): Promise<boolean> {
    return (
      (await this.julkaisut?.reduce(async (promiseResult, julkaisu) => {
        const result = await promiseResult;
        const kuulutusPaiva = parseOptionalDate(julkaisu?.vuorovaikutusJulkaisuPaiva);
        // suunnitteluvaiheen aineistot poistuvat kansalaispuolelta, kun nähtävilläolokuulutus julkaistaan
        const kuulutusPaattyyPaiva = this.nahtavillaoloVaiheTiedostoManager.getKuulutusPaiva();
        if (kuulutusPaiva?.isBefore(nyt())) {
          return (
            result &&
            synchronizeFilesToPublic(
              this.oid,
              this.projektiPaths.vuorovaikutus(julkaisu),
              kuulutusPaiva,
              kuulutusPaattyyPaiva?.startOf("day")
            )
          );
        } else {
          return Promise.resolve(true);
        }
      }, Promise.resolve(true))) ?? true
    );
  }

  async deleteAineistotIfEpaaktiivinen(projektiStatus: Status): Promise<VuorovaikutusKierrosJulkaisu[]> {
    if (!(isStatusGreaterOrEqualTo(projektiStatus, Status.EPAAKTIIVINEN_1) && this.julkaisut)) {
      return [];
    }
    const julkaisutSet = await this.julkaisut.reduce(
      async (modifiedJulkaisutPromise: Promise<Set<VuorovaikutusKierrosJulkaisu>>, julkaisu: VuorovaikutusKierrosJulkaisu) => {
        const modifiedJulkaisut = await modifiedJulkaisutPromise;
        await forSuomiRuotsiDoAsync(async (kieli) => {
          const modified = await this.deleteFilesWhenEpaaktiivinen(julkaisu.vuorovaikutusPDFt?.[kieli], "kutsuPDFPath");
          if (modified) {
            modifiedJulkaisut.add(julkaisu);
          }
        });

        if (await this.deleteLadattuTiedostoWhenEpaaktiivinen(julkaisu.lahetekirje)) {
          modifiedJulkaisut.add(julkaisu);
        }

        await forEverySaameDoAsync(async (kieli) => {
          const aloituskuulutusPDF = julkaisu.vuorovaikutusSaamePDFt?.[kieli];
          if (aloituskuulutusPDF && (await this.deleteLadattuTiedostoWhenEpaaktiivinen(aloituskuulutusPDF))) {
            modifiedJulkaisut.add(julkaisu);
          }
        });

        const aineistot: Aineisto[] = julkaisu.aineistot ?? [];
        if (aineistot && (await this.deleteAineistot(aineistot))) {
          modifiedJulkaisut.add(julkaisu);
        }

        return modifiedJulkaisut;
      },
      Promise.resolve(new Set<VuorovaikutusKierrosJulkaisu>())
    );
    return Array.from(julkaisutSet.values());
  }

  getAsianhallintaSynkronointi(
    projekti: DBProjekti,
    asianhallintaEventId: string | null | undefined
  ): AsianhallintaSynkronointi | undefined {
    const julkaisu = findJulkaisuWithAsianhallintaEventId(this.julkaisut, asianhallintaEventId);
    if (!julkaisu?.asianhallintaEventId) {
      // Yhteensopiva vanhan datan kanssa, josta asianhallintaEventId voi puuttua
      return;
    }
    const asiatunnus = getAsiatunnus(projekti.velho);
    assertIsDefined(asiatunnus);
    const vuorovaikutusPaths = this.projektiPaths.vuorovaikutus(julkaisu);
    const s3Paths = new S3Paths(vuorovaikutusPaths);
    forSuomiRuotsiDo((kieli) => s3Paths.pushYllapitoFilesIfDefined(julkaisu.vuorovaikutusPDFt?.[kieli]?.kutsuPDFPath));
    forEverySaameDo((kieli) => s3Paths.pushYllapitoFilesIfDefined(julkaisu.vuorovaikutusSaamePDFt?.[kieli]?.tiedosto));

    s3Paths.pushYllapitoFilesIfDefined(julkaisu.lahetekirje?.tiedosto);

    assertIsDefined(projekti.velho?.suunnittelustaVastaavaViranomainen);
    return {
      toimenpideTyyppi: projekti.vuorovaikutusKierros?.palattuNahtavillaolosta ? "PALATTU" : "ENSIMMAINEN_VERSIO",
      asianhallintaEventId: julkaisu.asianhallintaEventId,
      asiatunnus,
      dokumentit: s3Paths.getDokumentit(),
      vaylaAsianhallinta: projekti.velho.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      ilmoituksenVastaanottajat: this.getIlmoituksenVastaanottajat(julkaisu.ilmoituksenVastaanottajat),
    };
  }
}
