import { AineistoTila, LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../../database/model";
import { eventSqsClient } from "../eventSqsClient";

export async function triggerAineistoTiedostoEventsBasedOnNeeds(projekti: DBProjekti) {
  const oid = projekti.oid;
  if (changesNeededToAineistoOrTiedosto(projekti.vuorovaikutusKierros)) {
    await eventSqsClient.handleVuorovaikutusAineistoChanged(oid);
  }
  if (projekti.vuorovaikutusKierrosJulkaisut) {
    for (const julkaisu of projekti.vuorovaikutusKierrosJulkaisut) {
      if (changesNeededToAineistoOrTiedosto(julkaisu)) {
        await eventSqsClient.handleVuorovaikutusKierrosJulkaisuAineistoChanged(oid, julkaisu.id);
      }
    }
  }
  if (changesNeededToAineistoOrTiedosto(projekti.nahtavillaoloVaihe)) {
    await eventSqsClient.handleNahtavillaoloAineistoChanged(oid);
  }
  if (projekti.lausuntoPyynnot) {
    for (const lp of projekti.lausuntoPyynnot) {
      if (changesNeededToAineistoOrTiedosto(lp)) {
        await eventSqsClient.handleLausuntoPyynnotLisaAineistoChanged(oid, lp.uuid);
      }
    }
  }
  if (projekti.lausuntoPyynnonTaydennykset) {
    for (const lpt of projekti.lausuntoPyynnonTaydennykset) {
      if (changesNeededToAineistoOrTiedosto(lpt.muuAineisto)) {
        await eventSqsClient.handleLausuntoPyynnonTaydennysMuuAineistoChanged(oid, lpt.uuid);
      }
      if (changesNeededToAineistoOrTiedosto(lpt.muistutukset)) {
        eventSqsClient.handleLausuntoPyynnonTaydennysMuistutuksetChanged(oid, lpt.uuid);
      }
    }
  }
  if (projekti.hyvaksymisPaatosVaihe) {
    if (changesNeededToAineistoOrTiedosto(projekti.hyvaksymisPaatosVaihe.hyvaksymisPaatos)) {
      await eventSqsClient.handleHyvaksymisvaiheHyvaksymispaatosChanged(oid);
    }
    if (changesNeededToAineistoOrTiedosto(projekti.hyvaksymisPaatosVaihe.aineistoNahtavilla)) {
      await eventSqsClient.handleHyvaksymisvaiheAineistoChanged(oid);
    }
  }
  if (projekti.jatkoPaatos1Vaihe) {
    if (changesNeededToAineistoOrTiedosto(projekti.jatkoPaatos1Vaihe.hyvaksymisPaatos)) {
      await eventSqsClient.handleJatkopaatos1HyvaksymispaatosChanged(oid);
    }
    if (changesNeededToAineistoOrTiedosto(projekti.jatkoPaatos1Vaihe.aineistoNahtavilla)) {
      await eventSqsClient.handleJatkopaatos1AineistoChanged(oid);
    }
  }
  if (projekti.jatkoPaatos2Vaihe) {
    if (changesNeededToAineistoOrTiedosto(projekti.jatkoPaatos2Vaihe.hyvaksymisPaatos)) {
      await eventSqsClient.handleJatkopaatos2HyvaksymispaatosChanged(oid);
    }
    if (changesNeededToAineistoOrTiedosto(projekti.jatkoPaatos2Vaihe.aineistoNahtavilla)) {
      await eventSqsClient.handleJatkopaatos2AineistoChanged(oid);
    }
  }
}

export function changesNeededToAineistoOrTiedosto(construct: any): boolean {
  if (!construct) {
    return false;
  } else if (Array.isArray(construct)) {
    return construct.some((item) => changesNeededToAineistoOrTiedosto(item));
  } else {
    return Object.values(construct).some((value: any) => {
      if (typeof value == "object") {
        return changesNeededToAineistoOrTiedosto(value);
      } else if (Array.isArray(value)) {
        return value.some((item) => changesNeededToAineistoOrTiedosto(item));
      } else {
        if (
          [
            AineistoTila.ODOTTAA_POISTOA,
            AineistoTila.ODOTTAA_TUONTIA,
            LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
            LadattuTiedostoTila.ODOTTAA_POISTOA,
          ].includes(value)
        ) {
          return true;
        } else {
          return false;
        }
      }
    });
  }
}
