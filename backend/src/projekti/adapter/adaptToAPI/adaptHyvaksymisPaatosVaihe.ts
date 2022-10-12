import {
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
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptStandardiYhteystiedotByAddingTypename,
} from "../common";
import { fileService } from "../../../files/fileService";

export function adaptHyvaksymisPaatosVaihe(
  hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe | null | undefined,
  hyvaksymisPaatos: Hyvaksymispaatos | null | undefined
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
    aineistoNahtavilla: adaptAineistot(aineistoNahtavilla),
    hyvaksymisPaatos: adaptAineistot(hyvaksymisPaatosAineisto),
    kuulutusYhteystiedot: adaptStandardiYhteystiedotByAddingTypename(kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
    hyvaksymisPaatoksenPvm: hyvaksymisPaatos?.paatoksenPvm || undefined,
    hyvaksymisPaatoksenAsianumero: hyvaksymisPaatos?.asianumero || undefined,
  };
}

export function adaptHyvaksymisPaatosVaiheJulkaisut(
  oid: string,
  hyvaksymisPaatos: Hyvaksymispaatos | null | undefined,
  julkaisut?: HyvaksymisPaatosVaiheJulkaisu[] | null | undefined
): API.HyvaksymisPaatosVaiheJulkaisu[] | undefined {
  if (julkaisut) {
    return julkaisut.map((julkaisu) => {
      const {
        aineistoNahtavilla,
        hyvaksymisPaatos: hyvaksymisPaatosAineisto,
        ilmoituksenVastaanottajat,
        yhteystiedot,
        hyvaksymisPaatosVaihePDFt,
        kielitiedot,
        velho,
        ...fieldsToCopyAsIs
      } = julkaisu;

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

      const apijulkaisu: API.HyvaksymisPaatosVaiheJulkaisu = {
        ...fieldsToCopyAsIs,
        __typename: "HyvaksymisPaatosVaiheJulkaisu",
        kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
        hyvaksymisPaatosVaihePDFt: adaptHyvaksymisPaatosVaihePDFPaths(oid, hyvaksymisPaatosVaihePDFt),
        aineistoNahtavilla: adaptAineistot(aineistoNahtavilla),
        hyvaksymisPaatos: adaptAineistot(hyvaksymisPaatosAineisto),
        hyvaksymisPaatoksenPvm: hyvaksymisPaatos.paatoksenPvm,
        hyvaksymisPaatoksenAsianumero: hyvaksymisPaatos.asianumero,
        yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
        ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
        velho: adaptVelhoByAddingTypename(velho),
      };
      return apijulkaisu;
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

  const result: Partial<API.HyvaksymisPaatosVaihePDFt> = {};

  function getYllapitoPathForFile(path: string): string {
    // getYllapitoPathForProjektiFile palauttaa stringin, koska oid ja path on määritelty
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return fileService.getYllapitoPathForProjektiFile(oid, path);
  }

  for (const kieli in hyvaksymisPaatosVaihePDFs) {
    const pdfs = hyvaksymisPaatosVaihePDFs[kieli as API.Kieli];
    if (!pdfs) {
      throw new Error(`adaptHyvaksymisPaatosVaihePDFPaths: hyvaksymisPaatosVaihePDFs[${kieli}] määrittelemättä`);
    }
    const hyvaksymisPaatosVaihePdf: API.HyvaksymisPaatosVaihePDF = {
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
    result[kieli as API.Kieli] = hyvaksymisPaatosVaihePdf;
  }
  return { __typename: "HyvaksymisPaatosVaihePDFt", [API.Kieli.SUOMI]: result[API.Kieli.SUOMI] as API.HyvaksymisPaatosVaihePDF, ...result };
}
