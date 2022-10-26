import { DBProjekti, LocalizedMap, NahtavillaoloPDF, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import {
  adaptAineistot,
  adaptHankkeenKuvaus,
  adaptIlmoituksenVastaanottajat,
  adaptKielitiedotByAddingTypename,
  adaptVelho,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptStandardiYhteystiedotByAddingTypename,
} from "../common";
import { fileService } from "../../../files/fileService";
import { lisaAineistoService } from "../../../aineisto/lisaAineistoService";

export function adaptNahtavillaoloVaihe(
  dbProjekti: DBProjekti,
  nahtavillaoloVaihe: NahtavillaoloVaihe | null | undefined
): API.NahtavillaoloVaihe | undefined {
  if (!nahtavillaoloVaihe) {
    return undefined;
  }
  const { aineistoNahtavilla, lisaAineisto, kuulutusYhteystiedot, ilmoituksenVastaanottajat, hankkeenKuvaus, ...rest } = nahtavillaoloVaihe;

  return {
    __typename: "NahtavillaoloVaihe",
    ...rest,
    aineistoNahtavilla: adaptAineistot(aineistoNahtavilla),
    lisaAineisto: adaptAineistot(lisaAineisto),
    // dbProjekti.salt on määritelty
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    lisaAineistoParametrit: lisaAineistoService.generateListingParams(dbProjekti.oid, nahtavillaoloVaihe.id, dbProjekti.salt),
    kuulutusYhteystiedot: adaptStandardiYhteystiedotByAddingTypename(kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
    hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus || undefined),
  };
}

export function adaptNahtavillaoloVaiheJulkaisut(
  oid: string,
  julkaisut?: NahtavillaoloVaiheJulkaisu[] | null
): API.NahtavillaoloVaiheJulkaisu[] | undefined {
  if (julkaisut) {
    const adaptoitu: API.NahtavillaoloVaiheJulkaisu[] = julkaisut.map((julkaisu) => {
      const {
        aineistoNahtavilla,
        lisaAineisto,
        hankkeenKuvaus,
        ilmoituksenVastaanottajat,
        yhteystiedot,
        nahtavillaoloPDFt,
        kielitiedot,
        velho,
        ...fieldsToCopyAsIs
      } = julkaisu;

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

      const palautetaan: API.NahtavillaoloVaiheJulkaisu = {
        ...fieldsToCopyAsIs,
        __typename: "NahtavillaoloVaiheJulkaisu",
        hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus),
        kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
        yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
        ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
        aineistoNahtavilla: adaptAineistot(aineistoNahtavilla),
        lisaAineisto: adaptAineistot(lisaAineisto),
        nahtavillaoloPDFt: adaptNahtavillaoloPDFPaths(oid, nahtavillaoloPDFt),
        velho: adaptVelho(velho),
      };
      return palautetaan;
    });
    return adaptoitu;
  }
  return undefined;
}

function adaptNahtavillaoloPDFPaths(oid: string, nahtavillaoloPDFs: LocalizedMap<NahtavillaoloPDF>): API.NahtavillaoloPDFt | undefined {
  if (!nahtavillaoloPDFs) {
    return undefined;
  }

  const result: Partial<API.NahtavillaoloPDFt> = {};
  for (const kieli in nahtavillaoloPDFs) {
    const pdfs = nahtavillaoloPDFs[kieli as API.Kieli];
    if (!pdfs) {
      throw new Error(`adaptNahtavillaoloPDFPaths: nahtavillaoloPDFs[${kieli}] määrittelemättä`);
    }
    const nahtavillaoloPdf: API.NahtavillaoloPDF = {
      __typename: "NahtavillaoloPDF",
      // getYllapitoPathForProjektiFile molemmat argumentit on määritelty, joten funktio palauttaa ei-undefined arvon
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      nahtavillaoloPDFPath: fileService.getYllapitoPathForProjektiFile(oid, pdfs.nahtavillaoloPDFPath),
      // getYllapitoPathForProjektiFile molemmat argumentit on määritelty, joten funktio palauttaa ei-undefined arvon
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      nahtavillaoloIlmoitusPDFPath: fileService.getYllapitoPathForProjektiFile(oid, pdfs.nahtavillaoloIlmoitusPDFPath),
      // getYllapitoPathForProjektiFile molemmat argumentit on määritelty, joten funktio palauttaa ei-undefined arvon
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        pdfs.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath
      ),
    };
    result[kieli as API.Kieli] = nahtavillaoloPdf;
  }
  return { __typename: "NahtavillaoloPDFt", [API.Kieli.SUOMI]: result[API.Kieli.SUOMI] as API.NahtavillaoloPDF, ...result };
}
