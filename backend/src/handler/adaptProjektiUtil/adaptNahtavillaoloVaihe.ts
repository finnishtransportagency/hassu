import {
  Yhteystieto,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  DBProjekti,
  LocalizedMap,
  NahtavillaoloPDF,
} from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";
import { adaptHankkeenKuvaus } from "../commonAdapterUtil/adaptHankkeenKuvaus";
import { adaptAineistot } from "../commonAdapterUtil/adaptAineistot";
import { adaptYhteystiedot } from "../commonAdapterUtil/adaptYhteystiedot";
import { fileService } from "../../files/fileService";
import { lisaAineistoService } from "../../aineisto/lisaAineistoService";
import { adaptIlmoituksenVastaanottajat } from "./common";
import {
  adaptKielitiedot as lisaaKielitiedotTypename,
  adaptVelho as lisaaVelhoTypename,
} from "../commonAdapterUtil/lisaaTypename";

export function adaptNahtavillaoloVaihe(
  projektiPaallikko: Yhteystieto,
  dbProjekti: DBProjekti,
  nahtavillaoloVaihe: NahtavillaoloVaihe
): API.NahtavillaoloVaihe {
  if (!nahtavillaoloVaihe) {
    return undefined;
  }
  const {
    aineistoNahtavilla,
    lisaAineisto,
    kuulutusYhteystiedot,
    ilmoituksenVastaanottajat,
    hankkeenKuvaus,
    nahtavillaoloPDFt,
    ...rest
  } = nahtavillaoloVaihe;
  return {
    __typename: "NahtavillaoloVaihe",
    ...rest,
    nahtavillaoloPDFt: adaptNahtavillaoloPDFPaths(dbProjekti.oid, nahtavillaoloPDFt),
    aineistoNahtavilla: adaptAineistot(aineistoNahtavilla),
    lisaAineisto: adaptAineistot(lisaAineisto),
    lisaAineistoParametrit: lisaAineistoService.generateListingParams(
      dbProjekti.oid,
      nahtavillaoloVaihe.id,
      dbProjekti.salt
    ),
    kuulutusYhteystiedot: adaptYhteystiedot(projektiPaallikko, kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
    hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus),
  };
}

export function adaptNahtavillaoloVaiheJulkaisut(
  oid: string,
  projektiPaallikko: Yhteystieto,
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
        kielitiedot: lisaaKielitiedotTypename(kielitiedot),
        kuulutusYhteystiedot: adaptYhteystiedot(projektiPaallikko, kuulutusYhteystiedot),
        ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
        aineistoNahtavilla: adaptAineistot(aineistoNahtavilla),
        lisaAineisto: adaptAineistot(lisaAineisto),
        nahtavillaoloPDFt: adaptNahtavillaoloPDFPaths(oid, nahtavillaoloPDFt),
        velho: lisaaVelhoTypename(velho),
      };
    });
  }
  return undefined;
}

function adaptNahtavillaoloPDFPaths(
  oid: string,
  nahtavillaoloPDFs: LocalizedMap<NahtavillaoloPDF>
): API.NahtavillaoloPDFt | undefined {
  if (!nahtavillaoloPDFs) {
    return undefined;
  }

  const result = {};
  for (const kieli in nahtavillaoloPDFs) {
    result[kieli] = {
      nahtavillaoloPDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        nahtavillaoloPDFs[kieli].nahtavillaoloPDFPath
      ),
      nahtavillaoloIlmoitusPDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        nahtavillaoloPDFs[kieli].nahtavillaoloIlmoitusPDFPath
      ),
      nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        nahtavillaoloPDFs[kieli].nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath
      ),
    } as NahtavillaoloPDF;
  }
  return { __typename: "NahtavillaoloPDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
}
