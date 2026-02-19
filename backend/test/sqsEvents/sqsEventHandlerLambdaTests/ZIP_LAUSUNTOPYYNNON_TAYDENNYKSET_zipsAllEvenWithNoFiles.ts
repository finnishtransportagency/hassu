import { LadattuTiedosto, DBProjekti, LausuntoPyynnonTaydennys } from "../../../src/database/model";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import { fakeEventInSqsQueue, stubBasics } from "./util/util";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";

// eventSqsHandlerLambda reacts to event ZIP_LAUSUNTOPYYNNON_TAYDENNYKSET by zipping lausuntoPyynnonTaydennys files of all lausuntoPyynnonTaydennys, even when some have no files
export const zipLausuntoPyynnonTaydennyksetZipsAllLPTevenWithNoFiles = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.ZIP_LAUSUNTOPYYNNON_TAYDENNYKSET, projektiOid: "1" });
  const muuAineisto: LadattuTiedosto[] = [
    {
      tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/Tiedosto%201.txt",
      nimi: "Tiedosto%201.txt",
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 2,
      uuid: "0a9b772c-7fb1-4127-803d-3f4186ffa999",
    },
  ];
  const lausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennys[] = [
    {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      muuAineisto,
      kunta: 1,
    },
    {
      uuid: "joku-toinen-uuid",
      poistumisPaiva: "2022-01-02",
      muuAineisto: undefined,
      kunta: 2,
    },
  ];
  const projekti: DBProjekti = {
    oid: "1",
    versio: 1,
    kayttoOikeudet: [],
    salt: "salt",
    lausuntoPyynnonTaydennykset,
    tallennettu: true,
    velho: { nimi: "Projekti 1" },
  };
  const { saveProjektiInternalStub, zipFilesStub } = stubBasics({
    loadProjektiByOidReturnValue: projekti,
    applyProjektiStatusSetStatus: API.Status.NAHTAVILLAOLO,
  });
  await handler();
  expect(saveProjektiInternalStub.callCount).to.eql(1);
  expect(saveProjektiInternalStub.firstCall).to.exist;
  expect(saveProjektiInternalStub.firstCall.args).to.exist;
  expect(saveProjektiInternalStub.firstCall.args[0]).to.exist;
  const saveProjektiFirstArgs = saveProjektiInternalStub.firstCall.args[0];
  const expectedSaveProjektiFirstArgs = {
    oid: "1",
    versio: 1,
    lausuntoPyynnonTaydennykset: [
      {
        uuid: "joku-uuid",
        poistumisPaiva: "2022-01-01",
        muuAineisto,
        kunta: 1,
        aineistopaketti: "/lausuntopyynnon_taydennys/joku-uuid/aineisto.zip",
      },
      {
        uuid: "joku-toinen-uuid",
        poistumisPaiva: "2022-01-02",
        muuAineisto: undefined,
        kunta: 2,
        aineistopaketti: "/lausuntopyynnon_taydennys/joku-toinen-uuid/aineisto.zip",
      },
    ],
  };
  expect(saveProjektiFirstArgs).to.eql(expectedSaveProjektiFirstArgs);
  expect(zipFilesStub.callCount).to.eql(2);
  expect(zipFilesStub.firstCall).to.exist;
  expect(zipFilesStub.firstCall.args).to.exist;
  const zipFilesFirstArgs = zipFilesStub.firstCall.args;
  const expectedZipFilesFirstArgs = [
    "hassu-localstack-yllapito",
    [
      {
        s3Key: "yllapito/tiedostot/projekti/1/lausuntopyynnon_taydennys/joku-uuid/Tiedosto%201.txt",
        zipFolder: "Muu aineisto/",
      },
    ],
    "yllapito/tiedostot/projekti/1/lausuntopyynnon_taydennys/joku-uuid/aineisto.zip",
  ];
  expect(zipFilesFirstArgs).to.eql(expectedZipFilesFirstArgs);
  expect(zipFilesStub.secondCall).to.exist;
  expect(zipFilesStub.secondCall.args).to.exist;
  const zipFilesSecondArgs = zipFilesStub.secondCall.args;
  const expectedZipFilesSecondArgs = [
    "hassu-localstack-yllapito",
    [],
    "yllapito/tiedostot/projekti/1/lausuntopyynnon_taydennys/joku-toinen-uuid/aineisto.zip",
  ];
  expect(zipFilesSecondArgs).to.eql(expectedZipFilesSecondArgs);
};
