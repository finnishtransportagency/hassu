import sinon from "sinon";
import {
  filesChangedPersistsAndDeletesLausuntoPyynnonTaydennysFiles,
  aineistoChangedRemovesLausuntoPyynnonTaydennysFiles,
  aineistoChangedRemovesLausuntoPyynnonTaydennysAndHandlesAineistoChanges,
  zipLausuntoPyynnonTaydennyksetZipsLPTs,
  zipLausuntoPyyntoZipsLausuntoPyyntoFiles,
  zipLausuntoPyyntoZipsSpecifiedLausuntoPyynto,
  zipLausuntoPyynnotAddsZipLausuntoPyyntoEventsToQueue,
  zipLausuntoPyynnonTaydennyksetZipsLPTsWithoutNahtavillaoloFiles,
  zipLausuntoPyynnonTaydennyksetDoesNotZipNotReadyFiles,
  zipLausuntoPyyntoDoesNotZipNotReadyFiles,
  aineistoChangedRemovesLausuntoPyynto,
  aineistoChangedRemovesLausuntoPyyntoAndHandlesChanges,
  zipNahtavillaoloZipsReadyNahtavillaoloFiles,
  zipLausuntoPyynnonTaydennyksetZipsAllLPTevenWithNoFiles,
  zipLausuntoPyynnotDoesNotCreateZipEventsForRemovedLP,
  zipLausuntoPyyntoDoesNothingForRemoved,
  aineistoAndFilesChangedHandlesVuorovaikutusKierrosJulkaisu,
  aineistoAndFilesChangesHandlesCorrectlyLPTs,
} from "./sqsEventHandlerLambdaTests";

describe("sqsEventHandlerLambda handles event", () => {
  afterEach(() => {
    sinon.restore();
    sinon.reset();
  });

  // FILES_CHANGED tests

  it(
    "FILES_CHANGED by persisting and deleting lausuntoPyynnonTaydennys files when there is one lausuntoPyynnonTaydennys",
    filesChangedPersistsAndDeletesLausuntoPyynnonTaydennysFiles
  );

  // AINEISTO_CHANGED tests

  it(
    "AINEISTO_CHANGED by removing lausuntoPyynnonTaydennys that are marked to be removed",
    aineistoChangedRemovesLausuntoPyynnonTaydennysFiles
  );

  it(
    "AINEISTO_CHANGED by removing lausuntoPyynnonTaydennys that are marked to be removed and handling changed aineisto for others",
    aineistoChangedRemovesLausuntoPyynnonTaydennysAndHandlesAineistoChanges
  );

  it("AINEISTO_CHANGED by removing lausuntoPyynto that is marked to be removed", aineistoChangedRemovesLausuntoPyynto);

  it(
    "AINEISTO_CHANGED by removing lausuntoPyynto that is marked to be removed and handling changed aineistos",
    aineistoChangedRemovesLausuntoPyyntoAndHandlesChanges
  );

  // ZIP_LAUSUNTOPYYNTO tests

  it("ZIP_LAUSUNTOPYYNTO by zipping lausuntoPyynto files", zipLausuntoPyyntoZipsLausuntoPyyntoFiles);

  it(
    "ZIP_LAUSUNTOPYYNTO by zipping specified lausuntoPyynto when there are multiple lausuntoPyyntos",
    zipLausuntoPyyntoZipsSpecifiedLausuntoPyynto
  );

  it(
    "ZIP_LAUSUNTOPYYNTO by zipping lausuntoPyynto files, but not files that are to be removed or are not imported",
    zipLausuntoPyyntoDoesNotZipNotReadyFiles
  );

  it("ZIP_LAUSUNTOPYYNTO by doing nothing if lausuntoPyynto is marked to be removed", zipLausuntoPyyntoDoesNothingForRemoved);

  // ZIP_LAUSUNTOPYYNNOT tests

  it("ZIP_LAUSUNTOPYYNNOT by adding ZIP_LAUSUNTOPYYNTO events to sqsQueue", zipLausuntoPyynnotAddsZipLausuntoPyyntoEventsToQueue);

  it(
    "ZIP_LAUSUNTOPYYNNOT by adding ZIP_LAUSUNTOPYYNTO events, but not for lausuntoPyynto that are marked to be removed",
    zipLausuntoPyynnotDoesNotCreateZipEventsForRemovedLP
  );

  // ZIP_LAUSUNTOPYYNNON_TAYDENNYKSET tests

  it(
    "ZIP_LAUSUNTOPYYNNON_TAYDENNYKSET by zipping lausuntoPyynnonTaydennys files without nahtavillaolo files",
    zipLausuntoPyynnonTaydennyksetZipsLPTsWithoutNahtavillaoloFiles
  );
  it(
    "ZIP_LAUSUNTOPYYNNON_TAYDENNYKSET by zipping lausuntoPyynnonTaydennys files of all lausuntoPyynnonTaydennys, even when some have no files",
    zipLausuntoPyynnonTaydennyksetZipsAllLPTevenWithNoFiles
  );

  it("ZIP_LAUSUNTOPYYNNON_TAYDENNYKSET by zipping lausuntoPyynnonTaydennys files", zipLausuntoPyynnonTaydennyksetZipsLPTs);

  it(
    "ZIP_LAUSUNTOPYYNNON_TAYDENNYKSET by zipping lausuntoPyynnonTaydennys files, but not non-persisted / ODOTTAA_TUONTIA or to-be-removed files",
    zipLausuntoPyynnonTaydennyksetDoesNotZipNotReadyFiles
  );

  // ZIP_NAHTAVILLAOLO tests

  it(
    "ZIP_NAHTAVILLAOLO by zipping nahtavillaolovaihe files but not files that are to be removed or are not imported or files from julkaisus",
    zipNahtavillaoloZipsReadyNahtavillaoloFiles
  );

  // AINEISTO_AND_FILES_CHANGED tests

  it(
    "AINEISTO_AND_FILES_CHANGED by handling vuorovaikutusKierrosJulkaisu aineistos",
    aineistoAndFilesChangedHandlesVuorovaikutusKierrosJulkaisu
  );

  it("AINEISTO_AND_FILES_CHANGED by handling correctly lausuntoPyynnonTaydennykset", aineistoAndFilesChangesHandlesCorrectlyLPTs);
});
