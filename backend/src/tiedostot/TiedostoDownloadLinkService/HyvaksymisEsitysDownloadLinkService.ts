import * as API from "hassu-common/graphql/apiModel";
import crypto from "crypto";
import { IllegalAccessError } from "hassu-common/error";
import {
  AineistoNew,
  DBProjekti,
  JulkaistuHyvaksymisEsitys,
  KunnallinenLadattuTiedosto,
  LadattuTiedosto,
  LadattuTiedostoNew,
  MuokattavaHyvaksymisEsitys,
} from "../../database/model";
import { log } from "../../logger";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";
import { fileService } from "../../files/fileService";
import { adaptHyvaksymisEsitysToSave, forEverySaameDoAsync } from "../../projekti/adapter/adaptToDB";
import { assertIsDefined } from "../../util/assertions";
import { adaptLadattuTiedostoToLadattavaTiedosto, adaptTiedostoPathToLadattavaTiedosto } from "./AbstractTiedostoDownloadLinkService";

export async function esikatseleTiedostot(
  dbProjekti: DBProjekti,
  hyvaksymisEsitysInput: API.HyvaksymisEsitysInput
): Promise<API.LadattavatTiedostot> {
  const muokattavaHyvaksymisEsitys = adaptHyvaksymisEsitysToSave(dbProjekti.muokattavaHyvaksymisEsitys, hyvaksymisEsitysInput);
  const aineistopaketti = "(esikatselu)";
  return await getTiedostot(dbProjekti, muokattavaHyvaksymisEsitys, aineistopaketti);
}

async function getTiedostot(
  projekti: DBProjekti,
  hyvaksymisEsitys: MuokattavaHyvaksymisEsitys | JulkaistuHyvaksymisEsitys,
  aineistopaketti: string | null
): Promise<API.LadattavatTiedostot> {
  const oid = projekti.oid;
  const aineistoHandledAt = (hyvaksymisEsitys as MuokattavaHyvaksymisEsitys).aineistoHandledAt || true;
  const hyvaksymisEsitysTiedostot: API.LadattavaTiedosto[] = (
    await Promise.all(
      (hyvaksymisEsitys.hyvaksymisEsitys ?? []).map((tiedosto) => adaptLadattuTiedostoNewToLadattavaTiedosto(oid, tiedosto, "TODO"))
    )
  ).sort(jarjestaTiedostot);
  const kuulutuksetJaKutsutOmaltaKoneelta = (
    await Promise.all(
      (hyvaksymisEsitys.kuulutuksetJaKutsu ?? []).map((tiedosto) => adaptLadattuTiedostoNewToLadattavaTiedosto(oid, tiedosto, "TODO"))
    )
  ).sort(jarjestaTiedostot);
  const kuulutuksetJaKutsutProjektista = await getKutsut(projekti);
  const kuulutuksetJaKutsu: API.LadattavaTiedosto[] = kuulutuksetJaKutsutProjektista.concat(kuulutuksetJaKutsutOmaltaKoneelta);
  const muuAineistoOmaltaKoneelta = (
    await Promise.all(
      (hyvaksymisEsitys.muuAineistoKoneelta ?? []).map((tiedosto) => adaptLadattuTiedostoNewToLadattavaTiedosto(oid, tiedosto, "TODO"))
    )
  ).sort(jarjestaTiedostot);
  const muuAineistoVelhosta = (
    await Promise.all(
      (hyvaksymisEsitys.muuAineistoVelhosta ?? []).map((tiedosto) =>
        adaptAineistoNewToLadattavaTiedosto(oid, tiedosto, aineistoHandledAt, "TODO")
      )
    )
  ).sort(jarjestaTiedostot);
  const muutAineistot: API.LadattavaTiedosto[] = muuAineistoOmaltaKoneelta.concat(muuAineistoVelhosta);
  const suunnitelma: API.LadattavaTiedosto[] = (
    await Promise.all(
      hyvaksymisEsitys?.suunnitelma?.map((aineisto) =>
        adaptAineistoNewToLadattavaTiedosto(projekti.oid, aineisto, aineistoHandledAt, "TODO")
      ) ?? []
    )
  ).sort(jarjestaTiedostot);
  const kuntaMuistutukset: API.KunnallinenLadattavaTiedosto[] = (
    await Promise.all(
      (hyvaksymisEsitys.muistutukset ?? []).map((tiedosto) =>
        adaptKunnallinenLadattuTiedostoToKunnallinenLadattavaTiedosto(oid, tiedosto, "TODO")
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

async function getKutsut(projekti: DBProjekti): Promise<API.LadattavaTiedosto[]> {
  const oid = projekti.oid;
  const kutsut: API.LadattavaTiedosto[] = [];
  //Aloituskuulutus
  const aloituskuulutusJulkaisu = projekti.aloitusKuulutusJulkaisut?.[projekti.aloitusKuulutusJulkaisut.length - 1];
  const aloituskuulutusJulkaisuPDFt = aloituskuulutusJulkaisu?.aloituskuulutusPDFt;
  assertIsDefined(aloituskuulutusJulkaisuPDFt, "aloituskuulutusJulkaisuPDFt on määritelty tässä vaiheessa");
  for (const kieli in API.Kieli) {
    const kuulutus: string | undefined = aloituskuulutusJulkaisuPDFt[kieli as API.Kieli]?.aloituskuulutusPDFPath;
    assertIsDefined(kuulutus, `aloituskuulutusJulkaisuPDFt[${kieli}].aloituskuulutusPDFPath on oltava olemassa`);
    kutsut.push(await adaptTiedostoPathToLadattavaTiedosto(oid, kuulutus));
    const ilmoitus: string | undefined = aloituskuulutusJulkaisuPDFt[kieli as API.Kieli]?.aloituskuulutusIlmoitusPDFPath;
    assertIsDefined(ilmoitus, `aloituskuulutusJulkaisuPDFt[${kieli}].aloituskuulutusIlmoitusPDFPath on oltava olemassa`);
    kutsut.push(await adaptTiedostoPathToLadattavaTiedosto(oid, ilmoitus));
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
      assertIsDefined(kutsu, `(vuorovaikutusKierrosJulkaisu)[${kieli}].kutsuPDFPath on oltava olemassa`);
      kutsut.push(await adaptTiedostoPathToLadattavaTiedosto(oid, kutsu));
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
    assertIsDefined(kuulutus, `nahtavillaoloVaiheJulkaisuPDFt[${kieli}].nahtavillaoloPDFPath on oltava olemassa`);
    kutsut.push(await adaptTiedostoPathToLadattavaTiedosto(oid, kuulutus));
    const ilmoitus: string | undefined = nahtavillaoloVaiheJulkaisuPDFt[kieli as API.Kieli]?.nahtavillaoloIlmoitusPDFPath;
    assertIsDefined(ilmoitus, `nahtavillaoloVaiheJulkaisuPDFt[${kieli}].nahtavillaoloIlmoitusPDFPath on oltava olemassa`);
    kutsut.push(await adaptTiedostoPathToLadattavaTiedosto(oid, ilmoitus));
    const ilmoitusKiinteistonomistajille: string | undefined =
      nahtavillaoloVaiheJulkaisuPDFt[kieli as API.Kieli]?.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath;
    assertIsDefined(
      ilmoitusKiinteistonomistajille,
      `nahtavillaoloVaiheJulkaisuPDFt[${kieli}].nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath on oltava olemassa`
    );
    kutsut.push(await adaptTiedostoPathToLadattavaTiedosto(oid, ilmoitusKiinteistonomistajille));
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

async function adaptLadattuTiedostoNewToLadattavaTiedosto(
  oid: string,
  tiedosto: LadattuTiedostoNew,
  path: string
): Promise<API.LadattavaTiedosto> {
  const { jarjestys, nimi } = tiedosto;
  const linkki = await fileService.createYllapitoSignedDownloadLink(oid, path + tiedosto.nimi);
  return { __typename: "LadattavaTiedosto", nimi, jarjestys, linkki, tuotu: tiedosto.lisatty };
}

export async function adaptAineistoNewToLadattavaTiedosto(
  oid: string,
  aineisto: AineistoNew,
  aineistoHandletAt: string | true | undefined | null,
  path: string
): Promise<API.LadattavaTiedosto> {
  const { jarjestys, kategoriaId } = aineisto;
  const nimi = aineisto.nimi;
  let linkki;
  if (aineistoHandletAt === true || (aineistoHandletAt && aineistoHandletAt.localeCompare(aineisto.lisatty))) {
    linkki = await fileService.createYllapitoSignedDownloadLink(oid, path + aineisto.nimi);
  } else {
    linkki = "";
  }
  return { __typename: "LadattavaTiedosto", nimi, jarjestys, kategoriaId, linkki, tuotu: aineisto.lisatty };
}

export async function listaaTiedostot(
  projekti: DBProjekti,
  _params: API.ListaaHyvaksymisEsityksenTiedostotInput
): Promise<API.LadattavatTiedostot> {
  const hyvaksymisEsitys = projekti.julkaistuHyvaksymisEsitys;
  if (!hyvaksymisEsitys) {
    throw new Error("Hyvaksymisesitystä ei löytynyt");
  }
  const aineistopaketti = hyvaksymisEsitys?.aineistopaketti
    ? await fileService.createYllapitoSignedDownloadLink(projekti.oid, hyvaksymisEsitys?.aineistopaketti)
    : null;
  return await getTiedostot(projekti, hyvaksymisEsitys, aineistopaketti);
}

export function generateHash(oid: string, salt: string): string {
  if (!salt) {
    // Should not happen after going to production because salt is generated in the first save to DB
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return;
  }
  return createHyvaksymisEsitysHash(oid, salt);
}

export function validateHash(oid: string, salt: string, givenHash: string) {
  const hash = createHyvaksymisEsitysHash(oid, salt);
  if (hash != givenHash) {
    log.error("Lausuntopyynnon aineiston tarkistussumma ei täsmää", { oid, salt, givenHash });
    throw new IllegalAccessError("Lausuntopyynnon aineiston tarkistussumma ei täsmää");
  }
}

function createHyvaksymisEsitysHash(oid: string, salt: string | undefined): string {
  if (!salt) {
    throw new Error("Salt missing");
  }
  return crypto.createHash("sha512").update([oid, "hyvaksymisesitys", salt].join()).digest("hex");
}

async function adaptKunnallinenLadattuTiedostoToKunnallinenLadattavaTiedosto(
  oid: string,
  tiedosto: KunnallinenLadattuTiedosto,
  path: string
): Promise<API.KunnallinenLadattavaTiedosto> {
  const { jarjestys } = tiedosto;
  const nimi: string = tiedosto.nimi ?? "";
  const linkki = await fileService.createYllapitoSignedDownloadLink(oid, path + tiedosto.nimi);
  return { __typename: "KunnallinenLadattavaTiedosto", nimi, jarjestys, linkki, tuotu: tiedosto.lisatty, kunta: tiedosto.kunta };
}
