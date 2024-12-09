import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { AloitusKuulutusJulkaisu, DBProjekti } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { findPublishedKuulutusJulkaisu } from "../../common";
import {
  adaptKielitiedotByAddingTypename,
  adaptKuulutusSaamePDFtToAPI,
  adaptLokalisoituTekstiToAPI,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptSuunnitteluSopimusJulkaisuJulkinen,
  adaptUudelleenKuulutusJulkinen,
  adaptVelhoJulkinen,
} from "..";
import { PathTuple, ProjektiPaths } from "../../../../files/ProjektiPath";
import {
  AloituskuulutusKutsuAdapter,
  createAloituskuulutusKutsuAdapterProps,
} from "../../../../asiakirja/adapter/aloituskuulutusKutsuAdapter";
import { isProjektiAsianhallintaIntegrationEnabled } from "../../../../util/isProjektiAsianhallintaIntegrationEnabled";
import { getLinkkiAsianhallintaan } from "../../../../asianhallinta/getLinkkiAsianhallintaan";
import { fileService } from "../../../../files/fileService";

export async function adaptAloitusKuulutusJulkaisuJulkinen(
  projekti: DBProjekti,
  aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null,
  kieli?: KaannettavaKieli
): Promise<API.AloitusKuulutusJulkaisuJulkinen | undefined> {
  const oid = projekti.oid;
  const julkaisu = findPublishedKuulutusJulkaisu(aloitusKuulutusJulkaisut);
  // Pick HYVAKSYTTY or MIGROITU aloituskuulutusjulkaisu, by this order
  if (!julkaisu) {
    return undefined;
  }
  const { yhteystiedot, velho, suunnitteluSopimus, kielitiedot, tila, kuulutusPaiva, uudelleenKuulutus, id, kopioituProjektista } =
    julkaisu;
  if (tila === API.KuulutusJulkaisuTila.MIGROITU) {
    return {
      id,
      __typename: "AloitusKuulutusJulkaisuJulkinen",
      tila,
      yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
      velho: adaptVelhoJulkinen(velho),
    };
  }

  if (!julkaisu.hankkeenKuvaus) {
    throw new Error("adaptAloitusKuulutusJulkaisut: julkaisu.hankkeenKuvaus määrittelemättä");
  }

  const aloituskuulutusPath = new ProjektiPaths(oid).aloituskuulutus(julkaisu);

  const julkaisuJulkinen: API.AloitusKuulutusJulkaisuJulkinen = {
    id,
    __typename: "AloitusKuulutusJulkaisuJulkinen",
    kuulutusPaiva,
    siirtyySuunnitteluVaiheeseen: julkaisu.siirtyySuunnitteluVaiheeseen,
    hankkeenKuvaus: adaptLokalisoituTekstiToAPI(julkaisu.hankkeenKuvaus),
    yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
    velho: adaptVelhoJulkinen(velho),
    suunnitteluSopimus: adaptSuunnitteluSopimusJulkaisuJulkinen(oid, suunnitteluSopimus),
    kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
    kuulutusPDF: adaptAloituskuulutusJulkaisuPDFPaths(aloituskuulutusPath, julkaisu),
    aloituskuulutusSaamePDFt: adaptKuulutusSaamePDFtToAPI(aloituskuulutusPath, julkaisu.aloituskuulutusSaamePDFt, true),
    tila,
    uudelleenKuulutus: adaptUudelleenKuulutusJulkinen(uudelleenKuulutus),
    julkaisuOnKopio: !!kopioituProjektista,
  };

  if (kieli) {
    julkaisuJulkinen.kuulutusTekstit = new AloituskuulutusKutsuAdapter(
      await createAloituskuulutusKutsuAdapterProps(
        oid,
        projekti.lyhytOsoite,
        projekti.kayttoOikeudet,
        kieli,
        await isProjektiAsianhallintaIntegrationEnabled(projekti),
        await getLinkkiAsianhallintaan(projekti),
        julkaisu,
        undefined,
        projekti.vahainenMenettely
      )
    ).userInterfaceFields;
  }
  return julkaisuJulkinen;
}

function adaptAloituskuulutusJulkaisuPDFPaths(
  aloituskuulutusPath: PathTuple,
  aloitusKuulutus: AloitusKuulutusJulkaisu
): API.KuulutusPDFJulkinen | undefined {
  if (!aloitusKuulutus.aloituskuulutusPDFt) {
    return undefined;
  }

  const { SUOMI: suomiPDFS, ...muunKielisetPDFS } = aloitusKuulutus.aloituskuulutusPDFt || {};

  if (!suomiPDFS) {
    throw new Error(`adaptJulkaisuPDFPaths: aloitusKuulutusPDFS.${API.Kieli.SUOMI} määrittelemättä`);
  }

  const result: API.KuulutusPDFJulkinen = {
    __typename: "KuulutusPDFJulkinen",
    SUOMI: fileService.getPublicPathForProjektiFile(aloituskuulutusPath, suomiPDFS.aloituskuulutusPDFPath),
  };
  for (const k in muunKielisetPDFS) {
    const kieli = k as API.Kieli.RUOTSI;
    const pdfs = muunKielisetPDFS[kieli];
    if (pdfs) {
      result[kieli] = fileService.getPublicPathForProjektiFile(aloituskuulutusPath, pdfs.aloituskuulutusPDFPath);
    }
  }
  return result;
}
