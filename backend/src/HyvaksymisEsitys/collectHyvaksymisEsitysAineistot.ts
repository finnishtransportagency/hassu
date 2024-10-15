import * as API from "hassu-common/graphql/apiModel";
import { assertIsDefined } from "../util/assertions";
import {
  Aineisto,
  DBEnnakkoNeuvotteluJulkaisu,
  DBProjekti,
  JulkaistuHyvaksymisEsitys,
  LadattuTiedosto,
  MuokattavaHyvaksymisEsitys,
} from "../database/model";
import {
  JULKAISTU_HYVAKSYMISESITYS_PATH,
  MUOKATTAVA_HYVAKSYMISESITYS_PATH,
  adaptFileName,
  getSisaisetPathForProjekti,
  getYllapitoPathForProjekti,
  joinPath,
} from "../tiedostot/paths";
import { forEverySaameDo } from "../projekti/adapter/common";
import { kuntametadata } from "hassu-common/kuntametadata";
import { fileService } from "../files/fileService";
import { getZipFolder } from "../tiedostot/ProjektiTiedostoManager/util";
import { aineistoNewIsReady } from "./aineistoNewIsReady";
import { ENNAKKONEUVOTTELU_JULKAISU_PATH } from "../ennakkoneuvottelu/tallenna";

type TarvittavatTiedot = Pick<
  DBProjekti,
  "oid" | "kielitiedot" | "aloitusKuulutusJulkaisut" | "vuorovaikutusKierrosJulkaisut" | "nahtavillaoloVaiheJulkaisut" | "velho"
>;

export type FileInfo = {
  s3Key: string;
  zipFolder?: string | undefined;
  nimi: string;
  valmis: boolean;
  tuotu?: string | undefined | null;
  kunta?: number | null;
  kategoriaId?: string | null;
};

type ProjektinAineistot = {
  hyvaksymisEsitys: FileInfo[];
  suunnitelma: FileInfo[];
  kuntaMuistutukset: FileInfo[];
  lausunnot: FileInfo[];
  kuulutuksetJaKutsu: FileInfo[];
  muutAineistot: FileInfo[];
  maanomistajaluettelo: FileInfo[];
};

/**
 *
 * @param projekti DBProjekti
 * @param hyvaksymisEsitys hyväksymisesitys, josta tahdotaan ottaa tiedostoja kokoelmaan
 * @param aineistoHandledAt projektin aineistoHandledAt-arvo
 * @returns {ProjektinAineistot} Kokoelmatiedot hyväksymisesityksen kannalta relevanteista projektin tiedostoista zippausta tai linkin katselua/esikatselua varten
 */
export default function collectHyvaksymisEsitysAineistot(
  projekti: TarvittavatTiedot,
  hyvaksymisEsitys: MuokattavaHyvaksymisEsitys | JulkaistuHyvaksymisEsitys | DBEnnakkoNeuvotteluJulkaisu,
  aineistoHandledAt?: string | null
): ProjektinAineistot {
  let path: string;
  let hyvaksymisEsitysTiedostot: FileInfo[] = [];
  if ("hyvaksymisEsitys" in hyvaksymisEsitys) {
    path = joinPath(
      getYllapitoPathForProjekti(projekti.oid),
      (hyvaksymisEsitys as JulkaistuHyvaksymisEsitys).hyvaksymisPaiva ? JULKAISTU_HYVAKSYMISESITYS_PATH : MUOKATTAVA_HYVAKSYMISESITYS_PATH
    );
    hyvaksymisEsitysTiedostot = (hyvaksymisEsitys?.hyvaksymisEsitys ?? []).map((tiedosto) => ({
      s3Key: joinPath(path, "hyvaksymisEsitys", adaptFileName(tiedosto.nimi)),
      zipFolder: "Hyväksymisesitys",
      nimi: tiedosto.nimi,
      tuotu: tiedosto.lisatty,
      valmis: true,
    }));
  } else {
    path = joinPath(getYllapitoPathForProjekti(projekti.oid), ENNAKKONEUVOTTELU_JULKAISU_PATH);
  }

  const kuulutuksetJaKutsutOmaltaKoneelta = (hyvaksymisEsitys?.kuulutuksetJaKutsu ?? []).map((tiedosto) => ({
    s3Key: joinPath(path, "kuulutuksetJaKutsu", adaptFileName(tiedosto.nimi)),
    zipFolder: "Kuulutukset ja kutsut",
    nimi: tiedosto.nimi,
    tuotu: tiedosto.lisatty,
    valmis: true,
  }));

  const kuulutuksetJaKutsutProjektista = getKutsut(projekti);
  const kuulutuksetJaKutsu: FileInfo[] = kuulutuksetJaKutsutProjektista.concat(kuulutuksetJaKutsutOmaltaKoneelta);

  const muuAineistoOmaltaKoneelta = (hyvaksymisEsitys?.muuAineistoKoneelta ?? []).map((tiedosto) => ({
    s3Key: joinPath(path, "muuAineistoKoneelta", adaptFileName(tiedosto.nimi)),
    zipFolder: "Muu aineisto",
    nimi: tiedosto.nimi,
    tuotu: tiedosto.lisatty,
    valmis: true,
  }));
  const muuAineistoVelhosta = (hyvaksymisEsitys?.muuAineistoVelhosta ?? []).map((aineisto) => ({
    s3Key: joinPath(path, "muuAineistoVelhosta", adaptFileName(aineisto.nimi)),
    zipFolder: "Muu aineisto",
    nimi: aineisto.nimi,
    tuotu: aineisto.lisatty,
    valmis: aineistoNewIsReady(aineisto, aineistoHandledAt),
  }));
  const muutAineistot: FileInfo[] = muuAineistoOmaltaKoneelta.concat(muuAineistoVelhosta);
  const suunnitelma = (hyvaksymisEsitys?.suunnitelma ?? []).map<FileInfo>((aineisto) => {
    const kategoriaFolder = getZipFolder(aineisto.kategoriaId, projekti.velho?.tyyppi) ?? "Kategorisoimattomat";
    return {
      s3Key: joinPath(path, "suunnitelma", adaptFileName(aineisto.nimi)),
      zipFolder: joinPath("Suunnitelma", kategoriaFolder),
      nimi: aineisto.nimi,
      tuotu: aineisto.lisatty,
      kategoriaId: aineisto.kategoriaId,
      valmis: aineistoNewIsReady(aineisto, aineistoHandledAt),
    };
  });
  const kuntaMuistutukset = (hyvaksymisEsitys?.muistutukset ?? []).map((tiedosto) => {
    const kunta = kuntametadata.kuntaForKuntaId(tiedosto.kunta);
    assertIsDefined(kunta, `Kuntaa id:llä ${tiedosto.kunta} ei löytynyt kuntametadatasta`);
    return {
      s3Key: joinPath(path, "muistutukset", adaptFileName(tiedosto.nimi)),
      zipFolder: `Muistutukset/${kunta.nimi.SUOMI}`,
      nimi: tiedosto.nimi,
      tuotu: tiedosto.lisatty,
      kunta: tiedosto.kunta,
      valmis: true,
    };
  });
  const maanomistajaluetteloProjektista = getMaanomistajaLuettelo(projekti);
  const maanomistajaluetteloOmaltaKoneelta: FileInfo[] = (hyvaksymisEsitys?.maanomistajaluettelo ?? []).map((tiedosto) => ({
    s3Key: joinPath(path, "maanomistajaluettelo", adaptFileName(tiedosto.nimi)),
    zipFolder: "Maanomistajaluettelo",
    nimi: tiedosto.nimi,
    tuotu: tiedosto.lisatty,
    valmis: true,
  }));
  const maanomistajaluettelo = maanomistajaluetteloProjektista.concat(maanomistajaluetteloOmaltaKoneelta);
  const lausunnot = (hyvaksymisEsitys?.lausunnot ?? []).map((tiedosto) => ({
    s3Key: joinPath(path, "lausunnot", adaptFileName(tiedosto.nimi)),
    zipFolder: "Lausunnot",
    nimi: tiedosto.nimi,
    tuotu: tiedosto.lisatty,
    valmis: true,
  }));

  return {
    hyvaksymisEsitys: hyvaksymisEsitysTiedostot,
    kuulutuksetJaKutsu,
    muutAineistot,
    suunnitelma,
    kuntaMuistutukset,
    maanomistajaluettelo,
    lausunnot,
  };
}

function tiedostoVanhaIsReady(aineisto: Aineisto | LadattuTiedosto): boolean {
  return aineisto.tila == API.AineistoTila.VALMIS;
}

export function getMaanomistajaLuettelo(projekti: TarvittavatTiedot): FileInfo[] {
  const maanomistajaluttelo: FileInfo[] = [];
  //Nähtävilläolovaihe
  const nahtavillaoloVaiheJulkaisut = projekti.nahtavillaoloVaiheJulkaisut;
  if (nahtavillaoloVaiheJulkaisut) {
    for (const nahtavillaoloVaiheJulkaisu of nahtavillaoloVaiheJulkaisut) {
      if (nahtavillaoloVaiheJulkaisu.tila != API.KuulutusJulkaisuTila.HYVAKSYTTY) {
        continue;
      }

      if (nahtavillaoloVaiheJulkaisu.maanomistajaluettelo) {
        maanomistajaluttelo.push({
          s3Key: joinPath(getSisaisetPathForProjekti(projekti.oid), nahtavillaoloVaiheJulkaisu.maanomistajaluettelo),
          zipFolder: "Maanomistajaluttelo",
          nimi: fileService.getFileNameFromFilePath(nahtavillaoloVaiheJulkaisu.maanomistajaluettelo),
          valmis: true,
        });
      }
    }
  }
  return maanomistajaluttelo;
}

export function getKutsut(projekti: TarvittavatTiedot): FileInfo[] {
  const onSaameProjekti =
    projekti.kielitiedot?.ensisijainenKieli == API.Kieli.POHJOISSAAME || projekti.kielitiedot?.toissijainenKieli == API.Kieli.POHJOISSAAME;
  const kutsut: FileInfo[] = [];
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
            nimi: fileService.getFileNameFromFilePath(kuulutus),
            valmis: true,
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
            nimi: kuulutus.nimi ?? fileService.getFileNameFromFilePath(kuulutus.tiedosto),
            tuotu: kuulutus.tuotu,
            valmis: tiedostoVanhaIsReady(kuulutus),
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
            nimi: fileService.getFileNameFromFilePath(kutsu),
            valmis: true,
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
            nimi: kutsu.nimi ?? fileService.getFileNameFromFilePath(kutsu.tiedosto),
            tuotu: kutsu.tuotu,
            valmis: tiedostoVanhaIsReady(kutsu),
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
            nimi: fileService.getFileNameFromFilePath(kuulutus),
            valmis: true,
          });
        }
        const ilmoitusKiinteistonomistajille: string | undefined =
          nahtavillaoloVaiheJulkaisuPDFt[kieli as API.Kieli]?.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath;
        if (ilmoitusKiinteistonomistajille) {
          kutsut.push({
            s3Key: joinPath(getYllapitoPathForProjekti(projekti.oid), ilmoitusKiinteistonomistajille),
            zipFolder: "Kuulutukset ja kutsut",
            nimi: fileService.getFileNameFromFilePath(ilmoitusKiinteistonomistajille),
            valmis: true,
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
            nimi: kuulutus.nimi ?? fileService.getFileNameFromFilePath(kuulutus.tiedosto),
            tuotu: kuulutus.tuotu,
            valmis: tiedostoVanhaIsReady(kuulutus),
          });
        });
      }
    }
  }

  return kutsut;
}
