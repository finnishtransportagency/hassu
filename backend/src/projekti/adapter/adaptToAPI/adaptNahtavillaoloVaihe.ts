import { DBProjekti, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { KuulutusJulkaisuTila, MuokkausTila } from "../../../../../common/graphql/apiModel";
import {
  adaptAineistot,
  adaptLokalisoituTeksti,
  adaptIlmoituksenVastaanottajat,
  adaptKielitiedotByAddingTypename,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptStandardiYhteystiedotByAddingTypename,
  adaptVelho,
} from "../common";
import { fileService } from "../../../files/fileService";
import { lisaAineistoService } from "../../../aineisto/lisaAineistoService";
import { ProjektiPaths } from "../../../files/ProjektiPath";
import { adaptMuokkausTila, findJulkaisuWithTila } from "../../projektiUtil";
import { adaptUudelleenKuulutus } from "./adaptAloitusKuulutus";

export function adaptNahtavillaoloVaihe(
  dbProjekti: DBProjekti,
  nahtavillaoloVaihe: NahtavillaoloVaihe | null | undefined,
  nahtavillaoloVaiheJulkaisut: NahtavillaoloVaiheJulkaisu[] | null | undefined
): API.NahtavillaoloVaihe | undefined {
  if (nahtavillaoloVaihe) {
    const {
      aineistoNahtavilla,
      lisaAineisto,
      kuulutusYhteystiedot,
      uudelleenKuulutus,
      ilmoituksenVastaanottajat,
      hankkeenKuvaus,
      ...rest
    } = nahtavillaoloVaihe;
    const paths = new ProjektiPaths(dbProjekti.oid).nahtavillaoloVaihe(nahtavillaoloVaihe);
    return {
      __typename: "NahtavillaoloVaihe",
      ...rest,
      aineistoNahtavilla: adaptAineistot(aineistoNahtavilla, paths),
      lisaAineisto: adaptAineistot(lisaAineisto, paths),
      // dbProjekti.salt on määritelty
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      lisaAineistoParametrit: lisaAineistoService.generateListingParams(dbProjekti.oid, nahtavillaoloVaihe.id, dbProjekti.salt),
      kuulutusYhteystiedot: adaptStandardiYhteystiedotByAddingTypename(dbProjekti.kayttoOikeudet, kuulutusYhteystiedot),
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
      hankkeenKuvaus: adaptLokalisoituTeksti(hankkeenKuvaus || undefined),
      muokkausTila: adaptMuokkausTila(nahtavillaoloVaihe, nahtavillaoloVaiheJulkaisut),
      uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
    };
  } else if (findJulkaisuWithTila(nahtavillaoloVaiheJulkaisut, KuulutusJulkaisuTila.MIGROITU)) {
    return { __typename: "NahtavillaoloVaihe", muokkausTila: MuokkausTila.MIGROITU };
  }
  return undefined;
}

export function adaptNahtavillaoloVaiheJulkaisu(
  dbProjekti: DBProjekti,
  julkaisut?: NahtavillaoloVaiheJulkaisu[] | null
): API.NahtavillaoloVaiheJulkaisu | undefined {
  const julkaisu =
    findJulkaisuWithTila(julkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA) ||
    findJulkaisuWithTila(julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY) ||
    findJulkaisuWithTila(julkaisut, KuulutusJulkaisuTila.MIGROITU);

  if (julkaisu) {
    const {
      aineistoNahtavilla,
      lisaAineisto,
      hankkeenKuvaus,
      ilmoituksenVastaanottajat,
      yhteystiedot,
      nahtavillaoloPDFt,
      kielitiedot,
      velho,
      tila,
      uudelleenKuulutus,
      ...fieldsToCopyAsIs
    } = julkaisu;

    if (tila == KuulutusJulkaisuTila.MIGROITU) {
      return {
        __typename: "NahtavillaoloVaiheJulkaisu",
        tila,
        velho: adaptVelho(velho),
        yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
      };
    }

    if (!nahtavillaoloPDFt) {
      throw new Error("adaptNahtavillaoloVaiheJulkaisut: julkaisu.nahtavillaoloPDFt määrittelemättä");
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
    const palautetaan: API.NahtavillaoloVaiheJulkaisu = {
      ...fieldsToCopyAsIs,
      __typename: "NahtavillaoloVaiheJulkaisu",
      tila,
      hankkeenKuvaus: adaptLokalisoituTeksti(hankkeenKuvaus),
      kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
      yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
      aineistoNahtavilla: adaptAineistot(aineistoNahtavilla, paths),
      lisaAineisto: adaptAineistot(lisaAineisto, paths),
      // dbProjekti.salt on määritelty
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      lisaAineistoParametrit: lisaAineistoService.generateListingParams(dbProjekti.oid, julkaisu.id, dbProjekti.salt),
      nahtavillaoloPDFt: adaptNahtavillaoloPDFPaths(dbProjekti.oid, julkaisu),
      velho: adaptVelho(velho),
      uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
    };
    return palautetaan;
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
    const pdfs = nahtavillaoloPDFs[kieli as API.Kieli];
    if (!pdfs) {
      throw new Error(`adaptNahtavillaoloPDFPaths: nahtavillaoloPDFs[${kieli}] määrittelemättä`);
    }
    result[kieli as API.Kieli] = {
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
