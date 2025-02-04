import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { DBProjekti, NahtavillaoloVaiheJulkaisu } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { findPublishedKuulutusJulkaisu } from "../../common";
import { adaptAineistotJulkinen, adaptUudelleenKuulutusJulkinen, adaptVelhoJulkinen } from ".";
import {
  adaptKielitiedotByAddingTypename,
  adaptKuulutusSaamePDFtToAPI,
  adaptLokalisoituTekstiToAPI,
  adaptMandatoryYhteystiedotByAddingTypename,
} from "..";
import { ProjektiPaths } from "../../../../files/ProjektiPath";
import { ProjektiScheduleManager } from "../../../../sqsEvents/projektiScheduleManager";
import { fileService } from "../../../../files/fileService";
import { assertIsDefined } from "../../../../util/assertions";
import {
  NahtavillaoloVaiheKutsuAdapter,
  createNahtavillaoloVaiheKutsuAdapterProps,
} from "../../../../asiakirja/adapter/nahtavillaoloVaiheKutsuAdapter";
import { isProjektiAsianhallintaIntegrationEnabled } from "../../../../util/isProjektiAsianhallintaIntegrationEnabled";
import { getLinkkiAsianhallintaan } from "../../../../asianhallinta/getLinkkiAsianhallintaan";

export async function adaptNahtavillaoloVaiheJulkaisuJulkinen(
  dbProjekti: DBProjekti,
  kieli?: KaannettavaKieli
): Promise<API.NahtavillaoloVaiheJulkaisuJulkinen | undefined> {
  const julkaisu = findPublishedKuulutusJulkaisu(dbProjekti.nahtavillaoloVaiheJulkaisut);
  if (!julkaisu) {
    return undefined;
  }
  const {
    aineistoNahtavilla,
    hankkeenKuvaus,
    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    yhteystiedot,
    muistutusoikeusPaattyyPaiva,
    velho,
    kielitiedot,
    tila,
    uudelleenKuulutus,
    nahtavillaoloSaamePDFt,
    id,
    kopioituProjektista,
  } = julkaisu;
  if (tila == API.KuulutusJulkaisuTila.MIGROITU) {
    return {
      id,
      __typename: "NahtavillaoloVaiheJulkaisuJulkinen",
      tila,
      velho: adaptVelhoJulkinen(velho),
      yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
    };
  }

  if (!aineistoNahtavilla) {
    throw new Error("adaptNahtavillaoloVaiheJulkaisu: julkaisu.aineistoNahtavilla määrittelemättä");
  }
  if (!yhteystiedot) {
    throw new Error("adaptNahtavillaoloVaiheJulkaisu: julkaisu.yhteystiedot määrittelemättä");
  }
  if (!hankkeenKuvaus) {
    throw new Error("adaptNahtavillaoloVaiheJulkaisu: julkaisu.hankkeenKuvaus määrittelemättä");
  }

  const paths = new ProjektiPaths(dbProjekti.oid).nahtavillaoloVaihe(julkaisu);
  let apiAineistoNahtavilla: API.Aineisto[] | undefined = undefined;
  if (new ProjektiScheduleManager(dbProjekti).getNahtavillaoloVaihe().isAineistoVisible(julkaisu)) {
    apiAineistoNahtavilla = adaptAineistotJulkinen(aineistoNahtavilla, paths);
  }

  const julkaisuJulkinen: API.NahtavillaoloVaiheJulkaisuJulkinen = {
    id,
    __typename: "NahtavillaoloVaiheJulkaisuJulkinen",
    hankkeenKuvaus: adaptLokalisoituTekstiToAPI(hankkeenKuvaus),
    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    kuulutusPDF: adaptNahtavillaoloPDFPaths(dbProjekti.oid, julkaisu),
    muistutusoikeusPaattyyPaiva,
    yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
    velho: adaptVelhoJulkinen(velho),
    kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
    tila,
    uudelleenKuulutus: adaptUudelleenKuulutusJulkinen(uudelleenKuulutus),
    julkaisuOnKopio: !!kopioituProjektista,
  };
  if (apiAineistoNahtavilla) {
    julkaisuJulkinen.aineistoNahtavilla = apiAineistoNahtavilla;
  }
  if (kieli) {
    const velho = dbProjekti.velho;
    assertIsDefined(velho, "Projektilta puuttuu velho-tieto!");
    julkaisuJulkinen.kuulutusTekstit = new NahtavillaoloVaiheKutsuAdapter(
      await createNahtavillaoloVaiheKutsuAdapterProps({
        projekti: dbProjekti,
        julkaisu,
        kieli,
        asianhallintaPaalla: await isProjektiAsianhallintaIntegrationEnabled(dbProjekti),
        linkkiAsianhallintaan: await getLinkkiAsianhallintaan(dbProjekti),
        osoite: undefined,
        kuulutettuYhdessaSuunnitelmanimi: undefined,
      })
    ).userInterfaceFields;
  }
  if (nahtavillaoloSaamePDFt) {
    julkaisuJulkinen.nahtavillaoloSaamePDFt = adaptKuulutusSaamePDFtToAPI(paths, julkaisu.nahtavillaoloSaamePDFt, true);
  }
  return julkaisuJulkinen;
}

function adaptNahtavillaoloPDFPaths(oid: string, nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu): API.KuulutusPDFJulkinen | undefined {
  if (!nahtavillaoloVaihe.nahtavillaoloPDFt) {
    return undefined;
  }
  const { SUOMI: suomiPDFs, ...hyvaksymispdfs } = nahtavillaoloVaihe.nahtavillaoloPDFt || {};

  if (!suomiPDFs) {
    throw new Error(`adaptNahtavillaoloPDFPaths: nahtavillaoloVaihe.${API.Kieli.SUOMI} määrittelemättä`);
  }

  const result: API.KuulutusPDFJulkinen = {
    __typename: "KuulutusPDFJulkinen",
    SUOMI: fileService.getPublicPathForProjektiFile(
      new ProjektiPaths(oid).nahtavillaoloVaihe(nahtavillaoloVaihe),
      suomiPDFs.nahtavillaoloPDFPath
    ),
  };

  for (const k in hyvaksymispdfs) {
    const kieli = k as API.Kieli.RUOTSI;
    const pdfs = hyvaksymispdfs[kieli];
    if (pdfs) {
      result[kieli] = fileService.getPublicPathForProjektiFile(
        new ProjektiPaths(oid).nahtavillaoloVaihe(nahtavillaoloVaihe),
        pdfs.nahtavillaoloPDFPath
      );
    }
  }
  return result;
}
