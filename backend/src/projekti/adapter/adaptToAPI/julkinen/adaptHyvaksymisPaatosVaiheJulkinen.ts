import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti, HyvaksymisPaatosVaiheJulkaisu, Hyvaksymispaatos } from "../../../../database/model";
import { PathTuple } from "../../../../files/ProjektiPath";
import { HyvaksymisPaatosVaiheScheduleManager } from "../../../../sqsEvents/projektiScheduleManager";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { findPublishedKuulutusJulkaisu } from "../../common";
import {
  adaptAineistotJulkinen,
  adaptKielitiedotByAddingTypename,
  adaptKuulutusSaamePDFtToAPI,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptUudelleenKuulutusJulkinen,
  adaptVelhoJulkinen,
} from "..";
import {
  HyvaksymisPaatosVaiheKutsuAdapter,
  createHyvaksymisPaatosVaiheKutsuAdapterProps,
} from "../../../../asiakirja/adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import { isProjektiAsianhallintaIntegrationEnabled } from "../../../../util/isProjektiAsianhallintaIntegrationEnabled";
import { getLinkkiAsianhallintaan } from "../../../../asianhallinta/getLinkkiAsianhallintaan";
import { fileService } from "../../../../files/fileService";

export async function adaptHyvaksymisPaatosVaiheJulkinen(
  dbProjekti: DBProjekti,
  paatosVaiheJulkaisut: HyvaksymisPaatosVaiheJulkaisu[] | undefined | null,
  hyvaksymispaatos: Hyvaksymispaatos | undefined | null,
  getPathCallback: (julkaisu: HyvaksymisPaatosVaiheJulkaisu) => PathTuple,
  paatosVaiheAineisto: HyvaksymisPaatosVaiheScheduleManager,
  paatosTyyppi: PaatosTyyppi,
  kieli?: KaannettavaKieli
): Promise<API.HyvaksymisPaatosVaiheJulkaisuJulkinen | undefined> {
  const julkaisu = findPublishedKuulutusJulkaisu(paatosVaiheJulkaisut);
  if (!julkaisu) {
    return undefined;
  }
  const {
    hyvaksymisPaatos,
    aineistoNahtavilla,
    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    yhteystiedot,
    velho,
    kielitiedot,
    hallintoOikeus,
    tila,
    uudelleenKuulutus,
    kopioituToiseltaProjektilta,
  } = julkaisu;

  if (tila == API.KuulutusJulkaisuTila.MIGROITU) {
    return {
      __typename: "HyvaksymisPaatosVaiheJulkaisuJulkinen",
      tila,
      yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
      velho: adaptVelhoJulkinen(velho),
      kopioituToiseltaProjektilta,
    };
  }

  if (!hyvaksymispaatos) {
    throw new Error("adaptHyvaksymisPaatosVaihe: dbProjekti.kasittelynTila?.hyvaksymispaatos määrittelemättä");
  }
  if (!hyvaksymispaatos.paatoksenPvm) {
    throw new Error("adaptHyvaksymisPaatosVaihe: dbProjekti.kasittelynTila?.hyvaksymispaatos.paatoksenPvm määrittelemättä");
  }
  if (!hyvaksymispaatos.asianumero) {
    throw new Error("adaptHyvaksymisPaatosVaihe: dbProjekti.kasittelynTila?.hyvaksymispaatos.asianumero määrittelemättä");
  }
  if (!hyvaksymisPaatos) {
    throw new Error("adaptHyvaksymisPaatosVaihe: julkaisu.hyvaksymisPaatos määrittelemättä");
  }
  if (!yhteystiedot) {
    throw new Error("adaptHyvaksymisPaatosVaihe: julkaisu.yhteystiedot määrittelemättä");
  }
  const paths = getPathCallback(julkaisu);

  let apiHyvaksymisPaatosAineisto: API.Aineisto[] | undefined = undefined;
  let apiAineistoNahtavilla: API.Aineisto[] | undefined = undefined;
  if (paatosVaiheAineisto.isAineistoVisible(julkaisu)) {
    apiHyvaksymisPaatosAineisto = adaptAineistotJulkinen(hyvaksymisPaatos, paths);
    apiAineistoNahtavilla = adaptAineistotJulkinen(aineistoNahtavilla, paths);
  }

  const julkaisuJulkinen: API.HyvaksymisPaatosVaiheJulkaisuJulkinen = {
    __typename: "HyvaksymisPaatosVaiheJulkaisuJulkinen",
    hyvaksymisPaatos: apiHyvaksymisPaatosAineisto,
    hyvaksymisPaatoksenPvm: hyvaksymispaatos.paatoksenPvm,
    hyvaksymisPaatoksenAsianumero: hyvaksymispaatos.asianumero,
    aineistoNahtavilla: apiAineistoNahtavilla,
    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
    velho: adaptVelhoJulkinen(velho),
    kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
    hallintoOikeus,
    tila,
    uudelleenKuulutus: adaptUudelleenKuulutusJulkinen(uudelleenKuulutus),
    kuulutusPDF: adaptHyvaksymispaatosPDFPaths(paths, julkaisu),
    hyvaksymisPaatosVaiheSaamePDFt: adaptKuulutusSaamePDFtToAPI(paths, julkaisu.hyvaksymisPaatosVaiheSaamePDFt, true),
    kopioituToiseltaProjektilta,
  };

  if (kieli) {
    julkaisuJulkinen.kuulutusTekstit = new HyvaksymisPaatosVaiheKutsuAdapter(
      createHyvaksymisPaatosVaiheKutsuAdapterProps(
        dbProjekti,
        kieli,
        julkaisu,
        paatosTyyppi,
        await isProjektiAsianhallintaIntegrationEnabled(dbProjekti),
        await getLinkkiAsianhallintaan(dbProjekti)
      )
    ).userInterfaceFields;
  }
  return julkaisuJulkinen;
}

function adaptHyvaksymispaatosPDFPaths(
  projektiPath: PathTuple,
  hyvaksymispaatos: HyvaksymisPaatosVaiheJulkaisu
): API.KuulutusPDFJulkinen | undefined {
  if (!hyvaksymispaatos.hyvaksymisPaatosVaihePDFt) {
    return undefined;
  }
  const { SUOMI: suomiPDFs, ...hyvaksymispdfs } = hyvaksymispaatos.hyvaksymisPaatosVaihePDFt || {};

  if (!suomiPDFs) {
    throw new Error(`adaptHyvaksymispaatosPDFPaths: hyvaksymispaatos.${API.Kieli.SUOMI} määrittelemättä`);
  }

  const result: API.KuulutusPDFJulkinen = {
    __typename: "KuulutusPDFJulkinen",
    SUOMI: fileService.getPublicPathForProjektiFile(projektiPath, suomiPDFs.hyvaksymisKuulutusPDFPath),
  };

  for (const k in hyvaksymispdfs) {
    const kieli = k as API.Kieli.RUOTSI;
    const pdfs = hyvaksymispdfs[kieli];
    if (pdfs) {
      result[kieli] = fileService.getPublicPathForProjektiFile(projektiPath, pdfs.hyvaksymisKuulutusPDFPath);
    }
  }
  return result;
}
