import {
  Hyvaksymispaatos,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  HyvaksymisPaatosVaihePDF,
  LocalizedMap,
} from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { KuulutusJulkaisuTila } from "../../../../../common/graphql/apiModel";
import {
  adaptAineistot,
  adaptIlmoituksenVastaanottajat,
  adaptKielitiedotByAddingTypename,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptStandardiYhteystiedotByAddingTypename,
  adaptVelho,
} from "../common";
import { fileService } from "../../../files/fileService";
import { PathTuple } from "../../../files/ProjektiPath";
import { findJulkaisuWithTila } from "../../projektiUtil";

export function adaptHyvaksymisPaatosVaihe(
  hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe | null | undefined,
  hyvaksymisPaatos: Hyvaksymispaatos | null | undefined,
  paths: PathTuple
): API.HyvaksymisPaatosVaihe | undefined {
  if (!hyvaksymisPaatosVaihe) {
    return undefined;
  }
  const {
    aineistoNahtavilla,
    hyvaksymisPaatos: hyvaksymisPaatosAineisto,
    kuulutusYhteystiedot,
    ilmoituksenVastaanottajat,
    ...rest
  } = hyvaksymisPaatosVaihe;

  return {
    __typename: "HyvaksymisPaatosVaihe",
    ...rest,
    aineistoNahtavilla: adaptAineistot(aineistoNahtavilla, paths),
    hyvaksymisPaatos: adaptAineistot(hyvaksymisPaatosAineisto, paths),
    kuulutusYhteystiedot: adaptStandardiYhteystiedotByAddingTypename(kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
    hyvaksymisPaatoksenPvm: hyvaksymisPaatos?.paatoksenPvm || undefined,
    hyvaksymisPaatoksenAsianumero: hyvaksymisPaatos?.asianumero || undefined,
  };
}

export function adaptHyvaksymisPaatosVaiheJulkaisu(
  hyvaksymisPaatos: Hyvaksymispaatos | null | undefined,
  julkaisut: HyvaksymisPaatosVaiheJulkaisu[] | null | undefined,
  getPathCallback: (julkaisu: HyvaksymisPaatosVaiheJulkaisu) => PathTuple
): API.HyvaksymisPaatosVaiheJulkaisu | undefined {
  const julkaisu =
    findJulkaisuWithTila(julkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA) ||
    findJulkaisuWithTila(julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY) ||
    findJulkaisuWithTila(julkaisut, KuulutusJulkaisuTila.MIGROITU);

  if (!julkaisu) {
    return undefined;
  }

  const {
    aineistoNahtavilla,
    hyvaksymisPaatos: hyvaksymisPaatosAineisto,
    ilmoituksenVastaanottajat,
    yhteystiedot,
    hyvaksymisPaatosVaihePDFt,
    kielitiedot,
    velho,
    tila,
    ...fieldsToCopyAsIs
  } = julkaisu;

  if (tila == KuulutusJulkaisuTila.MIGROITU) {
    return { __typename: "HyvaksymisPaatosVaiheJulkaisu", tila, velho: adaptVelho(velho) };
  }

  if (!aineistoNahtavilla) {
    throw new Error("adaptHyvaksymisPaatosVaiheJulkaisut: julkaisu.aineistoNahtavilla määrittelemättä");
  }
  if (!hyvaksymisPaatosVaihePDFt) {
    throw new Error("adaptHyvaksymisPaatosVaiheJulkaisut: julkaisu.hyvaksymisPaatosVaihePDFt määrittelemättä");
  }
  if (!hyvaksymisPaatos) {
    throw new Error("adaptHyvaksymisPaatosVaiheJulkaisut: hyvaksymisPaatos puuttuu");
  }
  if (!hyvaksymisPaatos.paatoksenPvm) {
    throw new Error("adaptHyvaksymisPaatosVaiheJulkaisut: hyvaksymisPaatos.paatoksenPvm määrittelemättä");
  }
  if (!hyvaksymisPaatos.asianumero) {
    throw new Error("adaptHyvaksymisPaatosVaiheJulkaisut: hyvaksymisPaatos.asianumero määrittelemättä");
  }
  if (!ilmoituksenVastaanottajat) {
    throw new Error("adaptHyvaksymisPaatosVaiheJulkaisut: hyvaksymisPaatos.ilmoituksenVastaanottajat määrittelemättä");
  }
  if (!kielitiedot) {
    throw new Error("adaptHyvaksymisPaatosVaiheJulkaisut: hyvaksymisPaatos.kielitiedot määrittelemättä");
  }
  const paths = getPathCallback(julkaisu);
  const apijulkaisu: API.HyvaksymisPaatosVaiheJulkaisu = {
    ...fieldsToCopyAsIs,
    __typename: "HyvaksymisPaatosVaiheJulkaisu",
    kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
    hyvaksymisPaatosVaihePDFt: adaptHyvaksymisPaatosVaihePDFPaths(hyvaksymisPaatosVaihePDFt, paths),
    aineistoNahtavilla: adaptAineistot(aineistoNahtavilla, paths),
    hyvaksymisPaatos: adaptAineistot(hyvaksymisPaatosAineisto, paths),
    hyvaksymisPaatoksenPvm: hyvaksymisPaatos.paatoksenPvm,
    hyvaksymisPaatoksenAsianumero: hyvaksymisPaatos.asianumero,
    yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
    velho: adaptVelho(velho),
    tila,
  };
  return apijulkaisu;
}

function adaptHyvaksymisPaatosVaihePDFPaths(
  hyvaksymisPaatosVaihePDFs: LocalizedMap<HyvaksymisPaatosVaihePDF>,
  paths: PathTuple
): API.HyvaksymisPaatosVaihePDFt | undefined {
  if (!hyvaksymisPaatosVaihePDFs) {
    return undefined;
  }

  const result: Partial<API.HyvaksymisPaatosVaihePDFt> = {};

  function getYllapitoPathForFile(filePath: string): string {
    return fileService.getYllapitoPathForProjektiFile(paths, filePath);
  }

  for (const kieli in hyvaksymisPaatosVaihePDFs) {
    const pdfs = hyvaksymisPaatosVaihePDFs[kieli as API.Kieli];
    if (!pdfs) {
      throw new Error(`adaptHyvaksymisPaatosVaihePDFPaths: hyvaksymisPaatosVaihePDFs[${kieli}] määrittelemättä`);
    }
    result[kieli as API.Kieli] = {
      __typename: "HyvaksymisPaatosVaihePDF",
      ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath: getYllapitoPathForFile(
        pdfs.ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath
      ),
      hyvaksymisKuulutusPDFPath: getYllapitoPathForFile(pdfs.hyvaksymisKuulutusPDFPath),
      hyvaksymisIlmoitusMuistuttajillePDFPath: getYllapitoPathForFile(pdfs.hyvaksymisIlmoitusMuistuttajillePDFPath),
      hyvaksymisIlmoitusLausunnonantajillePDFPath: getYllapitoPathForFile(pdfs.hyvaksymisIlmoitusLausunnonantajillePDFPath),
      ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath: getYllapitoPathForFile(
        pdfs.ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath
      ),
    };
  }
  return { __typename: "HyvaksymisPaatosVaihePDFt", [API.Kieli.SUOMI]: result[API.Kieli.SUOMI] as API.HyvaksymisPaatosVaihePDF, ...result };
}
