import * as API from "hassu-common/graphql/apiModel";
import { ProjektiTiedostoineen } from "../dynamoDBCalls/getProjektiTiedostoineen";
import { assertIsDefined } from "../../util/assertions";
import { forEverySaameDoAsync } from "../../projekti/adapter/adaptToDB";
import { JulkaistuHyvaksymisEsitys, LadattuTiedosto, MuokattavaHyvaksymisEsitys } from "../../database/model";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";
import {
  adaptAineistoNewToLadattavaTiedosto,
  adaptKunnallinenLadattuTiedostoToKunnallinenLadattavaTiedosto,
  adaptLadattuTiedostoNewToLadattavaTiedosto,
  adaptLadattuTiedostoToLadattavaTiedosto,
  adaptTiedostoPathToLadattavaTiedosto,
} from "../../tiedostot/adaptToLadattavaTiedosto";
import { JULKAISTU_HYVAKSYMISESITYS_PATH, MUOKATTAVA_HYVAKSYMISESITYS_PATH, getYllapitoPathForProjekti } from "../../tiedostot/paths";

export default async function createLadattavatTiedostot(
  projekti: ProjektiTiedostoineen,
  hyvaksymisEsitys: MuokattavaHyvaksymisEsitys | JulkaistuHyvaksymisEsitys,
  aineistopaketti: string | null
): Promise<API.LadattavatTiedostot> {
  const oid = projekti.oid;
  const aineistoHandledAt = (hyvaksymisEsitys as MuokattavaHyvaksymisEsitys).aineistoHandledAt || true;
  const path =
    getYllapitoPathForProjekti(oid) + (aineistoHandledAt === true ? JULKAISTU_HYVAKSYMISESITYS_PATH : MUOKATTAVA_HYVAKSYMISESITYS_PATH);
  const hyvaksymisEsitysTiedostot: API.LadattavaTiedosto[] = (
    await Promise.all(
      (hyvaksymisEsitys.hyvaksymisEsitys ?? []).map((tiedosto) =>
        adaptLadattuTiedostoNewToLadattavaTiedosto(oid, tiedosto, path + "hyvaksymisEsitys/")
      )
    )
  ).sort(jarjestaTiedostot);
  const kuulutuksetJaKutsutOmaltaKoneelta = (
    await Promise.all(
      (hyvaksymisEsitys.kuulutuksetJaKutsu ?? []).map((tiedosto) =>
        adaptLadattuTiedostoNewToLadattavaTiedosto(oid, tiedosto, path + "kuulutuksetJaKutsu/")
      )
    )
  ).sort(jarjestaTiedostot);
  const kuulutuksetJaKutsutProjektista = await getKutsut(projekti);
  const kuulutuksetJaKutsu: API.LadattavaTiedosto[] = kuulutuksetJaKutsutProjektista.concat(kuulutuksetJaKutsutOmaltaKoneelta);
  const muuAineistoOmaltaKoneelta = (
    await Promise.all(
      (hyvaksymisEsitys.muuAineistoKoneelta ?? []).map((tiedosto) =>
        adaptLadattuTiedostoNewToLadattavaTiedosto(oid, tiedosto, path + "muuAineistoKoneelta/")
      )
    )
  ).sort(jarjestaTiedostot);
  const muuAineistoVelhosta = (
    await Promise.all(
      (hyvaksymisEsitys.muuAineistoVelhosta ?? []).map((tiedosto) =>
        adaptAineistoNewToLadattavaTiedosto(oid, tiedosto, aineistoHandledAt, path + "muuAineistoVelhosta/")
      )
    )
  ).sort(jarjestaTiedostot);
  const muutAineistot: API.LadattavaTiedosto[] = muuAineistoOmaltaKoneelta.concat(muuAineistoVelhosta);
  const suunnitelma: API.LadattavaTiedosto[] = (
    await Promise.all(
      hyvaksymisEsitys?.suunnitelma?.map((aineisto) =>
        adaptAineistoNewToLadattavaTiedosto(projekti.oid, aineisto, aineistoHandledAt, path + "suunnitelma/")
      ) ?? []
    )
  ).sort(jarjestaTiedostot);
  const kuntaMuistutukset: API.KunnallinenLadattavaTiedosto[] = (
    await Promise.all(
      (hyvaksymisEsitys.muistutukset ?? []).map((tiedosto) =>
        adaptKunnallinenLadattuTiedostoToKunnallinenLadattavaTiedosto(oid, tiedosto, path + "muistutukset/")
      )
    )
  ).sort(jarjestaTiedostot);
  const lausunnot: API.LadattavaTiedosto[] = [];
  return {
    __typename: "LadattavatTiedostot",
    hyvaksymisEsitys: hyvaksymisEsitysTiedostot,
    suunnitelma,
    kuntaMuistutukset,
    lausunnot,
    kuulutuksetJaKutsu,
    muutAineistot,
    poistumisPaiva: hyvaksymisEsitys.poistumisPaiva,
    aineistopaketti,
  };
}

async function getKutsut(projekti: ProjektiTiedostoineen): Promise<API.LadattavaTiedosto[]> {
  const oid = projekti.oid;
  const kutsut: API.LadattavaTiedosto[] = [];
  //Aloituskuulutus
  const aloituskuulutusJulkaisu = projekti.aloitusKuulutusJulkaisut?.[projekti.aloitusKuulutusJulkaisut.length - 1];
  const aloituskuulutusJulkaisuPDFt = aloituskuulutusJulkaisu?.aloituskuulutusPDFt;
  assertIsDefined(aloituskuulutusJulkaisuPDFt, "aloituskuulutusJulkaisuPDFt on määritelty tässä vaiheessa");
  for (const kieli in API.Kieli) {
    const kuulutus: string | undefined = aloituskuulutusJulkaisuPDFt[kieli as API.Kieli]?.aloituskuulutusPDFPath;
    if (kuulutus) {
      kutsut.push(await adaptTiedostoPathToLadattavaTiedosto(oid, kuulutus));
    }
    const ilmoitus: string | undefined = aloituskuulutusJulkaisuPDFt[kieli as API.Kieli]?.aloituskuulutusIlmoitusPDFPath;
    if (ilmoitus) {
      kutsut.push(await adaptTiedostoPathToLadattavaTiedosto(oid, ilmoitus));
    }
  }
  const aloituskuulutusSaamePDFt = aloituskuulutusJulkaisu?.aloituskuulutusSaamePDFt;
  if (aloituskuulutusSaamePDFt) {
    forEverySaameDoAsync(async (kieli) => {
      const kuulutus: LadattuTiedosto | null | undefined = aloituskuulutusSaamePDFt[kieli]?.kuulutusPDF;
      assertIsDefined(kuulutus, `aloituskuulutusSaamePDFt[${kieli}].aloituskuulutusPDFPath on oltava olemassa`);
      kutsut.push(await adaptLadattuTiedostoToLadattavaTiedosto(oid, kuulutus));
      const ilmoitus: LadattuTiedosto | null | undefined = aloituskuulutusSaamePDFt[kieli]?.kuulutusIlmoitusPDF;
      assertIsDefined(ilmoitus, `aloituskuulutusSaamePDFt[${kieli}].aloituskuulutusIlmoitusPDFPath on oltava olemassa`);
      kutsut.push(await adaptLadattuTiedostoToLadattavaTiedosto(oid, ilmoitus));
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
      if (kutsu) {
        kutsut.push(await adaptTiedostoPathToLadattavaTiedosto(oid, kutsu));
      }
    }
    const vuorovaikutusSaamePDFt = julkaisu.vuorovaikutusSaamePDFt;
    if (vuorovaikutusSaamePDFt) {
      forEverySaameDoAsync(async (kieli) => {
        const kutsu: LadattuTiedosto | null | undefined = vuorovaikutusSaamePDFt[kieli];
        assertIsDefined(kutsu, `vuorovaikutusSaamePDFt[${kieli}] on oltava olemassa`);
        kutsut.push(await adaptLadattuTiedostoToLadattavaTiedosto(oid, kutsu));
      });
    }
  }

  //Nähtävilläolovaihe
  const nahtavillaoloVaiheJulkaisu = projekti.nahtavillaoloVaiheJulkaisut?.[projekti.nahtavillaoloVaiheJulkaisut.length - 1];
  const nahtavillaoloVaiheJulkaisuPDFt = nahtavillaoloVaiheJulkaisu?.nahtavillaoloPDFt;
  assertIsDefined(nahtavillaoloVaiheJulkaisuPDFt, "nahtavillaoloVaiheJulkaisuPDFt on määritelty tässä vaiheessa");
  for (const kieli in API.Kieli) {
    const kuulutus: string | undefined = nahtavillaoloVaiheJulkaisuPDFt[kieli as API.Kieli]?.nahtavillaoloPDFPath;
    if (kuulutus) {
      kutsut.push(await adaptTiedostoPathToLadattavaTiedosto(oid, kuulutus));
    }
    const ilmoitus: string | undefined = nahtavillaoloVaiheJulkaisuPDFt[kieli as API.Kieli]?.nahtavillaoloIlmoitusPDFPath;
    if (ilmoitus) {
      kutsut.push(await adaptTiedostoPathToLadattavaTiedosto(oid, ilmoitus));
    }
    const ilmoitusKiinteistonomistajille: string | undefined =
      nahtavillaoloVaiheJulkaisuPDFt[kieli as API.Kieli]?.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath;
    if (ilmoitusKiinteistonomistajille) {
      kutsut.push(await adaptTiedostoPathToLadattavaTiedosto(oid, ilmoitusKiinteistonomistajille));
    }
  }
  const nahtavillaoloSaamePDFt = nahtavillaoloVaiheJulkaisu?.nahtavillaoloSaamePDFt;
  if (nahtavillaoloSaamePDFt) {
    forEverySaameDoAsync(async (kieli) => {
      const kuulutus: LadattuTiedosto | null | undefined = nahtavillaoloSaamePDFt[kieli]?.kuulutusPDF;
      assertIsDefined(kuulutus, `aloituskuulutusSaamePDFt[${kieli}].aloituskuulutusPDFPath on oltava olemassa`);
      kutsut.push(await adaptLadattuTiedostoToLadattavaTiedosto(oid, kuulutus));
      const ilmoitus: LadattuTiedosto | null | undefined = nahtavillaoloSaamePDFt[kieli]?.kuulutusIlmoitusPDF;
      assertIsDefined(ilmoitus, `aloituskuulutusSaamePDFt[${kieli}].aloituskuulutusIlmoitusPDFPath on oltava olemassa`);
      kutsut.push(await adaptLadattuTiedostoToLadattavaTiedosto(oid, ilmoitus));
    });
  }
  return kutsut;
}
