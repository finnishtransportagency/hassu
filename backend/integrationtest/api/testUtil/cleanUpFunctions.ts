import * as API from "../../../../common/graphql/apiModel";
import {
  Aineisto,
  AloitusKuulutusJulkaisu,
  HyvaksymisPaatosVaiheJulkaisu,
  KuulutusSaamePDFt,
  NahtavillaoloVaiheJulkaisu,
} from "../../../src/database/model";
import { GenericApiKuulutusJulkaisu } from "../../../src/projekti/projektiUtil";
import { cleanupAnyProjektiData } from "../testFixtureRecorder";
import { forEverySaameDo } from "../../../src/projekti/adapter/common";

export function cleanupGeneratedIdAndTimestampFromFeedbacks(feedbacks?: API.Palaute[]): API.Palaute[] | undefined {
  return feedbacks
    ? feedbacks.map((palaute) => {
        cleanupAnyProjektiData(palaute);
        palaute.liite = palaute?.liite?.replace(palaute.id, "***unittest***");
        palaute.id = "***unittest***";
        palaute.vastaanotettu = "***unittest***";
        return palaute;
      })
    : undefined;
}

export function cleanupVuorovaikutusKierrosTimestamps(
  vuorovaikutusKierros: API.VuorovaikutusKierros | API.VuorovaikutusKierrosJulkaisu | API.VuorovaikutusKierrosJulkinen
): API.VuorovaikutusKierros | API.VuorovaikutusKierrosJulkaisu | API.VuorovaikutusKierrosJulkinen {
  vuorovaikutusKierros.esittelyaineistot?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  vuorovaikutusKierros.suunnitelmaluonnokset?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  if (Object.keys(vuorovaikutusKierros).includes("__typename")) {
    (vuorovaikutusKierros as API.VuorovaikutusKierros).esittelyaineistot?.forEach(aineistoCleanupFunc);
    (vuorovaikutusKierros as API.VuorovaikutusKierros).suunnitelmaluonnokset?.forEach(aineistoCleanupFunc);
  }
  return vuorovaikutusKierros;
}

function aineistoCleanupFunc(aineisto: API.Aineisto | Aineisto) {
  if (aineisto.tuotu) {
    aineisto.tuotu = "***unittest***";
  }
}

export function cleanupAloituskuulutusTimestamps(
  aloituskuulutus: API.AloitusKuulutus | API.AloitusKuulutusJulkaisu | AloitusKuulutusJulkaisu | null | undefined
): API.AloitusKuulutus | API.AloitusKuulutusJulkaisu | AloitusKuulutusJulkaisu | null | undefined {
  if (!aloituskuulutus) {
    return aloituskuulutus;
  }

  if ((aloituskuulutus as AloitusKuulutusJulkaisu).hyvaksymisPaiva) {
    (aloituskuulutus as AloitusKuulutusJulkaisu).hyvaksymisPaiva = "**unittest**";
  }

  if ((aloituskuulutus as AloitusKuulutusJulkaisu).ilmoituksenVastaanottajat?.kunnat?.some((kunta) => kunta.messageId)) {
    (aloituskuulutus as AloitusKuulutusJulkaisu).ilmoituksenVastaanottajat?.kunnat?.forEach((kunta) => {
      kunta.lahetetty = "***unittest***";
    });
  }

  if (aloituskuulutus.uudelleenKuulutus?.alkuperainenHyvaksymisPaiva) {
    aloituskuulutus.uudelleenKuulutus.alkuperainenHyvaksymisPaiva = "***unittest***";
  }

  if ((aloituskuulutus as AloitusKuulutusJulkaisu).ilmoituksenVastaanottajat?.viranomaiset?.some((v) => v.messageId)) {
    (aloituskuulutus as AloitusKuulutusJulkaisu).ilmoituksenVastaanottajat?.viranomaiset?.forEach((v) => {
      v.lahetetty = "***unittest***";
    });
  }
  return aloituskuulutus;
}

export function cleanupNahtavillaoloTimestamps(
  nahtavillaoloVaihe: API.NahtavillaoloVaiheJulkaisu | API.NahtavillaoloVaihe | NahtavillaoloVaiheJulkaisu | null | undefined
): API.NahtavillaoloVaiheJulkaisu | API.NahtavillaoloVaihe | NahtavillaoloVaiheJulkaisu | null | undefined {
  if (!nahtavillaoloVaihe) {
    return nahtavillaoloVaihe;
  }
  if (Object.keys(nahtavillaoloVaihe).includes("__typename")) {
    (nahtavillaoloVaihe as API.NahtavillaoloVaihe).aineistoNahtavilla?.forEach(aineistoCleanupFunc);
    (nahtavillaoloVaihe as API.NahtavillaoloVaihe).lisaAineisto?.forEach(aineistoCleanupFunc);
  }

  if ((nahtavillaoloVaihe as NahtavillaoloVaiheJulkaisu).hyvaksymisPaiva) {
    (nahtavillaoloVaihe as NahtavillaoloVaiheJulkaisu).hyvaksymisPaiva = "**unittest**";
  }

  if ((nahtavillaoloVaihe as NahtavillaoloVaiheJulkaisu).ilmoituksenVastaanottajat?.kunnat?.some((kunta) => kunta.messageId)) {
    (nahtavillaoloVaihe as NahtavillaoloVaiheJulkaisu).ilmoituksenVastaanottajat?.kunnat?.forEach((kunta) => {
      kunta.lahetetty = "***unittest***";
    });
  }

  if ((nahtavillaoloVaihe as NahtavillaoloVaiheJulkaisu).ilmoituksenVastaanottajat?.viranomaiset?.some((v) => v.messageId)) {
    (nahtavillaoloVaihe as NahtavillaoloVaiheJulkaisu).ilmoituksenVastaanottajat?.viranomaiset?.forEach((v) => {
      v.lahetetty = "***unittest***";
    });
  }

  if (nahtavillaoloVaihe.uudelleenKuulutus?.alkuperainenHyvaksymisPaiva) {
    nahtavillaoloVaihe.uudelleenKuulutus.alkuperainenHyvaksymisPaiva = "***unittest***";
  }

  const lisaAineistoParametrit = (nahtavillaoloVaihe as API.NahtavillaoloVaihe).lisaAineistoParametrit;
  if (lisaAineistoParametrit) {
    lisaAineistoParametrit.hash = "***unittest***";
    lisaAineistoParametrit.poistumisPaiva = "***unittest***";
    (nahtavillaoloVaihe as API.NahtavillaoloVaihe)["lisaAineistoParametrit"] = lisaAineistoParametrit;
  }

  cleanupSaamePDFt(nahtavillaoloVaihe.nahtavillaoloSaamePDFt);

  return nahtavillaoloVaihe;
}

function cleanupSaamePDFt(saamePDFt: API.KuulutusSaamePDFt | KuulutusSaamePDFt | null | undefined) {
  if (saamePDFt) {
    forEverySaameDo((kieli) => {
      const kuulutusPDF = saamePDFt?.[kieli]?.kuulutusPDF;
      if (kuulutusPDF) {
        kuulutusPDF.tuotu = "***unittest***";
      }
      const kuulutusIlmoitusPDF = saamePDFt?.[kieli]?.kuulutusIlmoitusPDF;
      if (kuulutusIlmoitusPDF) {
        kuulutusIlmoitusPDF.tuotu = "***unittest***";
      }
    });
  }
}

export function cleanupNahtavillaoloJulkaisuJulkinenTimestamps(
  nahtavillaoloVaihe: API.NahtavillaoloVaiheJulkaisuJulkinen | undefined | null
): API.NahtavillaoloVaiheJulkaisuJulkinen | undefined | null {
  if (nahtavillaoloVaihe) {
    nahtavillaoloVaihe.aineistoNahtavilla?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
    cleanupSaamePDFt(nahtavillaoloVaihe.nahtavillaoloSaamePDFt);
  }
  return nahtavillaoloVaihe;
}

export function cleanupUudelleenKuulutusTimestamps(kuulutus: GenericApiKuulutusJulkaisu | null | undefined): void {
  if (kuulutus?.uudelleenKuulutus?.alkuperainenHyvaksymisPaiva) {
    kuulutus.uudelleenKuulutus.alkuperainenHyvaksymisPaiva = "***unittest***";
  }
}

export function cleanupHyvaksymisPaatosVaiheTimestamps(
  vaihe: API.HyvaksymisPaatosVaiheJulkaisu | API.HyvaksymisPaatosVaihe | HyvaksymisPaatosVaiheJulkaisu | null | undefined
): API.HyvaksymisPaatosVaiheJulkaisu | API.HyvaksymisPaatosVaihe | HyvaksymisPaatosVaiheJulkaisu | null | undefined {
  if (!vaihe) {
    return vaihe;
  }

  vaihe.aineistoNahtavilla?.forEach(aineistoCleanupFunc);
  vaihe.hyvaksymisPaatos?.forEach(aineistoCleanupFunc);
  cleanupSaamePDFt(vaihe.hyvaksymisPaatosVaiheSaamePDFt);

  if ((vaihe as API.HyvaksymisPaatosVaiheJulkaisu).ilmoituksenVastaanottajat?.kunnat?.some((kunta) => kunta.lahetetty)) {
    (vaihe as API.HyvaksymisPaatosVaiheJulkaisu).ilmoituksenVastaanottajat?.kunnat?.forEach((kunta) => {
      kunta.lahetetty = "***unittest***";
    });
  }

  if ((vaihe as API.HyvaksymisPaatosVaiheJulkaisu).ilmoituksenVastaanottajat?.viranomaiset?.some((v) => v.lahetetty)) {
    (vaihe as API.HyvaksymisPaatosVaiheJulkaisu).ilmoituksenVastaanottajat?.viranomaiset?.forEach((v) => {
      v.lahetetty = "***unittest***";
    });
  }

  if ((vaihe as HyvaksymisPaatosVaiheJulkaisu).hyvaksymisPaiva) {
    (vaihe as HyvaksymisPaatosVaiheJulkaisu).hyvaksymisPaiva = "**unittest**";
  }

  if (vaihe.uudelleenKuulutus?.alkuperainenHyvaksymisPaiva) {
    vaihe.uudelleenKuulutus.alkuperainenHyvaksymisPaiva = "***unittest***";
  }

  return vaihe;
}

export function cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps(
  hyvaksymisPaatosVaihe: API.HyvaksymisPaatosVaiheJulkaisuJulkinen | null | undefined
): API.HyvaksymisPaatosVaiheJulkaisuJulkinen | null | undefined {
  if (!hyvaksymisPaatosVaihe) {
    return undefined;
  }
  hyvaksymisPaatosVaihe.aineistoNahtavilla?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  hyvaksymisPaatosVaihe.hyvaksymisPaatos?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  cleanupSaamePDFt(hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt);
  return hyvaksymisPaatosVaihe;
}

export function cleanupGeneratedIds<T extends Record<string, any>>(obj: T): Record<string, any> {
  return Object.keys(obj).reduce((cleanObj: Record<string, any>, key: string) => {
    const cleanedUpKey: string = key.replace(/[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/g, "***unittest***");
    cleanObj[cleanedUpKey] = obj[key] as Record<string, any>;
    return cleanObj;
  }, {} as Record<string, any>);
}

export function cleanupNahtavillaUrlsInPDF(pdfText: string): string {
  return pdfText.replace(/http\S+nahtavillaolo/g, "***unittest***");
}

export function cleanupNahtavillaoloJulkaisuJulkinenNahtavillaUrls(
  nahtavillaoloVaihe: API.NahtavillaoloVaiheJulkaisuJulkinen | undefined | null
): API.NahtavillaoloVaiheJulkaisuJulkinen | undefined | null {
  if (nahtavillaoloVaihe && nahtavillaoloVaihe.kuulutusTekstit && nahtavillaoloVaihe.kuulutusTekstit.infoTekstit) {
    nahtavillaoloVaihe.kuulutusTekstit.infoTekstit = nahtavillaoloVaihe.kuulutusTekstit.infoTekstit.map((infoTeksti) =>
      cleanupNahtavillaUrlsInPDF(infoTeksti)
    );
  }
  return nahtavillaoloVaihe;
}
