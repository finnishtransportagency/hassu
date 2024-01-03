import { AloitusKuulutus, AloitusKuulutusJulkaisu, DBProjekti, DBVaylaUser } from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { KuulutusJulkaisuTila, MuokkausTila } from "hassu-common/graphql/apiModel";
import {
  adaptIlmoituksenVastaanottajat,
  adaptKielitiedotByAddingTypename,
  adaptLokalisoituTeksti as adaptHankkeenKuvaus,
  adaptMandatoryStandardiYhteystiedotByAddingTypename,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptStandardiYhteystiedotByAddingTypename,
  adaptVelho,
} from "../common";
import { adaptSuunnitteluSopimusJulkaisu, FileLocation, adaptKuulutusSaamePDFt, adaptUudelleenKuulutus } from ".";
import { fileService } from "../../../files/fileService";
import { adaptMuokkausTila, findJulkaisuWithTila } from "../../projektiUtil";
import { AloituskuulutusPaths, ProjektiPaths } from "../../../files/ProjektiPath";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { getAsianhallintaSynchronizationStatus } from "../common/adaptAsianhallinta";

export function adaptAloitusKuulutus(
  projektiPath: AloituskuulutusPaths,
  kayttoOikeudet: DBVaylaUser[],
  kuulutus?: AloitusKuulutus | null,
  aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null
): API.AloitusKuulutus | undefined {
  if (kuulutus) {
    if (!kuulutus.hankkeenKuvaus) {
      throw new Error("adaptAloituskuulutus: kuulutus.hankkeenKuvaus puuttuu");
    }
    const { kuulutusYhteystiedot, uudelleenKuulutus, id: _id, aloituskuulutusSaamePDFt, ...otherKuulutusFields } = kuulutus;
    return {
      __typename: "AloitusKuulutus",
      ...otherKuulutusFields,
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(kuulutus.ilmoituksenVastaanottajat),
      hankkeenKuvaus: adaptHankkeenKuvaus(kuulutus.hankkeenKuvaus),
      kuulutusYhteystiedot: adaptStandardiYhteystiedotByAddingTypename(kayttoOikeudet, kuulutusYhteystiedot),
      aloituskuulutusSaamePDFt: adaptKuulutusSaamePDFt(projektiPath, aloituskuulutusSaamePDFt, false),
      uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
      muokkausTila: adaptMuokkausTila(kuulutus, aloitusKuulutusJulkaisut),
    };
  } else if (findJulkaisuWithTila(aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.MIGROITU)) {
    return { __typename: "AloitusKuulutus", muokkausTila: MuokkausTila.MIGROITU };
  }
  return kuulutus as undefined;
}

export function adaptAloitusKuulutusJulkaisu(
  projekti: DBProjekti,
  aloitusKuulutusJulkaisut: AloitusKuulutusJulkaisu[] | null | undefined
): API.AloitusKuulutusJulkaisu | undefined {
  const julkaisu =
    findJulkaisuWithTila(aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA) ??
    findJulkaisuWithTila(aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.HYVAKSYTTY) ??
    findJulkaisuWithTila(aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.PERUUTETTU) ??
    findJulkaisuWithTila(aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.MIGROITU);
  if (!julkaisu) {
    return undefined;
  }

  const oid = projekti.oid;
  const {
    yhteystiedot,
    kuulutusYhteystiedot,
    velho,
    suunnitteluSopimus,
    kielitiedot,
    tila,
    uudelleenKuulutus,
    aloituskuulutusSaamePDFt,
    asianhallintaEventId,
    ...fieldsToCopyAsIs
  } = julkaisu;

  if (tila == KuulutusJulkaisuTila.MIGROITU) {
    return {
      __typename: "AloitusKuulutusJulkaisu",
      tila,
      kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
      yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
      kuulutusYhteystiedot: adaptMandatoryStandardiYhteystiedotByAddingTypename(projekti.kayttoOikeudet, kuulutusYhteystiedot),
      velho: adaptVelho(velho),
    };
  } else if (!julkaisu.hankkeenKuvaus) {
    throw new Error("adaptAloitusKuulutusJulkaisut: julkaisu.hankkeenKuvaus puuttuu");
  } else {
    const apiJulkaisu: API.AloitusKuulutusJulkaisu = {
      ...fieldsToCopyAsIs,
      __typename: "AloitusKuulutusJulkaisu",
      tila,
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(julkaisu.ilmoituksenVastaanottajat),
      hankkeenKuvaus: adaptHankkeenKuvaus(julkaisu.hankkeenKuvaus),
      yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
      kuulutusYhteystiedot: adaptMandatoryStandardiYhteystiedotByAddingTypename(projekti.kayttoOikeudet, kuulutusYhteystiedot),
      velho: adaptVelho(velho),
      suunnitteluSopimus: adaptSuunnitteluSopimusJulkaisu(oid, suunnitteluSopimus, FileLocation.YLLAPITO),
      kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
      aloituskuulutusPDFt: adaptJulkaisuPDFPaths(oid, julkaisu),
      aloituskuulutusSaamePDFt: adaptKuulutusSaamePDFt(new ProjektiPaths(oid).aloituskuulutus(julkaisu), aloituskuulutusSaamePDFt, false),
      uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
      asianhallintaSynkronointiTila: getAsianhallintaSynchronizationStatus(projekti.synkronoinnit, asianhallintaEventId),
    };
    return apiJulkaisu;
  }
}

function adaptJulkaisuPDFPaths(oid: string, aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu): API.AloitusKuulutusPDFt | undefined {
  const aloitusKuulutusPDFS = aloitusKuulutusJulkaisu.aloituskuulutusPDFt;
  if (!aloitusKuulutusPDFS) {
    return undefined;
  }

  const result: Partial<API.AloitusKuulutusPDFt> = { __typename: "AloitusKuulutusPDFt" };
  for (const kieli in aloitusKuulutusPDFS) {
    const pdfs = aloitusKuulutusPDFS[kieli as API.Kieli];
    if (!pdfs) {
      result[kieli as KaannettavaKieli] = undefined;
      continue;
    }
    const aloituskuulutusPath = new ProjektiPaths(oid).aloituskuulutus(aloitusKuulutusJulkaisu);
    result[kieli as KaannettavaKieli] = {
      __typename: "AloitusKuulutusPDF",
      aloituskuulutusPDFPath: fileService.getYllapitoPathForProjektiFile(aloituskuulutusPath, pdfs.aloituskuulutusPDFPath),
      aloituskuulutusIlmoitusPDFPath: fileService.getYllapitoPathForProjektiFile(aloituskuulutusPath, pdfs.aloituskuulutusIlmoitusPDFPath),
    };
  }
  return { __typename: "AloitusKuulutusPDFt", [API.Kieli.SUOMI]: result[API.Kieli.SUOMI] as API.AloitusKuulutusPDF, ...result };
}
