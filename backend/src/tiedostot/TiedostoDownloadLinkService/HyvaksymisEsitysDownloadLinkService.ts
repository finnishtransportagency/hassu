import * as API from "hassu-common/graphql/apiModel";
import crypto from "crypto";
import { IllegalAccessError } from "hassu-common/error";
import { DBProjekti, HyvaksymisEsitys, LadattuTiedosto } from "../../database/model";
import { log } from "../../logger";
import { ProjektiAdaptationResult } from "../../projekti/adapter/projektiAdaptationResult";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";
import { fileService } from "../../files/fileService";
import { adaptHyvaksymisEsitysToSave, forEverySaameDoAsync } from "../../projekti/adapter/adaptToDB";
import { assertIsDefined } from "../../util/assertions";
import { aineistoEiOdotaPoistoaTaiPoistettu, ladattuTiedostoEiOdotaPoistoaTaiPoistettu } from "hassu-common/util/tiedostoTilaUtil";
import TiedostoDownloadLinkService from "./AbstractTiedostoDownloadLinkService";

class HyvaksymisEsitysDownloadLinkService extends TiedostoDownloadLinkService<
  HyvaksymisEsitys,
  API.HyvaksymisEsitysInput,
  API.ListaaHyvaksymisEsityksenTiedostotInput
> {
  async esikatseleTiedostot(projekti: DBProjekti, hyvaksymisEsitysInput: API.HyvaksymisEsitysInput): Promise<API.LadattavatTiedostot> {
    const hyvaksymisEsitys = adaptHyvaksymisEsitysToSave(
      projekti.hyvaksymisEsitys,
      hyvaksymisEsitysInput,
      new ProjektiAdaptationResult(projekti)
    );
    assertIsDefined(hyvaksymisEsitys, "hyväksymisesityksen tulee olla määritelty");

    const aineistopaketti = "(esikatselu)";
    return await this.getTiedostot(projekti, hyvaksymisEsitys, aineistopaketti);
  }

  private async getTiedostot(
    projekti: DBProjekti,
    hyvaksymisEsitys: HyvaksymisEsitys,
    aineistopaketti: string | null
  ): Promise<API.LadattavatTiedostot> {
    const oid = projekti.oid;
    const hyvaksymisEsitysTiedostot: API.HyvaksymisEsitysLadattavaTiedosto[] = (
      await Promise.all(
        (hyvaksymisEsitys.hyvaksymisEsitys?.filter(ladattuTiedostoEiOdotaPoistoaTaiPoistettu) ?? []).map((tiedosto) =>
          this.adaptHyvaksymisEsitysLadattuTiedostoToLadattavaTiedosto(oid, tiedosto)
        )
      )
    ).sort(jarjestaTiedostot);
    const kuulutuksetJaKutsutOmaltaKoneelta = (
      await Promise.all(
        (hyvaksymisEsitys.kuulutuksetJaKutsu?.filter(ladattuTiedostoEiOdotaPoistoaTaiPoistettu) ?? []).map((tiedosto) =>
          this.adaptLadattuTiedostoToLadattavaTiedosto(oid, tiedosto)
        )
      )
    ).sort(jarjestaTiedostot);
    const kuulutuksetJaKutsutProjektista = await this.getKutsut(projekti);
    const kuulutuksetJaKutsu: API.LadattavaTiedosto[] = kuulutuksetJaKutsutProjektista.concat(kuulutuksetJaKutsutOmaltaKoneelta);
    const muuAineistoOmaltaKoneelta = (
      await Promise.all(
        (hyvaksymisEsitys.muuAineistoKoneelta?.filter(ladattuTiedostoEiOdotaPoistoaTaiPoistettu) ?? []).map((tiedosto) =>
          this.adaptLadattuTiedostoToLadattavaTiedosto(oid, tiedosto)
        )
      )
    ).sort(jarjestaTiedostot);
    const muuAineistoVelhosta = (
      await Promise.all(
        (hyvaksymisEsitys.muuAineistoVelhosta?.filter(aineistoEiOdotaPoistoaTaiPoistettu) ?? []).map((tiedosto) =>
          this.adaptAineistoToLadattavaTiedosto(oid, tiedosto)
        )
      )
    ).sort(jarjestaTiedostot);
    const muutAineistot: API.LadattavaTiedosto[] = muuAineistoOmaltaKoneelta.concat(muuAineistoVelhosta);
    const suunnitelma: API.LadattavaTiedosto[] = (
      await Promise.all(
        hyvaksymisEsitys?.suunnitelma
          ?.filter(aineistoEiOdotaPoistoaTaiPoistettu)
          .map((aineisto) => this.adaptAineistoToLadattavaTiedosto(projekti.oid, aineisto)) ?? []
      )
    ).sort(jarjestaTiedostot);
    const muistutukset: API.LadattavaTiedosto[] = (
      await Promise.all(
        (hyvaksymisEsitys.muistutukset?.filter(ladattuTiedostoEiOdotaPoistoaTaiPoistettu) ?? []).map((tiedosto) =>
          this.adaptLadattuTiedostoToLadattavaTiedosto(oid, tiedosto)
        )
      )
    ).sort(jarjestaTiedostot);
    const lausunnot: API.LadattavaTiedosto[] = [];
    return {
      __typename: "LadattavatTiedostot",
      hyvaksymisEsitys: hyvaksymisEsitysTiedostot,
      suunnitelma,
      muistutukset,
      lausunnot,
      kuulutuksetJaKutsu,
      muutAineistot,
      poistumisPaiva: hyvaksymisEsitys.poistumisPaiva,
      aineistopaketti,
    };
  }

  private async getKutsut(projekti: DBProjekti): Promise<API.LadattavaTiedosto[]> {
    const oid = projekti.oid;
    const kutsut: API.LadattavaTiedosto[] = [];
    //Aloituskuulutus
    const aloituskuulutusJulkaisu = projekti.aloitusKuulutusJulkaisut?.[projekti.aloitusKuulutusJulkaisut.length - 1];
    const aloituskuulutusJulkaisuPDFt = aloituskuulutusJulkaisu?.aloituskuulutusPDFt;
    assertIsDefined(aloituskuulutusJulkaisuPDFt, "aloituskuulutusJulkaisuPDFt on määritelty tässä vaiheessa");
    for (const kieli in API.Kieli) {
      const kuulutus: string | undefined = aloituskuulutusJulkaisuPDFt[kieli as API.Kieli]?.aloituskuulutusPDFPath;
      assertIsDefined(kuulutus, `aloituskuulutusJulkaisuPDFt[${kieli}].aloituskuulutusPDFPath on oltava olemassa`);
      kutsut.push(await this.adaptTiedostoPathToLadattavaTiedosto(oid, kuulutus));
      const ilmoitus: string | undefined = aloituskuulutusJulkaisuPDFt[kieli as API.Kieli]?.aloituskuulutusIlmoitusPDFPath;
      assertIsDefined(ilmoitus, `aloituskuulutusJulkaisuPDFt[${kieli}].aloituskuulutusIlmoitusPDFPath on oltava olemassa`);
      kutsut.push(await this.adaptTiedostoPathToLadattavaTiedosto(oid, ilmoitus));
    }
    const aloituskuulutusSaamePDFt = aloituskuulutusJulkaisu?.aloituskuulutusSaamePDFt;
    if (aloituskuulutusSaamePDFt) {
      forEverySaameDoAsync(async (kieli) => {
        const kuulutus: LadattuTiedosto | null | undefined = aloituskuulutusSaamePDFt[kieli]?.kuulutusPDF;
        assertIsDefined(kuulutus, `aloituskuulutusSaamePDFt[${kieli}].aloituskuulutusPDFPath on oltava olemassa`);
        kutsut.push(await this.adaptLadattuTiedostoToLadattavaTiedosto(oid, kuulutus));
        const ilmoitus: LadattuTiedosto | null | undefined = aloituskuulutusSaamePDFt[kieli]?.kuulutusIlmoitusPDF;
        assertIsDefined(ilmoitus, `aloituskuulutusSaamePDFt[${kieli}].aloituskuulutusIlmoitusPDFPath on oltava olemassa`);
        kutsut.push(await this.adaptLadattuTiedostoToLadattavaTiedosto(oid, ilmoitus));
      });
    }

    //Suunnitteluvaihe
    const vuorovaikutusKierrosJulkaisut = projekti.vuorovaikutusKierrosJulkaisut;
    assertIsDefined(vuorovaikutusKierrosJulkaisut, "vuorovaikutusKierrosJulkaisut on määritelty tässä vaiheessa");
    for (const julkaisu of vuorovaikutusKierrosJulkaisut) {
      const vuorovaikutusPDFt = julkaisu.vuorovaikutusPDFt;
      assertIsDefined(vuorovaikutusPDFt, "vuorovaikutusPDFt on määritelty tässä vaiheessa");
      for (const kieli in API.Kieli) {
        const kutsu: string | undefined = vuorovaikutusPDFt[kieli as API.Kieli]?.kutsuPDFPath;
        assertIsDefined(kutsu, `(vuorovaikutusKierrosJulkaisu)[${kieli}].kutsuPDFPath on oltava olemassa`);
        kutsut.push(await this.adaptTiedostoPathToLadattavaTiedosto(oid, kutsu));
      }
      const vuorovaikutusSaamePDFt = julkaisu.vuorovaikutusSaamePDFt;
      if (vuorovaikutusSaamePDFt) {
        forEverySaameDoAsync(async (kieli) => {
          const kutsu: LadattuTiedosto | null | undefined = vuorovaikutusSaamePDFt[kieli];
          assertIsDefined(kutsu, `vuorovaikutusSaamePDFt[${kieli}] on oltava olemassa`);
          kutsut.push(await this.adaptLadattuTiedostoToLadattavaTiedosto(oid, kutsu));
        });
      }
    }

    //Nähtävilläolovaihe
    const nahtavillaoloVaiheJulkaisu = projekti.nahtavillaoloVaiheJulkaisut?.[projekti.nahtavillaoloVaiheJulkaisut.length - 1];
    const nahtavillaoloVaiheJulkaisuPDFt = nahtavillaoloVaiheJulkaisu?.nahtavillaoloPDFt;
    assertIsDefined(nahtavillaoloVaiheJulkaisuPDFt, "nahtavillaoloVaiheJulkaisuPDFt on määritelty tässä vaiheessa");
    for (const kieli in API.Kieli) {
      const kuulutus: string | undefined = nahtavillaoloVaiheJulkaisuPDFt[kieli as API.Kieli]?.nahtavillaoloPDFPath;
      assertIsDefined(kuulutus, `nahtavillaoloVaiheJulkaisuPDFt[${kieli}].nahtavillaoloPDFPath on oltava olemassa`);
      kutsut.push(await this.adaptTiedostoPathToLadattavaTiedosto(oid, kuulutus));
      const ilmoitus: string | undefined = nahtavillaoloVaiheJulkaisuPDFt[kieli as API.Kieli]?.nahtavillaoloIlmoitusPDFPath;
      assertIsDefined(ilmoitus, `nahtavillaoloVaiheJulkaisuPDFt[${kieli}].nahtavillaoloIlmoitusPDFPath on oltava olemassa`);
      kutsut.push(await this.adaptTiedostoPathToLadattavaTiedosto(oid, ilmoitus));
      const ilmoitusKiinteistonomistajille: string | undefined =
        nahtavillaoloVaiheJulkaisuPDFt[kieli as API.Kieli]?.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath;
      assertIsDefined(
        ilmoitusKiinteistonomistajille,
        `nahtavillaoloVaiheJulkaisuPDFt[${kieli}].nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath on oltava olemassa`
      );
      kutsut.push(await this.adaptTiedostoPathToLadattavaTiedosto(oid, ilmoitusKiinteistonomistajille));
    }
    const nahtavillaoloSaamePDFt = nahtavillaoloVaiheJulkaisu?.nahtavillaoloSaamePDFt;
    if (nahtavillaoloSaamePDFt) {
      forEverySaameDoAsync(async (kieli) => {
        const kuulutus: LadattuTiedosto | null | undefined = nahtavillaoloSaamePDFt[kieli]?.kuulutusPDF;
        assertIsDefined(kuulutus, `aloituskuulutusSaamePDFt[${kieli}].aloituskuulutusPDFPath on oltava olemassa`);
        kutsut.push(await this.adaptLadattuTiedostoToLadattavaTiedosto(oid, kuulutus));
        const ilmoitus: LadattuTiedosto | null | undefined = nahtavillaoloSaamePDFt[kieli]?.kuulutusIlmoitusPDF;
        assertIsDefined(ilmoitus, `aloituskuulutusSaamePDFt[${kieli}].aloituskuulutusIlmoitusPDFPath on oltava olemassa`);
        kutsut.push(await this.adaptLadattuTiedostoToLadattavaTiedosto(oid, ilmoitus));
      });
    }
    return kutsut;
  }

  async listaaTiedostot(projekti: DBProjekti, _params: API.ListaaHyvaksymisEsityksenTiedostotInput): Promise<API.LadattavatTiedostot> {
    const hyvaksymisEsitys = projekti.hyvaksymisEsitys;
    if (!hyvaksymisEsitys) {
      throw new Error("Hyvaksymisesitystä ei löytynyt");
    }
    const aineistopaketti = hyvaksymisEsitys?.aineistopaketti
      ? await fileService.createYllapitoSignedDownloadLink(projekti.oid, hyvaksymisEsitys?.aineistopaketti)
      : null;
    return await this.getTiedostot(projekti, hyvaksymisEsitys, aineistopaketti);
  }

  generateHash(oid: string, uuid: string, salt: string): string {
    if (!salt) {
      // Should not happen after going to production because salt is generated in the first save to DB
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return;
    }
    return HyvaksymisEsitysDownloadLinkService.createLausuntoPyyntoHash(oid, uuid, salt);
  }

  validateHash(oid: string, salt: string, givenHash: string, hyvaksymisEsitys: HyvaksymisEsitys) {
    const hyvaksymisEsitysSecret = hyvaksymisEsitys.secret;
    assertIsDefined(hyvaksymisEsitysSecret, "hyvaksymisEsitys.secret pitää olla määritelty");
    const hash = HyvaksymisEsitysDownloadLinkService.createLausuntoPyyntoHash(oid, hyvaksymisEsitysSecret, salt);
    if (hash != givenHash) {
      log.error("Lausuntopyynnon aineiston tarkistussumma ei täsmää", { oid, salt, givenHash });
      throw new IllegalAccessError("Lausuntopyynnon aineiston tarkistussumma ei täsmää");
    }
  }

  private static createLausuntoPyyntoHash(oid: string, uuid: string, salt: string | undefined): string {
    if (!salt) {
      throw new Error("Salt missing");
    }
    return crypto.createHash("sha512").update([oid, "lausuntopyynto", uuid, salt].join()).digest("hex");
  }
}

export const hyvaksymisEsitysDownloadLinkService = new HyvaksymisEsitysDownloadLinkService();
