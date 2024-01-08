import * as API from "hassu-common/graphql/apiModel";
import { Aineisto } from "../../../../database/model";
import { ProjektiAdaptationResult } from "../../projektiAdaptationResult";
import remove from "lodash/remove";
import cloneDeep from "lodash/cloneDeep";
import { uniqBy } from "lodash";

export function adaptAineistotToSave(
  dbAineistot: Aineisto[] | undefined | null,
  aineistotInput: API.AineistoInput[] | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): Aineisto[] | undefined {
  const resultAineistot: Aineisto[] = [];

  if (!aineistotInput) {
    return dbAineistot ?? undefined;
  }

  const inputs = cloneDeep(aineistotInput);

  let hasPendingChanges = examineAndUpdateExistingDocuments(dbAineistot, inputs, resultAineistot);

  // Add new ones and optionally trigger import later
  for (const aineistoInput of inputs) {
    resultAineistot.push({
      dokumenttiOid: aineistoInput.dokumenttiOid,
      nimi: aineistoInput.nimi,
      kategoriaId: aineistoInput.kategoriaId ?? undefined,
      jarjestys: aineistoInput.jarjestys,
      tila: aineistoInput.tila == API.AineistoTila.ODOTTAA_POISTOA ? API.AineistoTila.ODOTTAA_POISTOA : API.AineistoTila.ODOTTAA_TUONTIA,
      uuid: aineistoInput.uuid,
    });
    hasPendingChanges = true;
  }

  if (hasPendingChanges) {
    projektiAdaptationResult.aineistoChanged();
  }

  // Poistetaan duplikaatit
  return uniqBy(resultAineistot, (a) => a.dokumenttiOid + a.tila + a.nimi);
}

function examineAndUpdateExistingDocuments(
  dbAineistot: Aineisto[] | null | undefined,
  inputs: API.AineistoInput[],
  resultAineistot: Aineisto[]
) {
  let hasPendingChanges = false;
  if (dbAineistot) {
    const aineistot = cloneDeep(dbAineistot);
    // Jos pyydetään aineiston poistoa, poista aineisto ja jatka muuta käsittelyä vasta sen jälkeen
    const deletedInputs = inputs
      .filter((ai) => ai.tila == API.AineistoTila.ODOTTAA_POISTOA)
      .map((ai) => {
        // Poista kaikki poistettavat aineistot listasta
        // Varmista kaikkien tilaksi ODOTTAA_POISTOA
        resultAineistot.push(
          ...remove(aineistot, (a) => a.dokumenttiOid == ai.dokumenttiOid).map((a) => {
            a.tila = API.AineistoTila.ODOTTAA_POISTOA;
            return a;
          })
        );
        return ai;
      });

    if (deletedInputs.length > 0) {
      hasPendingChanges = true;
    }
    remove(inputs, (i) => deletedInputs.indexOf(i) >= 0);

    // Säilytä olemassa olevat tai tuo uudet jos nimi on vaihtunut
    aineistot.forEach((dbAineisto) => {
      const updateAineistoInput = pickAineistoFromInputByDocumenttiOid(inputs, dbAineisto.dokumenttiOid);
      if (updateAineistoInput) {
        // Update existing one
        dbAineisto.jarjestys = updateAineistoInput.jarjestys;
        if (dbAineisto.kategoriaId !== updateAineistoInput.kategoriaId) {
          dbAineisto.kategoriaId = updateAineistoInput.kategoriaId ?? undefined;
          dbAineisto.kategoriaMuuttunut = true;
          hasPendingChanges = true;
        }
        if (dbAineisto.nimi !== updateAineistoInput.nimi) {
          hasPendingChanges = true;
          resultAineistot.push({ ...dbAineisto, tila: API.AineistoTila.ODOTTAA_POISTOA });
          dbAineisto.tila = API.AineistoTila.ODOTTAA_TUONTIA;
          dbAineisto.nimi = updateAineistoInput.nimi;
        }
      }
      resultAineistot.push(dbAineisto);
    });
  }
  return hasPendingChanges;
}

export function pickAineistoFromInputByDocumenttiOid(
  aineistotInput: API.AineistoInput[],
  dokumenttiOid: string
): API.AineistoInput | undefined {
  if (aineistotInput) {
    const sortedAineistotInput = aineistotInput.sort((a, b) => {
      if (a.tila == API.AineistoTila.ODOTTAA_POISTOA) {
        return -1;
      } else if (b.tila == API.AineistoTila.ODOTTAA_POISTOA) {
        return 1;
      }
      return 0;
    });
    const matchedElements = remove(sortedAineistotInput, (item) => item.dokumenttiOid === dokumenttiOid);
    if (matchedElements.length > 0) {
      return matchedElements[0];
    }
  }
  return undefined;
}
