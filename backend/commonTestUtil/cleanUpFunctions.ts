import * as API from "hassu-common/graphql/apiModel";
import { cleanupAnyProjektiData } from "../integrationtest/api/testFixtureRecorder";
import sortBy from "lodash/sortBy";

type APIorDBPalaute = Pick<API.Palaute, "liite" | "id" | "vastaanotettu" | "etunimi" | "sukunimi">;

export function cleanupGeneratedIdAndTimestampFromFeedbacks<P extends APIorDBPalaute>(feedbacks?: P[]): P[] | undefined {
  const result = feedbacks
    ? feedbacks.map((palaute) => {
        cleanupAnyProjektiData(palaute);
        palaute.liite = palaute?.liite?.replace(palaute.id, "***unittest***");
        palaute.id = "***unittest***";
        palaute.vastaanotettu = "***unittest***";
        return palaute;
      })
    : undefined;
  if (result) {
    return sortBy(result, "etunimi", "sukunimi");
  }
}

type APIorDBAineistoOrLadattuTiedosto = Pick<API.Aineisto, "tuotu">;
type APIorDBIlmoituksenVastaanottaja = Pick<API.KuntaVastaanottaja | API.ViranomaisVastaanottaja, "lahetetty">;
type APIVuorovaikutusKierros = {
  esittelyaineistot?: APIorDBAineistoOrLadattuTiedosto[] | null;
  suunnitelmaluonnokset?: APIorDBAineistoOrLadattuTiedosto[] | null;
  ilmoituksenVastaanottajat?: {
    kunnat?: APIorDBIlmoituksenVastaanottaja[] | null;
    viranomaiset?: APIorDBIlmoituksenVastaanottaja[] | null;
  } | null;
};

/**
 *
 * @param vastaanottaja
 * @returns vastaanottaja, mutta lahetetty on korvattu ***unittest***:lla. Parametria ei muokata.
 */
function cleanupIlmoituksenVastaanottaja<V extends APIorDBIlmoituksenVastaanottaja>(vastaanottaja: V): V {
  if (vastaanottaja.lahetetty) {
    return {
      ...vastaanottaja,
      lahetetty: "***unittest***",
    };
  } else {
    return vastaanottaja;
  }
}

/**
 *
 * @param vuorovaikutusKierros : VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu, API.VuorovaikutusJulkinen, API.VuorovaikutusKierros, API.VuorovaikutusKierrosJulkaisu
 * @returns vuorovaikutusKierros, mutta aineistoista on korvattu tuotu-aikaleimat ja ilmoituksen vastaanottajista lahettey-aikaleimat ***unittest***:lla. Parametria ei muokata.
 */
export function cleanupVuorovaikutusKierrosTimestamps<A extends APIVuorovaikutusKierros>(vuorovaikutusKierros: A): A {
  const cleanVuorovaikutusKierros = { ...vuorovaikutusKierros };
  cleanVuorovaikutusKierros.esittelyaineistot = cleanVuorovaikutusKierros.esittelyaineistot?.map(aineistoOrLadattuTiedostoCleanupFunc);
  cleanVuorovaikutusKierros.suunnitelmaluonnokset = cleanVuorovaikutusKierros.suunnitelmaluonnokset?.map(
    aineistoOrLadattuTiedostoCleanupFunc
  );
  if (vuorovaikutusKierros.ilmoituksenVastaanottajat) {
    const cleanIlmoituksenVastaanottajat = {
      ...vuorovaikutusKierros.ilmoituksenVastaanottajat,
    };
    if (cleanIlmoituksenVastaanottajat.kunnat) {
      cleanIlmoituksenVastaanottajat.kunnat = vuorovaikutusKierros.ilmoituksenVastaanottajat?.kunnat?.map(cleanupIlmoituksenVastaanottaja);
    }
    if (cleanIlmoituksenVastaanottajat.viranomaiset) {
      cleanIlmoituksenVastaanottajat.viranomaiset =
        vuorovaikutusKierros.ilmoituksenVastaanottajat?.viranomaiset?.map(cleanupIlmoituksenVastaanottaja);
    }
    cleanVuorovaikutusKierros.ilmoituksenVastaanottajat = cleanIlmoituksenVastaanottajat;
  }
  return cleanVuorovaikutusKierros;
}

/**
 *
 * @param aineisto
 * @returns aineisto, mutta tuotu-aikaleimat on korvattu ***unittest***:lla. Parametria ei muokata.
 */
function aineistoOrLadattuTiedostoCleanupFunc<A extends APIorDBAineistoOrLadattuTiedosto>(aineisto: A): A {
  if (aineisto.tuotu) {
    return {
      ...aineisto,
      tuotu: "***unittest***",
    };
  }
  return aineisto;
}

type APIorDBVaihe = {
  hyvaksymisPaiva?: string | null;
  uudelleenKuulutus?: {
    alkuperainenHyvaksymisPaiva?: string | null;
  } | null;
  ilmoituksenVastaanottajat?: {
    kunnat?: APIorDBIlmoituksenVastaanottaja[] | null;
    viranomaiset?: APIorDBIlmoituksenVastaanottaja[] | null;
  } | null;
  kuulutusTekstit?: {
    infoTekstit?: string[] | null;
  } | null;
};

interface APIorDBAloituskuulutus extends APIorDBVaihe {}

/**
 *
 * @param aloituskuulutus : AloitusKuulutus, AloitusKuulutusJulkaisu, API.AloitusKuulutus, API.AloitusKuulutusJulkaisu, API.AloitusKuulutusJulkinen
 * @returns aloituskuulutus, mutta hyvaksymisPaiva, alkuperainenHyvaksymisPaiva ja lahetetty -aikaleimat on korvattu ***unittest***:lla. Parametria ei muokata.
 */
export function cleanupAloituskuulutusTimestamps<A extends APIorDBAloituskuulutus>(
  aloituskuulutus: A | null | undefined
): A | null | undefined {
  if (!aloituskuulutus) {
    return aloituskuulutus;
  }
  return {
    ...aloituskuulutus,
    ...cleanupVaiheTimestamps(aloituskuulutus),
  };
}

/**
 *
 * @param vaihe : objekti, jolla on optionaaliset parametrit hyvaksymisPaiva, alkuperainenHyvaksymisPaiva ja ilmoituksenVastaanottajat
 * @returns vaihe, mutta hyvaksymisPaiva, alkuperainenHyvaksymisPaiva ja lahetetty -aikaleimat on korvattu ***unittest***:lla. Parametria ei muokata.
 */
export function cleanupVaiheTimestamps(vaihe: APIorDBVaihe | null | undefined): APIorDBVaihe | null | undefined {
  if (!vaihe) {
    return vaihe;
  }

  const cleanVaihe = { ...vaihe };

  if (cleanVaihe.hyvaksymisPaiva) {
    cleanVaihe.hyvaksymisPaiva = "***unittest***";
  }

  if (cleanVaihe.ilmoituksenVastaanottajat) {
    const cleanIlmoituksenVastaanottajat = {
      ...cleanVaihe.ilmoituksenVastaanottajat,
    };
    if (cleanIlmoituksenVastaanottajat.kunnat) {
      cleanIlmoituksenVastaanottajat.kunnat = cleanVaihe.ilmoituksenVastaanottajat?.kunnat?.map(cleanupIlmoituksenVastaanottaja);
    }
    if (cleanIlmoituksenVastaanottajat.viranomaiset) {
      cleanIlmoituksenVastaanottajat.viranomaiset =
        cleanVaihe.ilmoituksenVastaanottajat?.viranomaiset?.map(cleanupIlmoituksenVastaanottaja);
    }
    cleanVaihe.ilmoituksenVastaanottajat = cleanIlmoituksenVastaanottajat;
  }

  if (cleanVaihe.uudelleenKuulutus?.alkuperainenHyvaksymisPaiva) {
    cleanVaihe.uudelleenKuulutus = {
      ...cleanVaihe.uudelleenKuulutus,
      alkuperainenHyvaksymisPaiva: "***unittest***",
    };
  }

  if (cleanVaihe?.kuulutusTekstit?.infoTekstit) {
    return {
      ...cleanVaihe,
      kuulutusTekstit: {
        ...cleanVaihe.kuulutusTekstit,
        infoTekstit: cleanVaihe.kuulutusTekstit.infoTekstit.map((infoTeksti) => cleanupUrlsInPDF(infoTeksti)),
      },
    };
  }
  return cleanVaihe;
}

type APIorDBKuulutusSaamePDFt = {
  POHJOISSAAME?: {
    kuulutusIlmoitusPDF?: APIorDBLadattuTiedosto | null;
    kuulutusPDF?: APIorDBLadattuTiedosto | null;
  } | null;
};

type APIorDBLadattuTiedosto = Pick<API.LadattuTiedosto, "tuotu">;

interface APIorDBNahtavillaolo extends APIorDBVaihe {
  aineistoMuokkaus?: {
    alkuperainenHyvaksymisPaiva?: string | null;
  } | null;
  lisaAineistoParametrit?: {
    hash?: string | null;
    poistumisPaiva?: string | null;
  } | null;
  nahtavillaoloSaamePDFt?: APIorDBKuulutusSaamePDFt | null;
  aineistoNahtavilla?: APIorDBAineistoOrLadattuTiedosto[] | null;
  lisaAineisto?: APIorDBAineistoOrLadattuTiedosto[] | null;
}

/**
 *
 * @param nahtavillaoloVaihe : NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu, API.NahtavillaoloVaihe, API.NahtavillaoloVaiheJulkaisu, API.NahtavillaoloVaiheJulkinen
 * @returns nahtavillaoloVaihe, mutta aikaleimat ja lisaAineistoParametrien hash on korvattu ***unittest***:lla. Aineiston ja lisaAineiston Parametria ei muokata.
 */
export function cleanupNahtavillaoloTimestamps<N extends APIorDBNahtavillaolo>(
  nahtavillaoloVaihe: N | null | undefined
): N | null | undefined {
  if (!nahtavillaoloVaihe) {
    return nahtavillaoloVaihe;
  }
  const cleanNahtavillaolo: N = {
    ...nahtavillaoloVaihe,
    ...cleanupVaiheTimestamps(nahtavillaoloVaihe),
  };

  if (cleanNahtavillaolo.aineistoNahtavilla) {
    cleanNahtavillaolo.aineistoNahtavilla = cleanNahtavillaolo.aineistoNahtavilla.map(aineistoOrLadattuTiedostoCleanupFunc);
  }
  if (cleanNahtavillaolo.lisaAineisto) {
    cleanNahtavillaolo.lisaAineisto = cleanNahtavillaolo.lisaAineisto.map(aineistoOrLadattuTiedostoCleanupFunc);
  }

  if (cleanNahtavillaolo.uudelleenKuulutus?.alkuperainenHyvaksymisPaiva) {
    cleanNahtavillaolo.uudelleenKuulutus.alkuperainenHyvaksymisPaiva = "***unittest***";
  }

  if (cleanNahtavillaolo.aineistoMuokkaus?.alkuperainenHyvaksymisPaiva) {
    cleanNahtavillaolo.aineistoMuokkaus.alkuperainenHyvaksymisPaiva = "***unittest***";
  }

  if (cleanNahtavillaolo.lisaAineistoParametrit) {
    cleanNahtavillaolo.lisaAineistoParametrit = {
      ...cleanNahtavillaolo.lisaAineistoParametrit,
      hash: "***unittest***",
      poistumisPaiva: "***unittest***",
    };
  }

  cleanNahtavillaolo.nahtavillaoloSaamePDFt = cleanupSaamePDFt(nahtavillaoloVaihe.nahtavillaoloSaamePDFt);

  return cleanNahtavillaolo;
}

type APIorDBLausuntoPyynto = {
  lisaAineistot?: APIorDBAineistoOrLadattuTiedosto[] | null;
};

type APIorDBLausuntoPyynnonTaydennys = {
  muuAineisto?: APIorDBAineistoOrLadattuTiedosto[] | null;
  muistutukset?: APIorDBLadattuTiedosto[] | null;
};

/**
 *
 * @param lausuntoPyynto API.LausuntoPyynto tai LausuntoPyynto
 * @returns lausuntoPyynto, mutta lisaAineistoista on korvattu tuotu-aikaleimat ***unittest***:lla. Parametria ei muokata.
 */
export function cleanupLausuntoPyyntoTimestamps<L extends APIorDBLausuntoPyynto>(
  lausuntoPyynto: L | null | undefined
): L | null | undefined {
  if (!lausuntoPyynto) {
    return lausuntoPyynto;
  }
  const cleanLausuntoPyynto = {
    ...lausuntoPyynto,
  };
  if (cleanLausuntoPyynto.lisaAineistot) {
    cleanLausuntoPyynto.lisaAineistot = cleanLausuntoPyynto.lisaAineistot.map(aineistoOrLadattuTiedostoCleanupFunc);
  }
  return cleanLausuntoPyynto;
}

/**
 *
 * @param lausuntoPyynnonTaydennys API.LausuntoPyynnonTaydennys tai LausuntoPyynnonTaydennys
 * @returns lausuntoPyynnonTaydennys, mutta muuAineistoista ja muistutuksista on korvattu tuotu-aikaleimat ***unittest***:lla. Parametria ei muokata.
 */
export function cleanupLausuntoPyynnonTaydennysTimestamps<L extends APIorDBLausuntoPyynnonTaydennys>(
  lausuntoPyynnonTaydennys: L | null | undefined
): L | null | undefined {
  if (!lausuntoPyynnonTaydennys) {
    return lausuntoPyynnonTaydennys;
  }
  const cleanLausuntoPyynnonTaydennys = {
    ...lausuntoPyynnonTaydennys,
  };
  if (cleanLausuntoPyynnonTaydennys.muuAineisto) {
    cleanLausuntoPyynnonTaydennys.muuAineisto = cleanLausuntoPyynnonTaydennys.muuAineisto.map(aineistoOrLadattuTiedostoCleanupFunc);
  }
  if (cleanLausuntoPyynnonTaydennys.muistutukset) {
    cleanLausuntoPyynnonTaydennys.muistutukset = cleanLausuntoPyynnonTaydennys.muistutukset.map(aineistoOrLadattuTiedostoCleanupFunc);
  }
  return cleanLausuntoPyynnonTaydennys;
}

/**
 *
 * @param saamePDFt API.KuulutusSaamePDFt tai KuulutusSaamePDFt
 * @returns saamePDFt, mutta tuotu-aikaleima on korvattu ***unittest***:llä. Parametria ei muokata.
 */
function cleanupSaamePDFt<S extends APIorDBKuulutusSaamePDFt>(saamePDFt: S | null | undefined): S | null | undefined {
  if (!saamePDFt) {
    return saamePDFt;
  }
  const cleanSaamePDFt = {
    ...saamePDFt,
  };
  if (cleanSaamePDFt.POHJOISSAAME) {
    const cleanPohjoisSaame = {
      ...cleanSaamePDFt.POHJOISSAAME,
    };
    if (cleanSaamePDFt.POHJOISSAAME.kuulutusPDF) {
      cleanPohjoisSaame.kuulutusPDF = {
        ...cleanPohjoisSaame.kuulutusPDF,
        tuotu: "***unittest***",
      };
    }
    if (cleanSaamePDFt.POHJOISSAAME.kuulutusIlmoitusPDF) {
      cleanPohjoisSaame.kuulutusIlmoitusPDF = {
        ...cleanPohjoisSaame.kuulutusIlmoitusPDF,
        tuotu: "***unittest***",
      };
    }
    cleanSaamePDFt.POHJOISSAAME = cleanPohjoisSaame;
  }
  return cleanSaamePDFt;
}

interface APIorDBHyvaksymisPaatosVaihe extends APIorDBVaihe {
  hyvaksymisPaatosVaiheSaamePDFt?: APIorDBKuulutusSaamePDFt | null;
  aineistoNahtavilla?: APIorDBAineistoOrLadattuTiedosto[] | null;
  hyvaksymisPaatos?: APIorDBAineistoOrLadattuTiedosto[] | null;
}

/**
 *
 * @param hyvaksymisPaatosVaihe : HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu, API.HyvaksymisPaatosVaihe, API.HyvaksymisPaatosVaiheJulkaisu, API.HyvaksymisPaatosVaiheJulkinen
 * @returns hyvaksymisPaatosVaihe, mutta aikaleimat on korvattu ***unittest***:lla. Aineiston ja lisaAineiston Parametria ei muokata.
 */
export function cleanupHyvaksymisPaatosVaiheTimestamps<H extends APIorDBHyvaksymisPaatosVaihe>(
  hyvaksymisPaatosVaihe: H | null | undefined
): H | null | undefined {
  if (!hyvaksymisPaatosVaihe) {
    return hyvaksymisPaatosVaihe;
  }
  const cleanHyvaksymisPaatosVaihe: H = {
    ...hyvaksymisPaatosVaihe,
    ...cleanupVaiheTimestamps(hyvaksymisPaatosVaihe),
  };

  if (cleanHyvaksymisPaatosVaihe.aineistoNahtavilla) {
    cleanHyvaksymisPaatosVaihe.aineistoNahtavilla = cleanHyvaksymisPaatosVaihe.aineistoNahtavilla.map(aineistoOrLadattuTiedostoCleanupFunc);
  }
  if (cleanHyvaksymisPaatosVaihe.hyvaksymisPaatos) {
    cleanHyvaksymisPaatosVaihe.hyvaksymisPaatos = cleanHyvaksymisPaatosVaihe.hyvaksymisPaatos.map(aineistoOrLadattuTiedostoCleanupFunc);
  }

  cleanHyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt = cleanupSaamePDFt(cleanHyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt);

  return cleanHyvaksymisPaatosVaihe;
}

/**
 *
 * @param obj
 * @returns vastaava uusi obj kuin obj, mutta jossa avaimista generoidut id:t on korvattu ***unittest***:llä. Parametria ei muokata.
 */
export function cleanupGeneratedIds<T extends Record<string, any>>(obj: T): Record<string, any> {
  return Object.keys(obj).reduce((cleanObj: Record<string, any>, key: string) => {
    const cleanedUpKey: string = key.replace(/[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/g, "***unittest***");
    cleanObj[cleanedUpKey] = obj[key] as Record<string, any>;
    return cleanObj;
  }, {} as Record<string, any>);
}

export function cleanupUrlsInPDF(pdfText: string): string {
  return pdfText.replace(/http\S+nahtavillaolo/g, "***unittest***");
  // .replace(/http\S+suunnittelu/g, "***unittest***")
  // .replace(/http\S+aloituskuulutus/g, "***unittest***");
}
