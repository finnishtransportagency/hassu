import { DBProjekti, LocalizedMap, NahtavillaoloPDF, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import {
  adaptAineistot,
  adaptHankkeenKuvaus,
  adaptIlmoituksenVastaanottajat,
  adaptKielitiedotByAddingTypename,
  adaptVelhoByAddingTypename,
  adaptYhteystiedotByAddingTypename,
} from "../common";
import { fileService } from "../../../files/fileService";
import { lisaAineistoService } from "../../../aineisto/lisaAineistoService";

export function adaptNahtavillaoloVaihe(dbProjekti: DBProjekti, nahtavillaoloVaihe: NahtavillaoloVaihe): API.NahtavillaoloVaihe {
  if (!nahtavillaoloVaihe) {
    return undefined;
  }
  const { aineistoNahtavilla, lisaAineisto, kuulutusYhteystiedot, ilmoituksenVastaanottajat, hankkeenKuvaus, nahtavillaoloPDFt, ...rest } =
    nahtavillaoloVaihe;
  return {
    __typename: "NahtavillaoloVaihe",
    ...rest,
    nahtavillaoloPDFt: adaptNahtavillaoloPDFPaths(dbProjekti.oid, nahtavillaoloPDFt),
    aineistoNahtavilla: adaptAineistot(aineistoNahtavilla),
    lisaAineisto: adaptAineistot(lisaAineisto),
    lisaAineistoParametrit: lisaAineistoService.generateListingParams(dbProjekti.oid, nahtavillaoloVaihe.id, dbProjekti.salt),
    kuulutusYhteystiedot: adaptYhteystiedotByAddingTypename(kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
    hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus),
  };
}

export function adaptNahtavillaoloVaiheJulkaisut(
  oid: string,
  julkaisut?: NahtavillaoloVaiheJulkaisu[] | null
): API.NahtavillaoloVaiheJulkaisu[] | undefined {
  if (julkaisut) {
    return julkaisut.map((julkaisu) => {
      const {
        aineistoNahtavilla,
        lisaAineisto,
        hankkeenKuvaus,
        ilmoituksenVastaanottajat,
        kuulutusYhteystiedot,
        nahtavillaoloPDFt,
        kielitiedot,
        velho,
        ...fieldsToCopyAsIs
      } = julkaisu;

      return {
        ...fieldsToCopyAsIs,
        __typename: "NahtavillaoloVaiheJulkaisu",
        hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus),
        kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
        kuulutusYhteystiedot: adaptYhteystiedotByAddingTypename(kuulutusYhteystiedot),
        ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
        aineistoNahtavilla: adaptAineistot(aineistoNahtavilla),
        lisaAineisto: adaptAineistot(lisaAineisto),
        nahtavillaoloPDFt: adaptNahtavillaoloPDFPaths(oid, nahtavillaoloPDFt),
        velho: adaptVelhoByAddingTypename(velho),
      };
    });
  }
  return undefined;
}

function adaptNahtavillaoloPDFPaths(oid: string, nahtavillaoloPDFs: LocalizedMap<NahtavillaoloPDF>): API.NahtavillaoloPDFt | undefined {
  if (!nahtavillaoloPDFs) {
    return undefined;
  }

  const result = {};
  for (const kieli in nahtavillaoloPDFs) {
    const nahtavillaoloPdf: NahtavillaoloPDF = {
      nahtavillaoloPDFPath: fileService.getYllapitoPathForProjektiFile(oid, nahtavillaoloPDFs[kieli].nahtavillaoloPDFPath),
      nahtavillaoloIlmoitusPDFPath: fileService.getYllapitoPathForProjektiFile(oid, nahtavillaoloPDFs[kieli].nahtavillaoloIlmoitusPDFPath),
      nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        nahtavillaoloPDFs[kieli].nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath
      ),
    };
    result[kieli] = nahtavillaoloPdf;
  }
  return { __typename: "NahtavillaoloPDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
}
