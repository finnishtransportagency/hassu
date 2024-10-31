import { Status } from "hassu-common/graphql/apiModel";
import { isStatusGreaterOrEqualTo } from "hassu-common/statusOrder";
import { VaiheTiedostoManager } from ".";
import { HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu } from "../../database/model";
import { forSuomiRuotsiDoAsync } from "../../projekti/adapter/common";

export abstract class AbstractHyvaksymisPaatosVaiheTiedostoManager extends VaiheTiedostoManager<
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu
> {
  protected subsequentEpaaktiivinen: Status.EPAAKTIIVINEN_1 | Status.EPAAKTIIVINEN_2 | Status.EPAAKTIIVINEN_3;

  constructor(
    oid: string,
    vaihe: HyvaksymisPaatosVaihe | undefined | null,
    julkaisut: HyvaksymisPaatosVaiheJulkaisu[] | undefined | null,
    subsequentEpaaktiivinen: Status.EPAAKTIIVINEN_1 | Status.EPAAKTIIVINEN_2 | Status.EPAAKTIIVINEN_3
  ) {
    super(oid, vaihe, julkaisut);
    this.subsequentEpaaktiivinen = subsequentEpaaktiivinen;
  }

  async deleteAineistotIfEpaaktiivinen(projektiStatus: Status): Promise<HyvaksymisPaatosVaiheJulkaisu[]> {
    if (!(isStatusGreaterOrEqualTo(projektiStatus, this.subsequentEpaaktiivinen) && this.julkaisut)) {
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
}
