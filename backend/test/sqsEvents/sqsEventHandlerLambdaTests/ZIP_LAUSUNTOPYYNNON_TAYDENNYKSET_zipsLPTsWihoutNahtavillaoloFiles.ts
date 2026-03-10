import { DBProjekti, LadattuTiedosto, LausuntoPyynnonTaydennys } from "../../../src/database/model";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import { fakeEventInSqsQueue, stubBasics } from "./util/util";
import {
  hyvaksymatonNahtavillaoloJulkaisuAineistoB,
  hyvaksyttyNahtavillaoloJulkaisuAineistoA,
  nahtavillaoloVaiheAineistoC,
} from "./util/nahtavillaoloTestData";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";

// eventSqsHandlerLambda react to event ZIP_LAUSUNTOPYYNNON_TAYDENNYKSET by zipping lausuntoPyynnonTaydennys files without nahtavillaolo files
export const zipLausuntoPyynnonTaydennyksetZipsLPTsWithoutNahtavillaoloFiles = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.ZIP_LAUSUNTOPYYNNON_TAYDENNYKSET, projektiOid: "1" });
  const muistutukset: LadattuTiedosto[] = [
    {
      tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/Tiedosto%201.txt",
      nimi: "Tiedosto%201.txt",
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 2,
      uuid: "deed5381-974e-447f-8b05-ff8bec1a1978",
    },
  ];
  const muuAineisto: LadattuTiedosto[] = [
    {
      tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/Aineisto%20123.txt",
      nimi: "Aineisto%20123.txt",
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 2,
      uuid: "e3c166b8-2aaa-4fe4-8b09-2211ea6dc4ea",
    },
  ];
  const lausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennys[] = [
    {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      muuAineisto,
      muistutukset,
      kunta: 1,
    },
  ];
  const projekti: DBProjekti = {
    oid: "1",
    versio: 1,
    kayttoOikeudet: [],
    salt: "salt",
    nahtavillaoloVaihe: nahtavillaoloVaiheAineistoC,
    nahtavillaoloVaiheJulkaisut: [hyvaksyttyNahtavillaoloJulkaisuAineistoA, hyvaksymatonNahtavillaoloJulkaisuAineistoB],
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
        muistutukset,
        muuAineisto,
        kunta: 1,
        aineistopaketti: "/lausuntopyynnon_taydennys/joku-uuid/aineisto.zip",
      },
    ],
  };
  expect(saveProjektiFirstArgs).to.eql(expectedSaveProjektiFirstArgs);
  expect(zipFilesStub.callCount).to.eql(1);
  expect(zipFilesStub.firstCall).to.exist;
  expect(zipFilesStub.firstCall.args).to.exist;
  const zipFilesFirstArgs = zipFilesStub.firstCall.args;
  const expectedZipFilesFirstArgs = [
    "hassu-localstack-yllapito",
    [
      {
        s3Key: "yllapito/tiedostot/projekti/1/lausuntopyynnon_taydennys/joku-uuid/Tiedosto%201.txt",
        zipFolder: "Muistutukset/",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/1/lausuntopyynnon_taydennys/joku-uuid/Aineisto%20123.txt",
        zipFolder: "Muu aineisto/",
      },
    ],
    "yllapito/tiedostot/projekti/1/lausuntopyynnon_taydennys/joku-uuid/aineisto.zip",
  ];
  expect(zipFilesFirstArgs).to.eql(expectedZipFilesFirstArgs);
};
