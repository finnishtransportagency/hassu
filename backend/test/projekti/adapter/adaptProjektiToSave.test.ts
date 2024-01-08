import sinon from "sinon";
import {
  addedMuuAineistoAndMuistutus,
  removedMuuAineistoRemovedMuistutus,
  removedMuuAineistoAddedMuistutus,
  addedMuuAineistoRemovedMuistutus,
  removedMuuAineistoRemovedMuistutusButBothNotYetValmis,
  addedMuuAineisto,
  addedMuistutus,
  removedMuuAineisto,
  noChanges,
  addedMuistutusAgainBeforePersisting,
} from "./adaptProjektiToSaveTests/adaptLausuntoPyynnonTaydennyksetTests";
import {
  addedLisaAineisto,
  removedLisaAineisto,
  noChanges as noChangesLP,
  changeFilesOrder,
  removedLisaAineistoNotYetPersisted,
  threeFilesWithSameName,
  inputHasOldInfo,
  addedLisaAineistoNotYetRemoved,
} from "./adaptProjektiToSaveTests/adaptLausuntoPyyntoTests";

describe("adaptProjektiToSave produces correct events and adapted projekti when saving changes to lausuntoPyynnonTaydennykset", () => {
  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });
  it("when adding muuAineisto and muistutus", addedMuuAineistoAndMuistutus);

  it("when removing muuAineisto and removing muistutus", removedMuuAineistoRemovedMuistutus);

  it("when removing muuAineisto and adding muistutus", removedMuuAineistoAddedMuistutus);

  it("when adding muuAineisto and removing muistutus", addedMuuAineistoRemovedMuistutus);

  it(
    "when removing muuAineisto and removing muistutus that are not imported/persisted yet",
    removedMuuAineistoRemovedMuistutusButBothNotYetValmis
  );

  it("when adding muuAineisto", addedMuuAineisto);

  it("when adding muistutus", addedMuistutus);

  it("when removing muuAineisto", removedMuuAineisto);

  it("when making no changes to muuAineisto or muistutukset", noChanges);

  it("when adding the same muistutus again, before it has been persisted", addedMuistutusAgainBeforePersisting);
});

describe("adaptProjektiToSave produces correct events and adapterd projekti when saving changes to lausuntoPyynnot", () => {
  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });
  it("when adding lisaAineisto", addedLisaAineisto);

  it("when removing aineisto", removedLisaAineisto);

  it("when making no changes to lisaAineisto", noChangesLP);

  it("when changing the order of lisaAineisto", changeFilesOrder);

  it("when removing a file not yet persisted", removedLisaAineistoNotYetPersisted);

  it("when trying to remove something 'twice', and db has three files with same name", threeFilesWithSameName);

  it("when input has old info about file readiness", inputHasOldInfo);

  it("when trying to add back a file that is not yet removed", addedLisaAineistoNotYetRemoved);
});
