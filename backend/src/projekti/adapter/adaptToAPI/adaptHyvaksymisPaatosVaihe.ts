import {
  DBProjekti,
  DBVaylaUser,
  Hyvaksymispaatos,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  HyvaksymisPaatosVaihePDF,
  LocalizedMap,
} from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import {
  adaptAineistot,
  adaptIlmoituksenVastaanottajat,
  adaptKielitiedotByAddingTypename,
  adaptMandatoryStandardiYhteystiedotByAddingTypename,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptStandardiYhteystiedotByAddingTypename,
  adaptVelho,
} from "../common";
import { fileService } from "../../../files/fileService";
import { PathTuple } from "../../../files/ProjektiPath";
import { adaptMuokkausTila, findJulkaisuWithTila } from "../../projektiUtil";
import { adaptUudelleenKuulutus, adaptKuulutusSaamePDFt, adaptAineistoMuokkaus } from ".";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { getAsianhallintaSynchronizationStatus } from "../common/adaptAsianhallinta";

export function adaptHyvaksymisPaatosVaihe(
  kayttoOikeudet: DBVaylaUser[],
  hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe | null | undefined,
  hyvaksymisPaatos: Hyvaksymispaatos | null | undefined,
  paths: PathTuple,
  hyvaksymisPaatosVaiheJulkaisut: HyvaksymisPaatosVaiheJulkaisu[] | null | undefined
): API.HyvaksymisPaatosVaihe | undefined {
  if (!hyvaksymisPaatosVaihe) {
    return undefined;
  }
  const {
    aineistoNahtavilla,
    hyvaksymisPaatos: hyvaksymisPaatosAineisto,
    kuulutusYhteystiedot,
    ilmoituksenVastaanottajat,
    uudelleenKuulutus,
    aineistoMuokkaus,
    hyvaksymisPaatosVaiheSaamePDFt,
    ...rest
  } = hyvaksymisPaatosVaihe;

  return {
    __typename: "HyvaksymisPaatosVaihe",
    ...rest,
    aineistoNahtavilla: adaptAineistot(aineistoNahtavilla, paths),
    hyvaksymisPaatos: adaptAineistot(hyvaksymisPaatosAineisto, paths),
    hyvaksymisPaatosVaiheSaamePDFt: adaptKuulutusSaamePDFt(paths, hyvaksymisPaatosVaiheSaamePDFt, false),
    kuulutusYhteystiedot: adaptStandardiYhteystiedotByAddingTypename(kayttoOikeudet, kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
    hyvaksymisPaatoksenPvm: hyvaksymisPaatos?.paatoksenPvm ?? undefined,
    hyvaksymisPaatoksenAsianumero: hyvaksymisPaatos?.asianumero ?? undefined,
    muokkausTila: adaptMuokkausTila(hyvaksymisPaatosVaihe, hyvaksymisPaatosVaiheJulkaisut),
    uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
    aineistoMuokkaus: adaptAineistoMuokkaus(aineistoMuokkaus),
  };
}

export function adaptHyvaksymisPaatosVaiheJulkaisu(
  projekti: DBProjekti,
  hyvaksymisPaatos: Hyvaksymispaatos | null | undefined,
  julkaisut: HyvaksymisPaatosVaiheJulkaisu[] | null | undefined,
  getPathCallback: (julkaisu: HyvaksymisPaatosVaiheJulkaisu) => PathTuple
): API.HyvaksymisPaatosVaiheJulkaisu | undefined {
  const julkaisu =
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA) ??
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.HYVAKSYTTY) ??
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.PERUUTETTU) ??
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.MIGROITU);

  if (!julkaisu) {
    return undefined;
  }

  const {
    aineistoNahtavilla,
    hyvaksymisPaatos: hyvaksymisPaatosAineisto,
    ilmoituksenVastaanottajat,
    yhteystiedot,
    kuulutusYhteystiedot,
    hyvaksymisPaatosVaihePDFt,
    hyvaksymisPaatosVaiheSaamePDFt,
    kielitiedot,
    velho,
    tila,
    uudelleenKuulutus,
    aineistoMuokkaus,
    asianhallintaEventId,
    ...fieldsToCopyAsIs
  } = julkaisu;

  if (tila == API.KuulutusJulkaisuTila.MIGROITU) {
    return {
      __typename: "HyvaksymisPaatosVaiheJulkaisu",
      kuulutusYhteystiedot: adaptMandatoryStandardiYhteystiedotByAddingTypename(projekti.kayttoOikeudet, kuulutusYhteystiedot),
      yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
      tila,
      velho: adaptVelho(velho),
    };
  }

  if (!aineistoNahtavilla) {
    throw new Error("adaptHyvaksymisPaatosVaiheJulkaisut: julkaisu.aineistoNahtavilla määrittelemättä");
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
  const apiJulkaisu: API.HyvaksymisPaatosVaiheJulkaisu = {
    ...fieldsToCopyAsIs,
    __typename: "HyvaksymisPaatosVaiheJulkaisu",
    kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
    hyvaksymisPaatosVaihePDFt: adaptHyvaksymisPaatosVaihePDFPaths(hyvaksymisPaatosVaihePDFt, paths),
    hyvaksymisPaatosVaiheSaamePDFt: adaptKuulutusSaamePDFt(paths, hyvaksymisPaatosVaiheSaamePDFt, false),
    aineistoNahtavilla: adaptAineistot(aineistoNahtavilla, paths),
    hyvaksymisPaatos: adaptAineistot(hyvaksymisPaatosAineisto, paths),
    hyvaksymisPaatoksenPvm: hyvaksymisPaatos.paatoksenPvm,
    hyvaksymisPaatoksenAsianumero: hyvaksymisPaatos.asianumero,
    yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
    kuulutusYhteystiedot: adaptMandatoryStandardiYhteystiedotByAddingTypename(projekti.kayttoOikeudet, kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
    velho: adaptVelho(velho),
    tila,
    uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
    aineistoMuokkaus: adaptAineistoMuokkaus(aineistoMuokkaus),
    asianhallintaSynkronointiTila: getAsianhallintaSynchronizationStatus(projekti.synkronoinnit, asianhallintaEventId),
  };
  return apiJulkaisu;
}

function adaptHyvaksymisPaatosVaihePDFPaths(
  hyvaksymisPaatosVaihePDFs: LocalizedMap<HyvaksymisPaatosVaihePDF> | undefined,
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
    const pdfs = hyvaksymisPaatosVaihePDFs[kieli as KaannettavaKieli];
    if (!pdfs) {
      throw new Error(`adaptHyvaksymisPaatosVaihePDFPaths: hyvaksymisPaatosVaihePDFs[${kieli}] määrittelemättä`);
    }
    result[kieli as KaannettavaKieli] = {
      __typename: "HyvaksymisPaatosVaihePDF",
      ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath: getYllapitoPathForFile(
        pdfs.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath
      ),
      hyvaksymisKuulutusPDFPath: getYllapitoPathForFile(pdfs.hyvaksymisKuulutusPDFPath),
      hyvaksymisIlmoitusMuistuttajillePDFPath: pdfs.hyvaksymisIlmoitusMuistuttajillePDFPath
        ? getYllapitoPathForFile(pdfs.hyvaksymisIlmoitusMuistuttajillePDFPath)
        : undefined,
      hyvaksymisIlmoitusLausunnonantajillePDFPath: getYllapitoPathForFile(pdfs.hyvaksymisIlmoitusLausunnonantajillePDFPath),
      ilmoitusHyvaksymispaatoskuulutuksestaPDFPath: getYllapitoPathForFile(pdfs.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath),
    };
  }
  return { __typename: "HyvaksymisPaatosVaihePDFt", [API.Kieli.SUOMI]: result[API.Kieli.SUOMI] as API.HyvaksymisPaatosVaihePDF, ...result };
}
