import {
  DBProjekti,
  Hyvaksymispaatos,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  HyvaksymisPaatosVaihePDF,
  LocalizedMap,
} from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import {
  adaptAineistot,
  adaptIlmoituksenVastaanottajat,
  adaptKielitiedotByAddingTypename,
  adaptVelhoByAddingTypename,
  adaptYhteystiedotByAddingTypename,
} from "../common";
import { fileService } from "../../../files/fileService";

export function adaptHyvaksymisPaatosVaihe(
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
    kuulutusYhteystiedot: adaptYhteystiedotByAddingTypename(kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
    hyvaksymisPaatoksenPvm: hyvaksymisPaatos.paatoksenPvm,
    hyvaksymisPaatoksenAsianumero: hyvaksymisPaatos.asianumero,
  };
}

export function adaptHyvaksymisPaatosVaiheJulkaisut(
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
        kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
        hyvaksymisPaatosVaihePDFt: adaptHyvaksymisPaatosVaihePDFPaths(oid, hyvaksymisPaatosVaihePDFt),
        aineistoNahtavilla: adaptAineistot(aineistoNahtavilla),
        hyvaksymisPaatos: adaptAineistot(hyvaksymisPaatosAineisto),
        hyvaksymisPaatoksenPvm: hyvaksymisPaatos.paatoksenPvm,
        hyvaksymisPaatoksenAsianumero: hyvaksymisPaatos.asianumero,
        kuulutusYhteystiedot: adaptYhteystiedotByAddingTypename(kuulutusYhteystiedot),
        ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
        velho: adaptVelhoByAddingTypename(velho),
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

  function getYllapitoPathForFile(path: string) {
    return fileService.getYllapitoPathForProjektiFile(oid, path);
  }

  for (const kieli in hyvaksymisPaatosVaihePDFs) {
    const pdfs = hyvaksymisPaatosVaihePDFs[kieli];
    result[kieli] = {
      ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath: getYllapitoPathForFile(
        pdfs.ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath
      ),
      hyvaksymisKuulutusPDFPath: getYllapitoPathForFile(pdfs.hyvaksymisKuulutusPDFPath),
      hyvaksymisIlmoitusMuistuttajillePDFPath: getYllapitoPathForFile(pdfs.hyvaksymisIlmoitusMuistuttajillePDFPath),
      hyvaksymisIlmoitusLausunnonantajillePDFPath: getYllapitoPathForFile(pdfs.hyvaksymisIlmoitusLausunnonantajillePDFPath),
      ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath: getYllapitoPathForFile(
        pdfs.ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath
      ),
    } as HyvaksymisPaatosVaihePDF;
  }
  return { __typename: "HyvaksymisPaatosVaihePDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
}
