import { DBVaylaUser, LocalizedMap, SuunnitteluSopimus, SuunnitteluSopimusJulkaisu } from "../../../database/model";
import { fileService } from "../../../files/fileService";
import { ProjektiPaths } from "../../../files/ProjektiPath";

export function adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(
  oid: string,
  suunnitteluSopimus: SuunnitteluSopimus | null | undefined,
  yhteysHenkilo: DBVaylaUser | undefined
): SuunnitteluSopimusJulkaisu | undefined | null {
  if (suunnitteluSopimus) {
    if (!suunnitteluSopimus.logo) {
      throw new Error("adaptSuunnitteluSopimus: suunnitteluSopimus.logo määrittelemättä");
    }

    return {
      kunta: suunnitteluSopimus.kunta,
      logo: adaptLogot(oid, suunnitteluSopimus.logo),
      etunimi: yhteysHenkilo?.etunimi ?? "",
      sukunimi: yhteysHenkilo?.sukunimi ?? "",
      email: yhteysHenkilo?.email ?? "",
      puhelinnumero: yhteysHenkilo?.puhelinnumero ?? "",
      osapuolet:
        suunnitteluSopimus.osapuolet?.map((osapuoli) => ({
          osapuolenNimiEnsisijainen: osapuoli.osapuolenNimiEnsisijainen,
          osapuolenNimiToissijainen: osapuoli.osapuolenNimiToissijainen,
          osapuolenTyyppi: osapuoli.osapuolenTyyppi,
          osapuolenHenkilot: osapuoli.osapuolenHenkilot || [],
        })) || undefined,
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
