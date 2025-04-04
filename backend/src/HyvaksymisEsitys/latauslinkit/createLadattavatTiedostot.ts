import * as API from "hassu-common/graphql/apiModel";
import { ProjektiTiedostoineen } from "../dynamoKutsut";
import { DBEnnakkoNeuvotteluJulkaisu, JulkaistuHyvaksymisEsitys, MuokattavaHyvaksymisEsitys } from "../../database/model";
import collectHyvaksymisEsitysAineistot, { FileInfo } from "../collectHyvaksymisEsitysAineistot";
import { fileService } from "../../files/fileService";

export default async function createLadattavatTiedostot(
  projekti: ProjektiTiedostoineen,
  hyvaksymisEsitys: MuokattavaHyvaksymisEsitys | JulkaistuHyvaksymisEsitys | DBEnnakkoNeuvotteluJulkaisu,
  status: API.Status | undefined
): Promise<
  Pick<
    API.HyvaksymisEsityksenAineistot,
    "hyvaksymisEsitys" | "suunnitelma" | "kuntaMuistutukset" | "lausunnot" | "kuulutuksetJaKutsu" | "muutAineistot" | "maanomistajaluettelo"
  >
> {
  const {
    hyvaksymisEsitys: hyvaksymisEsitysTiedostot,
    suunnitelma,
    kuntaMuistutukset,
    lausunnot,
    kuulutuksetJaKutsu,
    muutAineistot,
    maanomistajaluettelo,
  } = collectHyvaksymisEsitysAineistot(projekti, hyvaksymisEsitys, status, projekti.aineistoHandledAt);

  let filteredKuulutuksetJaKutsu = kuulutuksetJaKutsu;
  if (
    "lahetetty" in hyvaksymisEsitys &&
    "poisValitutKuulutuksetJaKutsu" in hyvaksymisEsitys &&
    Array.isArray(hyvaksymisEsitys.poisValitutKuulutuksetJaKutsu) &&
    hyvaksymisEsitys.poisValitutKuulutuksetJaKutsu.length > 0
  ) {
    const poisvalitutS3Keys = hyvaksymisEsitys.poisValitutKuulutuksetJaKutsu;

    filteredKuulutuksetJaKutsu = kuulutuksetJaKutsu.filter((tiedosto) => {
      return !tiedosto?.s3Key || !poisvalitutS3Keys.includes(tiedosto.s3Key);
    });
  }

  return {
    hyvaksymisEsitys: await Promise.all(hyvaksymisEsitysTiedostot.map(adaptFileInfoToLadattavaTiedosto)),
    suunnitelma: await Promise.all(suunnitelma.map(adaptFileInfoToLadattavaTiedosto)),
    kuntaMuistutukset: await Promise.all(kuntaMuistutukset.map(adaptFileInfoToKunnallinenLadattavaTiedosto)),
    lausunnot: await Promise.all(lausunnot.map(adaptFileInfoToLadattavaTiedosto)),
    kuulutuksetJaKutsu: await Promise.all(filteredKuulutuksetJaKutsu.map(adaptFileInfoToLadattavaTiedosto)),
    muutAineistot: await Promise.all(muutAineistot.map(adaptFileInfoToLadattavaTiedosto)),
    maanomistajaluettelo: await Promise.all(maanomistajaluettelo.map(adaptFileInfoToLadattavaTiedosto)),
  };
}

export async function adaptFileInfoToLadattavaTiedosto(fileInfo: FileInfo): Promise<API.LadattavaTiedosto> {
  let linkki;
  if (fileInfo.valmis) {
    linkki = await fileService.createSignedDownloadLink(fileInfo.s3Key);
  } else {
    linkki = "";
  }
  return {
    __typename: "LadattavaTiedosto",
    nimi: fileInfo.nimi,
    linkki,
    kategoriaId: fileInfo.kategoriaId,
    tuotu: fileInfo.tuotu,
    s3Key: fileInfo.s3Key,
  };
}
export async function adaptFileInfoToKunnallinenLadattavaTiedosto(fileInfo: FileInfo): Promise<API.KunnallinenLadattavaTiedosto> {
  let linkki;
  if (fileInfo.valmis) {
    linkki = await fileService.createSignedDownloadLink(fileInfo.s3Key);
  } else {
    linkki = "";
  }
  return { __typename: "KunnallinenLadattavaTiedosto", nimi: fileInfo.nimi, linkki, tuotu: fileInfo.tuotu, kunta: fileInfo.kunta };
}
