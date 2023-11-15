import sinon from "sinon";
import {
  addedAineistoAddedTiedosto,
  removedAineistoRemovedTiedosto,
  removedAineistoAddedTiedosto,
  addedAineistoRemovedTiedosto,
  removedAineistoRemovedTiedostoButBothNotYetValmis,
  addedAineisto,
  addedTiedosto,
  removedAineisto,
  noChanges,
  addedTiedostoAgainBeforePersisting,
} from "./adaptProjektiToSaveTests/adaptLausuntoPyynnonTaydennyksetTests";
import {
  addedAineisto as addedAineistoLP,
  removedAineisto as removedAineistoLP,
  noChanges as noChangesLP,
} from "./adaptProjektiToSaveTests/adaptLausuntoPyyntoTests";

describe("adaptProjektiToSave produces correct events and adapted projekti when saving changes to lausuntoPyynnonTaydennykset", () => {
  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });
  it("when adding aineisto and adding tiedosto", addedAineistoAddedTiedosto);

  it("when removing aineisto and removing tiedosto", removedAineistoRemovedTiedosto);

  it("when removing aineisto and adding tiedosto", removedAineistoAddedTiedosto);

  it("when adding tiedosto and removing aineisto", addedAineistoRemovedTiedosto);

  it("when removing aineisto and removing tiedosto that are not imported/persisted yet", removedAineistoRemovedTiedostoButBothNotYetValmis);

  it("when adding aineisto", addedAineisto);

  it("when adding tiedosto", addedTiedosto);

  it("when removing aineisto", removedAineisto);

  it("when making no changes to aineisto or tiedosto", noChanges);

  it("when adding the same tiedosto again, before it has been persisted", addedTiedostoAgainBeforePersisting);
});

describe("adaptProjektiToSave produces correct events and adapterd projekti when saving changes to lausuntoPyynnot", () => {
  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });
  it("when adding aineisto", addedAineistoLP);

  it("when removing aineisto", removedAineistoLP);

  it("when making no changes to aineisto", noChangesLP);
});
