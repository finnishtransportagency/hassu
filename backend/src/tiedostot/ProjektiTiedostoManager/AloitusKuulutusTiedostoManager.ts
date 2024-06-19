import { KuulutusJulkaisuTila, Status, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { AineistoPathsPair, S3Paths, VaiheTiedostoManager, getKuulutusSaamePDFt } from ".";
import { AloitusKuulutus, AloitusKuulutusJulkaisu, DBProjekti } from "../../database/model";
import { findJulkaisuWithAsianhallintaEventId, findJulkaisuWithTila, getAsiatunnus } from "../../projekti/projektiUtil";
import { synchronizeFilesToPublic } from "../synchronizeFilesToPublic";
import { nyt, parseOptionalDate } from "../../util/dateUtil";
import { AsianhallintaSynkronointi } from "@hassu/asianhallinta";
import { assertIsDefined } from "../../util/assertions";
import { forEverySaameDo, forSuomiRuotsiDo, forSuomiRuotsiDoAsync } from "../../projekti/adapter/common";
import { isStatusGreaterOrEqualTo } from "hassu-common/statusOrder";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";
import { Dayjs } from "dayjs";

export class AloitusKuulutusTiedostoManager extends VaiheTiedostoManager<AloitusKuulutus, AloitusKuulutusJulkaisu> {
  getAineistot(): AineistoPathsPair[] {
    return [];
  }

  getLadatutTiedostot(vaihe: AloitusKuulutus): LadattuTiedostoPathsPair[] {
    const paths = this.projektiPaths.aloituskuulutus(vaihe);
    return [{ tiedostot: getKuulutusSaamePDFt(vaihe.aloituskuulutusSaamePDFt), paths }];
  }

  async synchronize(): Promise<boolean> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    const kuulutusPaiva: Dayjs | undefined = parseOptionalDate(julkaisu?.kuulutusPaiva);
    if (julkaisu && kuulutusPaiva?.isBefore(nyt())) {
      return synchronizeFilesToPublic(this.oid, this.projektiPaths.aloituskuulutus(julkaisu), kuulutusPaiva);
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
    const asiatunnus = getAsiatunnus(julkaisu.velho);
    assertIsDefined(asiatunnus);
    const aloituskuulutusPaths = this.projektiPaths.aloituskuulutus(julkaisu);
    const s3Paths = new S3Paths(aloituskuulutusPaths);
    forSuomiRuotsiDo((kieli) => {
      const aloituskuulutusPDF = julkaisu.aloituskuulutusPDFt?.[kieli];
      s3Paths.pushYllapitoFilesIfDefined(aloituskuulutusPDF?.aloituskuulutusPDFPath, aloituskuulutusPDF?.aloituskuulutusIlmoitusPDFPath);
    });

    forEverySaameDo((kieli) => {
      const aloituskuulutusPDF = julkaisu.aloituskuulutusSaamePDFt?.[kieli];
      s3Paths.pushYllapitoFilesIfDefined(aloituskuulutusPDF?.kuulutusPDF?.tiedosto, aloituskuulutusPDF?.kuulutusIlmoitusPDF?.tiedosto);
    });

    s3Paths.pushYllapitoFilesIfDefined(julkaisu.lahetekirje?.tiedosto);

    return {
      asianhallintaEventId: julkaisu.asianhallintaEventId,
      asiatunnus,
      toimenpideTyyppi: julkaisu.uudelleenKuulutus ? "UUDELLEENKUULUTUS" : "ENSIMMAINEN_VERSIO",
      dokumentit: s3Paths.getDokumentit(),
      vaylaAsianhallinta: julkaisu.velho.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      ilmoituksenVastaanottajat: this.getIlmoituksenVastaanottajat(julkaisu.ilmoituksenVastaanottajat),
    };
  }

  async deleteAineistotIfEpaaktiivinen(projektiStatus: Status): Promise<AloitusKuulutusJulkaisu[]> {
    if (isStatusGreaterOrEqualTo(projektiStatus, Status.EPAAKTIIVINEN_1) && this.julkaisut) {
      const julkaisutSet = await this.julkaisut.reduce(
        async (modifiedJulkaisutPromise: Promise<Set<AloitusKuulutusJulkaisu>>, julkaisu) => {
          const modifiedJulkaisut = await modifiedJulkaisutPromise;
          await forSuomiRuotsiDoAsync(async (kieli) => {
            if (
              await this.deleteFilesWhenEpaaktiivinen(
                julkaisu.aloituskuulutusPDFt?.[kieli],
                "aloituskuulutusPDFPath",
                "aloituskuulutusIlmoitusPDFPath"
              )
            ) {
              modifiedJulkaisut.add(julkaisu);
            }
            if (await this.deleteLadattuTiedostoWhenEpaaktiivinen(julkaisu.lahetekirje)) {
              modifiedJulkaisut.add(julkaisu);
            }
          });

          if (await this.deleteKuulutusSaamePDFtWhenEpaaktiivinen(julkaisu.aloituskuulutusSaamePDFt)) {
            modifiedJulkaisut.add(julkaisu);
          }

          return modifiedJulkaisut;
        },
        Promise.resolve(new Set<AloitusKuulutusJulkaisu>())
      );
      return Array.from(julkaisutSet.values());
    }
    return [];
  }
}
