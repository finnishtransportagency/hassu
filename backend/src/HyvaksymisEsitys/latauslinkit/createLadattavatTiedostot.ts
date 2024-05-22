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
import {
  JULKAISTU_HYVAKSYMISESITYS_PATH,
  MUOKATTAVA_HYVAKSYMISESITYS_PATH,
  getYllapitoPathForProjekti,
  joinPath,
} from "../../tiedostot/paths";

export default async function createLadattavatTiedostot(
  projekti: ProjektiTiedostoineen,
  hyvaksymisEsitys: MuokattavaHyvaksymisEsitys | JulkaistuHyvaksymisEsitys
): Promise<
  Pick<
    API.HyvaksymisEsityksenAineistot,
    "hyvaksymisEsitys" | "suunnitelma" | "kuntaMuistutukset" | "lausunnot" | "kuulutuksetJaKutsu" | "muutAineistot" | "maanomistajaluettelo"
  >
> {
  const oid = projekti.oid;
  const aineistoHandledAt = projekti.aineistoHandledAt || true;
  const path = joinPath(
    getYllapitoPathForProjekti(oid),
    aineistoHandledAt === true ? JULKAISTU_HYVAKSYMISESITYS_PATH : MUOKATTAVA_HYVAKSYMISESITYS_PATH
  );
  const hyvaksymisEsitysTiedostot: API.LadattavaTiedosto[] = (
    await Promise.all(
      (hyvaksymisEsitys.hyvaksymisEsitys ?? []).map((tiedosto) =>
        adaptLadattuTiedostoNewToLadattavaTiedosto(tiedosto, joinPath(path, "hyvaksymisEsitys"))
      )
    )
  ).sort(jarjestaTiedostot);
  const kuulutuksetJaKutsutOmaltaKoneelta = (
    await Promise.all(
      (hyvaksymisEsitys.kuulutuksetJaKutsu ?? []).map((tiedosto) =>
        adaptLadattuTiedostoNewToLadattavaTiedosto(tiedosto, joinPath(path, "kuulutuksetJaKutsu"))
      )
    )
  ).sort(jarjestaTiedostot);
  const kuulutuksetJaKutsutProjektista = await getKutsut(projekti);
  const kuulutuksetJaKutsu: API.LadattavaTiedosto[] = kuulutuksetJaKutsutProjektista.concat(kuulutuksetJaKutsutOmaltaKoneelta);
  const muuAineistoOmaltaKoneelta = (
    await Promise.all(
      (hyvaksymisEsitys.muuAineistoKoneelta ?? []).map((tiedosto) =>
        adaptLadattuTiedostoNewToLadattavaTiedosto(tiedosto, joinPath(path, "muuAineistoKoneelta"))
      )
    )
  ).sort(jarjestaTiedostot);
  const muuAineistoVelhosta = (
    await Promise.all(
      (hyvaksymisEsitys.muuAineistoVelhosta ?? []).map((tiedosto) =>
        adaptAineistoNewToLadattavaTiedosto(tiedosto, aineistoHandledAt, joinPath(path, "muuAineistoVelhosta"))
      )
    )
  ).sort(jarjestaTiedostot);
  const muutAineistot: API.LadattavaTiedosto[] = muuAineistoOmaltaKoneelta.concat(muuAineistoVelhosta);
  const suunnitelma: API.LadattavaTiedosto[] = (
    await Promise.all(
      hyvaksymisEsitys?.suunnitelma?.map((aineisto) =>
        adaptAineistoNewToLadattavaTiedosto(aineisto, aineistoHandledAt, joinPath(path, "suunnitelma"))
      ) ?? []
    )
  ).sort(jarjestaTiedostot);
  const kuntaMuistutukset: API.KunnallinenLadattavaTiedosto[] = (
    await Promise.all(
      (hyvaksymisEsitys.muistutukset ?? []).map((tiedosto) =>
        adaptKunnallinenLadattuTiedostoToKunnallinenLadattavaTiedosto(tiedosto, joinPath(path, "muistutukset"))
      )
    )
  ).sort(jarjestaTiedostot);
  const maanomistajaluettelo: API.LadattavaTiedosto[] = (
    await Promise.all(
      hyvaksymisEsitys?.maanomistajaluettelo?.map((aineisto) =>
        adaptLadattuTiedostoNewToLadattavaTiedosto(aineisto, joinPath(path, "maanomistajaluettelo"))
      ) ?? []
    )
  ).sort(jarjestaTiedostot);
  const lausunnot: API.LadattavaTiedosto[] = (
    await Promise.all(
      hyvaksymisEsitys?.lausunnot?.map((aineisto) => adaptLadattuTiedostoNewToLadattavaTiedosto(aineisto, joinPath(path, "lausunnot"))) ??
        []
    )
  ).sort(jarjestaTiedostot);
  return {
    hyvaksymisEsitys: hyvaksymisEsitysTiedostot,
    suunnitelma,
    kuntaMuistutukset,
    lausunnot,
    kuulutuksetJaKutsu,
    muutAineistot,
    maanomistajaluettelo,
  };
}

async function getKutsut(projekti: ProjektiTiedostoineen): Promise<API.LadattavaTiedosto[]> {
  const oid = projekti.oid;
  const onSaameProjekti =
    projekti.kielitiedot?.ensisijainenKieli == API.Kieli.POHJOISSAAME || projekti.kielitiedot?.toissijainenKieli == API.Kieli.POHJOISSAAME;
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

  if (onSaameProjekti) {
    const aloituskuulutusSaamePDFt = aloituskuulutusJulkaisu?.aloituskuulutusSaamePDFt;
    await forEverySaameDoAsync(async (kieli) => {
      assertIsDefined(aloituskuulutusSaamePDFt, "aloituskuulutusSaamePDFt on määritelty tässä vaiheessa");
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
  if (vuorovaikutusKierrosJulkaisut) {
    // Lyhyen mennettelyn projekteissa ei ole suunnitteluvaihetta
    for (const julkaisu of vuorovaikutusKierrosJulkaisut) {
      const vuorovaikutusPDFt = julkaisu.vuorovaikutusPDFt;
      assertIsDefined(vuorovaikutusPDFt, "vuorovaikutusPDFt on määritelty tässä vaiheessa");
      for (const kieli in API.Kieli) {
        const kutsu: string | undefined = vuorovaikutusPDFt[kieli as API.Kieli]?.kutsuPDFPath;
        if (kutsu) {
          kutsut.push(await adaptTiedostoPathToLadattavaTiedosto(oid, kutsu));
        }
      }

      if (onSaameProjekti) {
        const vuorovaikutusSaamePDFt = julkaisu.vuorovaikutusSaamePDFt;
        await forEverySaameDoAsync(async (kieli) => {
          assertIsDefined(vuorovaikutusSaamePDFt, "vuorovaikutusSaamePDFt on määritelty tässä vaiheessa");
          const kutsu: LadattuTiedosto | null | undefined = vuorovaikutusSaamePDFt[kieli];
          assertIsDefined(kutsu, `vuorovaikutusSaamePDFt[${kieli}] on oltava olemassa`);
          kutsut.push(await adaptLadattuTiedostoToLadattavaTiedosto(oid, kutsu));
        });
      }
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

  if (onSaameProjekti) {
    await forEverySaameDoAsync(async (kieli) => {
      const nahtavillaoloSaamePDFt = nahtavillaoloVaiheJulkaisu?.nahtavillaoloSaamePDFt;
      assertIsDefined(nahtavillaoloSaamePDFt, "nahtavillaoloSaamePDFt on määritelty tässä vaiheessa");
      const kuulutus: LadattuTiedosto | null | undefined = nahtavillaoloSaamePDFt[kieli]?.kuulutusPDF;
      assertIsDefined(kuulutus, `nahtavillaoloSaamePDFt[${kieli}].kuulutusPDF on oltava olemassa`);
      kutsut.push(await adaptLadattuTiedostoToLadattavaTiedosto(oid, kuulutus));
      const ilmoitus: LadattuTiedosto | null | undefined = nahtavillaoloSaamePDFt[kieli]?.kuulutusIlmoitusPDF;
      assertIsDefined(ilmoitus, `nahtavillaoloSaamePDFt[${kieli}].kuulutusIlmoitusPDF on oltava olemassa`);
      kutsut.push(await adaptLadattuTiedostoToLadattavaTiedosto(oid, ilmoitus));
    });
  }
  return kutsut;
}
