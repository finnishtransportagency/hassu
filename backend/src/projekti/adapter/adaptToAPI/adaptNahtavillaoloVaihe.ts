import { DBProjekti, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import {
  adaptAineistot,
  adaptIlmoituksenVastaanottajat,
  adaptKielitiedotByAddingTypename,
  adaptLokalisoituTeksti,
  adaptMandatoryStandardiYhteystiedotByAddingTypename,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptStandardiYhteystiedotByAddingTypename,
  adaptVelho,
} from "../common";
import { fileService } from "../../../files/fileService";
import { ProjektiPaths } from "../../../files/ProjektiPath";
import { adaptMuokkausTila, findJulkaisuWithTila } from "../../projektiUtil";
import { adaptUudelleenKuulutus, adaptKuulutusSaamePDFt, adaptAineistoMuokkaus } from ".";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { assertIsDefined } from "../../../util/assertions";
import { getAsianhallintaSynchronizationStatus } from "../common/adaptAsianhallinta";

export function adaptNahtavillaoloVaihe(
  dbProjekti: DBProjekti,
  nahtavillaoloVaihe: NahtavillaoloVaihe | null | undefined,
  nahtavillaoloVaiheJulkaisut: NahtavillaoloVaiheJulkaisu[] | null | undefined
): API.NahtavillaoloVaihe | undefined {
  if (nahtavillaoloVaihe) {
    const {
      aineistoNahtavilla,
      kuulutusYhteystiedot,
      uudelleenKuulutus,
      aineistoMuokkaus,
      ilmoituksenVastaanottajat,
      hankkeenKuvaus,
      nahtavillaoloSaamePDFt,
      ...rest
    } = nahtavillaoloVaihe;
    const paths = new ProjektiPaths(dbProjekti.oid).nahtavillaoloVaihe(nahtavillaoloVaihe);
    return {
      __typename: "NahtavillaoloVaihe",
      ...rest,
      aineistoNahtavilla: adaptAineistot(aineistoNahtavilla, paths),
      nahtavillaoloSaamePDFt: adaptKuulutusSaamePDFt(new ProjektiPaths(dbProjekti.oid), nahtavillaoloSaamePDFt, false),
      kuulutusYhteystiedot: adaptStandardiYhteystiedotByAddingTypename(dbProjekti.kayttoOikeudet, kuulutusYhteystiedot),
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
      hankkeenKuvaus: adaptLokalisoituTeksti(hankkeenKuvaus ?? undefined),
      muokkausTila: adaptMuokkausTila(nahtavillaoloVaihe, nahtavillaoloVaiheJulkaisut),
      uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
      aineistoMuokkaus: adaptAineistoMuokkaus(aineistoMuokkaus),
    };
  } else if (findJulkaisuWithTila(nahtavillaoloVaiheJulkaisut, API.KuulutusJulkaisuTila.MIGROITU)) {
    return { __typename: "NahtavillaoloVaihe", muokkausTila: API.MuokkausTila.MIGROITU };
  }
  return undefined;
}

export function adaptNahtavillaoloVaiheJulkaisu(
  dbProjekti: DBProjekti,
  julkaisut?: NahtavillaoloVaiheJulkaisu[] | null
): API.NahtavillaoloVaiheJulkaisu | undefined {
  const julkaisu =
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA) ??
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.HYVAKSYTTY) ??
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.PERUUTETTU) ??
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.MIGROITU);

  if (julkaisu) {
    const {
      aineistoNahtavilla,
      hankkeenKuvaus,
      ilmoituksenVastaanottajat,
      yhteystiedot,
      kuulutusYhteystiedot,
      nahtavillaoloPDFt: _nahtavillaoloPDFt,
      kielitiedot,
      velho,
      tila,
      uudelleenKuulutus,
      aineistoMuokkaus,
      nahtavillaoloSaamePDFt,
      asianhallintaEventId,
      ...fieldsToCopyAsIs
    } = julkaisu;

    if (tila == API.KuulutusJulkaisuTila.MIGROITU) {
      return {
        __typename: "NahtavillaoloVaiheJulkaisu",
        tila,
        velho: adaptVelho(velho),
        yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
        kuulutusYhteystiedot: adaptMandatoryStandardiYhteystiedotByAddingTypename(dbProjekti.kayttoOikeudet, kuulutusYhteystiedot),
      };
    }

    if (!hankkeenKuvaus) {
      throw new Error("adaptNahtavillaoloVaiheJulkaisut: julkaisu.hankkeenKuvaus määrittelemättä");
    }
    if (!ilmoituksenVastaanottajat) {
      throw new Error("adaptNahtavillaoloVaiheJulkaisut: julkaisu.ilmoituksenVastaanottajat määrittelemättä");
    }
    if (!kielitiedot) {
      throw new Error("adaptNahtavillaoloVaiheJulkaisut: julkaisu.kielitiedot määrittelemättä");
    }
    if (!yhteystiedot) {
      throw new Error("adaptNahtavillaoloVaiheJulkaisut: julkaisu.yhteystiedot määrittelemättä");
    }

    const paths = new ProjektiPaths(dbProjekti.oid).nahtavillaoloVaihe(julkaisu);
    assertIsDefined(dbProjekti.salt);
    const apiJulkaisu: API.NahtavillaoloVaiheJulkaisu = {
      ...fieldsToCopyAsIs,
      __typename: "NahtavillaoloVaiheJulkaisu",
      tila,
      hankkeenKuvaus: adaptLokalisoituTeksti(hankkeenKuvaus),
      kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
      yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
      kuulutusYhteystiedot: adaptMandatoryStandardiYhteystiedotByAddingTypename(dbProjekti.kayttoOikeudet, kuulutusYhteystiedot),
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
      aineistoNahtavilla: adaptAineistot(aineistoNahtavilla, paths),
      nahtavillaoloPDFt: adaptNahtavillaoloPDFPaths(dbProjekti.oid, julkaisu),
      nahtavillaoloSaamePDFt: adaptKuulutusSaamePDFt(new ProjektiPaths(dbProjekti.oid), nahtavillaoloSaamePDFt, false),
      velho: adaptVelho(velho),
      uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
      aineistoMuokkaus: adaptAineistoMuokkaus(aineistoMuokkaus),
      asianhallintaSynkronointiTila: getAsianhallintaSynchronizationStatus(dbProjekti.synkronoinnit, asianhallintaEventId),
    };

    return apiJulkaisu;
  }
  return undefined;
}

function adaptNahtavillaoloPDFPaths(
  oid: string,
  nahtavillaoloVaiheJulkaisu: NahtavillaoloVaiheJulkaisu
): API.NahtavillaoloPDFt | undefined {
  const nahtavillaoloPDFs = nahtavillaoloVaiheJulkaisu.nahtavillaoloPDFt;
  if (!nahtavillaoloPDFs) {
    return undefined;
  }

  const paths = new ProjektiPaths(oid).nahtavillaoloVaihe(nahtavillaoloVaiheJulkaisu);
  const result: Partial<API.NahtavillaoloPDFt> = {};
  for (const kieli in nahtavillaoloPDFs) {
    const pdfs = nahtavillaoloPDFs[kieli as KaannettavaKieli];
    if (!pdfs) {
      throw new Error(`adaptNahtavillaoloPDFPaths: nahtavillaoloPDFs[${kieli}] määrittelemättä`);
    }
    result[kieli as KaannettavaKieli] = {
      __typename: "NahtavillaoloPDF",
      nahtavillaoloPDFPath: fileService.getYllapitoPathForProjektiFile(paths, pdfs.nahtavillaoloPDFPath),
      nahtavillaoloIlmoitusPDFPath: fileService.getYllapitoPathForProjektiFile(paths, pdfs.nahtavillaoloIlmoitusPDFPath),
      nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath: fileService.getYllapitoPathForProjektiFile(
        paths,
        pdfs.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath
      ),
    };
  }
  return { __typename: "NahtavillaoloPDFt", [API.Kieli.SUOMI]: result[API.Kieli.SUOMI] as API.NahtavillaoloPDF, ...result };
}
