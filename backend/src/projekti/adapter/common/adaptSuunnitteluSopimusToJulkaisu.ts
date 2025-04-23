import { DBVaylaUser, LocalizedMap, SuunnitteluSopimus, SuunnitteluSopimusJulkaisu } from "../../../database/model";
import { fileService } from "../../../files/fileService";
import { ProjektiPaths } from "../../../files/ProjektiPath";

export function adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(
  oid: string,
  suunnitteluSopimus: SuunnitteluSopimus | null | undefined,
  yhteysHenkilo?: DBVaylaUser | undefined
): SuunnitteluSopimusJulkaisu | undefined | null {
  if (suunnitteluSopimus) {
    const valitutHenkilot =
      suunnitteluSopimus.osapuolet?.flatMap((osapuoli) => osapuoli.osapuolenHenkilot?.filter((henkilo) => henkilo?.valittu) || []) || [];

    let etunimi = "";
    let sukunimi = "";
    let email = "";
    let puhelinnumero = "";

    if (valitutHenkilot.length > 0) {
      etunimi = valitutHenkilot[0].etunimi || "";
      sukunimi = valitutHenkilot[0].sukunimi || "";
      email = valitutHenkilot[0].email || "";
      puhelinnumero = valitutHenkilot[0].puhelinnumero || "";
    } else {
      etunimi = yhteysHenkilo?.etunimi ?? "";
      sukunimi = yhteysHenkilo?.sukunimi ?? "";
      email = yhteysHenkilo?.email ?? "";
      puhelinnumero = yhteysHenkilo?.puhelinnumero ?? "";
    }

    return {
      kunta: suunnitteluSopimus.kunta,
      logo: suunnitteluSopimus.logo ? adaptLogot(oid, suunnitteluSopimus.logo) : null,
      etunimi,
      sukunimi,
      email,
      puhelinnumero,
      osapuolet:
        suunnitteluSopimus.osapuolet?.map((osapuoli) => ({
          osapuolenNimiEnsisijainen: osapuoli.osapuolenNimiEnsisijainen || "",
          osapuolenNimiToissijainen: osapuoli.osapuolenNimiToissijainen || "",
          osapuolenTyyppi: osapuoli.osapuolenTyyppi || "",
          osapuolenLogo: osapuoli.osapuolenLogo ? adaptLogot(oid, osapuoli.osapuolenLogo) : null,
          osapuolenHenkilot:
            osapuoli.osapuolenHenkilot
              ?.filter((henkilo) => henkilo.valittu)
              .map((henkilo) => ({
                etunimi: henkilo.etunimi || "",
                sukunimi: henkilo.sukunimi || "",
                puhelinnumero: henkilo.puhelinnumero || "",
                email: henkilo.email || "",
                yritys: henkilo.yritys || "",
              })) || [],
        })) || null,
    };
  }
  return suunnitteluSopimus;
}

function adaptLogot(oid: string, logot: LocalizedMap<string> | undefined): LocalizedMap<string> | undefined {
  if (logot) {
    if (!logot.SUOMI && !logot.RUOTSI) {
      throw new Error("adaptLogot: logot määrittelemättä");
    }

    return {
      SUOMI: logot.SUOMI ? "/" + fileService.getYllapitoPathForProjektiFile(new ProjektiPaths(oid), logot.SUOMI) : "",
      RUOTSI: logot.RUOTSI ? "/" + fileService.getYllapitoPathForProjektiFile(new ProjektiPaths(oid), logot.RUOTSI) : undefined,
    };
  }
  return logot as undefined;
}
