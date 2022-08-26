import {
  Yhteystieto,
  DBProjekti,
  HyvaksymisPaatosVaihe,
  Hyvaksymispaatos,
  LocalizedMap,
  HyvaksymisPaatosVaihePDF,
  HyvaksymisPaatosVaiheJulkaisu,
} from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";
import { adaptAineistot } from "../commonAdapterUtil/adaptAineistot";
import { adaptYhteystiedot } from "../commonAdapterUtil/adaptYhteystiedot";
import { adaptIlmoituksenVastaanottajat } from "./common";
import { fileService } from "../../files/fileService";
import {
  adaptVelho as lisaaVelhoTypename,
  adaptKielitiedot as lisaaKielitiedotTypename,
} from "../commonAdapterUtil/lisaaTypename";

export function adaptHyvaksymisPaatosVaihe(
  projektiPaallikko: Yhteystieto,
  dbProjekti: DBProjekti,
  hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe,
  hyvaksymisPaatos: Hyvaksymispaatos
): API.HyvaksymisPaatosVaihe {
  if (!hyvaksymisPaatosVaihe) {
    return undefined;
  }
  const {
    aineistoNahtavilla,
    hyvaksymisPaatos: hyvaksymisPaatosAineisto,
    kuulutusYhteystiedot,
    ilmoituksenVastaanottajat,
    hyvaksymisPaatosVaihePDFt,
    ...rest
  } = hyvaksymisPaatosVaihe;
  return {
    __typename: "HyvaksymisPaatosVaihe",
    ...rest,
    hyvaksymisPaatosVaihePDFt: adaptHyvaksymisPaatosVaihePDFPaths(dbProjekti.oid, hyvaksymisPaatosVaihePDFt),
    aineistoNahtavilla: adaptAineistot(aineistoNahtavilla),
    hyvaksymisPaatos: adaptAineistot(hyvaksymisPaatosAineisto),
    kuulutusYhteystiedot: adaptYhteystiedot(projektiPaallikko, kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
    hyvaksymisPaatoksenPvm: hyvaksymisPaatos.paatoksenPvm,
    hyvaksymisPaatoksenAsianumero: hyvaksymisPaatos.asianumero,
  };
}

export function adaptHyvaksymisPaatosVaiheJulkaisut(
  projektiPaallikko: Yhteystieto,
  oid: string,
  hyvaksymisPaatos: Hyvaksymispaatos,
  julkaisut?: HyvaksymisPaatosVaiheJulkaisu[] | null
): API.HyvaksymisPaatosVaiheJulkaisu[] | undefined {
  if (julkaisut) {
    return julkaisut.map((julkaisu) => {
      const {
        aineistoNahtavilla,
        hyvaksymisPaatos: hyvaksymisPaatosAineisto,
        ilmoituksenVastaanottajat,
        kuulutusYhteystiedot,
        hyvaksymisPaatosVaihePDFt,
        kielitiedot,
        velho,
        ...fieldsToCopyAsIs
      } = julkaisu;

      return {
        ...fieldsToCopyAsIs,
        __typename: "HyvaksymisPaatosVaiheJulkaisu",
        kielitiedot: lisaaKielitiedotTypename(kielitiedot),
        hyvaksymisPaatosVaihePDFt: adaptHyvaksymisPaatosVaihePDFPaths(oid, hyvaksymisPaatosVaihePDFt),
        aineistoNahtavilla: adaptAineistot(aineistoNahtavilla),
        hyvaksymisPaatos: adaptAineistot(hyvaksymisPaatosAineisto),
        hyvaksymisPaatoksenPvm: hyvaksymisPaatos.paatoksenPvm,
        hyvaksymisPaatoksenAsianumero: hyvaksymisPaatos.asianumero,
        kuulutusYhteystiedot: adaptYhteystiedot(projektiPaallikko, kuulutusYhteystiedot),
        ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
        velho: lisaaVelhoTypename(velho),
      };
    });
  }
  return undefined;
}

function adaptHyvaksymisPaatosVaihePDFPaths(
  oid: string,
  hyvaksymisPaatosVaihePDFs: LocalizedMap<HyvaksymisPaatosVaihePDF>
): API.HyvaksymisPaatosVaihePDFt | undefined {
  if (!hyvaksymisPaatosVaihePDFs) {
    return undefined;
  }

  const result = {};
  for (const kieli in hyvaksymisPaatosVaihePDFs) {
    result[kieli] = {
      hyvaksymisKuulutusPDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        hyvaksymisPaatosVaihePDFs[kieli].hyvaksymisKuulutusPDFPath
      ),
      hyvaksymisIlmoitusPDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        hyvaksymisPaatosVaihePDFs[kieli].hyvaksymisIlmoitusPDFPath
      ),
      hyvaksymisLahetekirjePDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        hyvaksymisPaatosVaihePDFs[kieli].hyvaksymisIlmoitusKiinteistonOmistajallePDFPath
      ),
      hyvaksymisIlmoitusMuistuttajillePDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        hyvaksymisPaatosVaihePDFs[kieli].hyvaksymisIlmoitusKiinteistonOmistajallePDFPath
      ),
      hyvaksymisIlmoitusLausunnonantajillePDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        hyvaksymisPaatosVaihePDFs[kieli].hyvaksymisIlmoitusKiinteistonOmistajallePDFPath
      ),
    } as HyvaksymisPaatosVaihePDF;
  }
  return { __typename: "HyvaksymisPaatosVaihePDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
}
