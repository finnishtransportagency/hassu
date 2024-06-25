import * as API from "hassu-common/graphql/apiModel";
import { assertIsDefined } from "../../util/assertions";
import { DBProjekti, LadattuTiedosto } from "../../database/model";
import { MUOKATTAVA_HYVAKSYMISESITYS_PATH, adaptFileName, getYllapitoPathForProjekti, joinPath } from "../../tiedostot/paths";
import { ZipSourceFile } from "../../tiedostot/zipFiles";
import { forEverySaameDo } from "../../projekti/adapter/common";
import { kuntametadata } from "hassu-common/kuntametadata";

type TarvittavatTiedot = Pick<
  DBProjekti,
  | "oid"
  | "kielitiedot"
  | "muokattavaHyvaksymisEsitys"
  | "aloitusKuulutusJulkaisut"
  | "vuorovaikutusKierrosJulkaisut"
  | "nahtavillaoloVaiheJulkaisut"
>;

export default function collectTiedostotToZip(projekti: TarvittavatTiedot): ZipSourceFile[] {
  const path = joinPath(getYllapitoPathForProjekti(projekti.oid), MUOKATTAVA_HYVAKSYMISESITYS_PATH);
  const hyvaksymisEsitys = projekti.muokattavaHyvaksymisEsitys;
  const hyvaksymisEsitysTiedostot = (hyvaksymisEsitys?.hyvaksymisEsitys ?? []).map((tiedosto) => ({
    s3Key: joinPath(path, "hyvaksymisEsitys", adaptFileName(tiedosto.nimi)),
    zipFolder: "Hyväksymisesitys",
  }));

  const kuulutuksetJaKutsutOmaltaKoneelta = (hyvaksymisEsitys?.kuulutuksetJaKutsu ?? []).map((tiedosto) => ({
    s3Key: joinPath(path, "kuulutuksetJaKutsu", adaptFileName(tiedosto.nimi)),
    zipFolder: "Kuulutukset ja kutsut",
  }));

  const kuulutuksetJaKutsutProjektista = getKutsut(projekti);
  const kuulutuksetJaKutsut: ZipSourceFile[] = kuulutuksetJaKutsutProjektista.concat(kuulutuksetJaKutsutOmaltaKoneelta);

  const muuAineistoOmaltaKoneelta = (hyvaksymisEsitys?.muuAineistoKoneelta ?? []).map((tiedosto) => ({
    s3Key: joinPath(path, "muuAineistoKoneelta", adaptFileName(tiedosto.nimi)),
    zipFolder: "Muu aineisto",
  }));
  const muuAineistoVelhosta = (hyvaksymisEsitys?.muuAineistoVelhosta ?? []).map((tiedosto) => ({
    s3Key: joinPath(path, "muuAineistoVelhosta", adaptFileName(tiedosto.nimi)),
    zipFolder: "Muu aineisto",
  }));
  const muutAineistot: ZipSourceFile[] = muuAineistoOmaltaKoneelta.concat(muuAineistoVelhosta);
  const suunnitelma = (hyvaksymisEsitys?.suunnitelma ?? []).map((aineisto) => ({
    s3Key: joinPath(path, "suunnitelma", adaptFileName(aineisto.nimi)),
    zipFolder: "Suunnitelma",
  }));
  const kuntaMuistutukset = (hyvaksymisEsitys?.muistutukset ?? []).map((tiedosto) => {
    const kunta = kuntametadata.kuntaForKuntaId(tiedosto.kunta);
    assertIsDefined(kunta, `Kuntaa id:llä ${tiedosto.kunta} ei löytynyt kuntametadatasta`);
    return {
      s3Key: joinPath(path, "muistutukset", adaptFileName(tiedosto.nimi)),
      zipFolder: `Muistutukset/${kunta.nimi.SUOMI}`,
    };
  });
  const maanomistajaluetteloProjektista = getMaanomistajaLuettelo(projekti);
  const maanomistajaluetteloOmaltaKoneelta: ZipSourceFile[] = (hyvaksymisEsitys?.maanomistajaluettelo ?? []).map((tiedosto) => ({
    s3Key: joinPath(path, "maanomistajaluettelo", adaptFileName(tiedosto.nimi)),
    zipFolder: "Maanomistajaluettelo",
  }));
  const maanomistajaluettelo = maanomistajaluetteloProjektista.concat(maanomistajaluetteloOmaltaKoneelta);
  const lausunnot = (hyvaksymisEsitys?.lausunnot ?? []).map((tiedosto) => ({
    s3Key: joinPath(path, "lausunnot", adaptFileName(tiedosto.nimi)),
    zipFolder: "Lausunnot",
  }));

  return [
    ...hyvaksymisEsitysTiedostot,
    ...kuulutuksetJaKutsut,
    ...muutAineistot,
    ...suunnitelma,
    ...kuntaMuistutukset,
    ...maanomistajaluettelo,
    ...lausunnot,
  ];
}

export function getMaanomistajaLuettelo(projekti: TarvittavatTiedot): ZipSourceFile[] {
  const maanomistajaluttelo: ZipSourceFile[] = [];
  //Nähtävilläolovaihe
  const nahtavillaoloVaiheJulkaisut = projekti.nahtavillaoloVaiheJulkaisut;
  if (nahtavillaoloVaiheJulkaisut) {
    for (const nahtavillaoloVaiheJulkaisu of nahtavillaoloVaiheJulkaisut) {
      if (nahtavillaoloVaiheJulkaisu.tila != API.KuulutusJulkaisuTila.HYVAKSYTTY) {
        continue;
      }
      if (nahtavillaoloVaiheJulkaisu.maanomistajaluettelo) {
        maanomistajaluttelo.push({
          s3Key: joinPath(getYllapitoPathForProjekti(projekti.oid), nahtavillaoloVaiheJulkaisu.maanomistajaluettelo),
          zipFolder: "Maanomistajaluttelo",
        });
      }
    }
  }
  return maanomistajaluttelo;
}

export function getKutsut(projekti: TarvittavatTiedot): ZipSourceFile[] {
  const filesToZip: [] = [];
  const onSaameProjekti =
    projekti.kielitiedot?.ensisijainenKieli == API.Kieli.POHJOISSAAME || projekti.kielitiedot?.toissijainenKieli == API.Kieli.POHJOISSAAME;
  const kutsut: ZipSourceFile[] = [];
  //Aloituskuulutus
  const aloitusKuulutusJulkaisut = projekti.aloitusKuulutusJulkaisut;
  if (aloitusKuulutusJulkaisut) {
    for (const aloituskuulutusJulkaisu of aloitusKuulutusJulkaisut) {
      if (aloituskuulutusJulkaisu.tila != API.KuulutusJulkaisuTila.HYVAKSYTTY) {
        continue;
      }
      const aloituskuulutusJulkaisuPDFt = aloituskuulutusJulkaisu?.aloituskuulutusPDFt;
      assertIsDefined(aloituskuulutusJulkaisuPDFt, "aloituskuulutusJulkaisuPDFt on määritelty tässä vaiheessa");
      for (const kieli in API.Kieli) {
        const kuulutus: string | undefined = aloituskuulutusJulkaisuPDFt[kieli as API.Kieli]?.aloituskuulutusPDFPath;
        if (kuulutus) {
          kutsut.push({
            s3Key: joinPath(getYllapitoPathForProjekti(projekti.oid), kuulutus),
            zipFolder: "Kuulutukset ja kutsut",
          });
        }
      }

      if (onSaameProjekti) {
        const aloituskuulutusSaamePDFt = aloituskuulutusJulkaisu?.aloituskuulutusSaamePDFt;
        forEverySaameDo(async (kieli) => {
          assertIsDefined(aloituskuulutusSaamePDFt, "aloituskuulutusSaamePDFt on määritelty tässä vaiheessa");
          const kuulutus: LadattuTiedosto | null | undefined = aloituskuulutusSaamePDFt[kieli]?.kuulutusPDF;
          assertIsDefined(kuulutus, `aloituskuulutusSaamePDFt[${kieli}].aloituskuulutusPDFPath on oltava olemassa`);
          kutsut.push({
            s3Key: joinPath(getYllapitoPathForProjekti(projekti.oid), kuulutus.tiedosto),
            zipFolder: "Kuulutukset ja kutsut",
          });
        });
      }
    }
  }

  //Suunnitteluvaihe
  const vuorovaikutusKierrosJulkaisut = projekti.vuorovaikutusKierrosJulkaisut;
  if (vuorovaikutusKierrosJulkaisut) {
    // Lyhyen mennettelyn projekteissa ei ole suunnitteluvaihetta
    for (const julkaisu of vuorovaikutusKierrosJulkaisut) {
      if (julkaisu.tila != API.VuorovaikutusKierrosTila.JULKINEN) {
        continue;
      }
      const vuorovaikutusPDFt = julkaisu.vuorovaikutusPDFt;
      assertIsDefined(vuorovaikutusPDFt, "vuorovaikutusPDFt on määritelty tässä vaiheessa");
      for (const kieli in API.Kieli) {
        const kutsu: string | undefined = vuorovaikutusPDFt[kieli as API.Kieli]?.kutsuPDFPath;
        if (kutsu) {
          kutsut.push({
            s3Key: joinPath(getYllapitoPathForProjekti(projekti.oid), kutsu),
            zipFolder: "Kuulutukset ja kutsut",
          });
        }
      }

      if (onSaameProjekti) {
        const vuorovaikutusSaamePDFt = julkaisu.vuorovaikutusSaamePDFt;
        forEverySaameDo(async (kieli) => {
          assertIsDefined(vuorovaikutusSaamePDFt, "vuorovaikutusSaamePDFt on määritelty tässä vaiheessa");
          const kutsu: LadattuTiedosto | null | undefined = vuorovaikutusSaamePDFt[kieli];
          assertIsDefined(kutsu, `vuorovaikutusSaamePDFt[${kieli}] on oltava olemassa`);
          kutsut.push({
            s3Key: joinPath(getYllapitoPathForProjekti(projekti.oid), kutsu.tiedosto),
            zipFolder: "Kuulutukset ja kutsut",
          });
        });
      }
    }
  }

  //Nähtävilläolovaihe
  const nahtavillaoloVaiheJulkaisut = projekti.nahtavillaoloVaiheJulkaisut;
  if (nahtavillaoloVaiheJulkaisut) {
    for (const nahtavillaoloVaiheJulkaisu of nahtavillaoloVaiheJulkaisut) {
      if (nahtavillaoloVaiheJulkaisu.tila != API.KuulutusJulkaisuTila.HYVAKSYTTY) {
        continue;
      }
      const nahtavillaoloVaiheJulkaisuPDFt = nahtavillaoloVaiheJulkaisu?.nahtavillaoloPDFt;
      assertIsDefined(nahtavillaoloVaiheJulkaisuPDFt, "nahtavillaoloVaiheJulkaisuPDFt on määritelty tässä vaiheessa");
      for (const kieli in API.Kieli) {
        const kuulutus: string | undefined = nahtavillaoloVaiheJulkaisuPDFt[kieli as API.Kieli]?.nahtavillaoloPDFPath;
        if (kuulutus) {
          kutsut.push({
            s3Key: joinPath(getYllapitoPathForProjekti(projekti.oid), kuulutus),
            zipFolder: "Kuulutukset ja kutsut",
          });
        }
        const ilmoitusKiinteistonomistajille: string | undefined =
          nahtavillaoloVaiheJulkaisuPDFt[kieli as API.Kieli]?.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath;
        if (ilmoitusKiinteistonomistajille) {
          kutsut.push({
            s3Key: joinPath(getYllapitoPathForProjekti(projekti.oid), ilmoitusKiinteistonomistajille),
            zipFolder: "Kuulutukset ja kutsut",
          });
        }
      }

      if (onSaameProjekti) {
        forEverySaameDo(async (kieli) => {
          const nahtavillaoloSaamePDFt = nahtavillaoloVaiheJulkaisu?.nahtavillaoloSaamePDFt;
          assertIsDefined(nahtavillaoloSaamePDFt, "nahtavillaoloSaamePDFt on määritelty tässä vaiheessa");
          const kuulutus: LadattuTiedosto | null | undefined = nahtavillaoloSaamePDFt[kieli]?.kuulutusPDF;
          assertIsDefined(kuulutus, `nahtavillaoloSaamePDFt[${kieli}].kuulutusPDF on oltava olemassa`);
          kutsut.push({
            s3Key: joinPath(getYllapitoPathForProjekti(projekti.oid), kuulutus.tiedosto),
            zipFolder: "Kuulutukset ja kutsut",
          });
        });
      }
    }
  }

  return filesToZip;
}
