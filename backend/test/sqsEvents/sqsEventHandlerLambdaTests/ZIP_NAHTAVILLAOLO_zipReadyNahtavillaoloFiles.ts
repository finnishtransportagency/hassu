import { DBProjekti } from "../../../src/database/model";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import { fakeEventInSqsQueue, getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa, stubBasics } from "./util/util";
import {
  hyvaksymatonNahtavillaoloJulkaisuAineistoB,
  hyvaksyttyNahtavillaoloJulkaisuAineistoA,
  nahtavillaoloVaiheAineistoC,
} from "./util/nahtavillaoloTestData";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";

// eventSqsHandlerLambda handles event ZIP_NAHTAVILLAOLO by zipping nahtavillaolovaihe files but not files that are to be removed or are not imported or files from julkaisus
export const zipNahtavillaoloZipsReadyNahtavillaoloFiles = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.ZIP_NAHTAVILLAOLO, projektiOid: "1" });
  const projekti: DBProjekti = {
    oid: "1",
    versio: 1,
    kayttoOikeudet: [],
    salt: "salt",
    nahtavillaoloVaihe: {
      id: 3,
      aineistoNahtavilla: getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa("nahtavillaolo_vaihe", "nahtavillaolo/3", "osa_a"),
    },
    nahtavillaoloVaiheJulkaisut: [hyvaksyttyNahtavillaoloJulkaisuAineistoA, hyvaksymatonNahtavillaoloJulkaisuAineistoB],
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
    nahtavillaoloVaihe: {
      ...nahtavillaoloVaiheAineistoC,
      id: 3,
      aineistoNahtavilla: getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa("nahtavillaolo_vaihe", "nahtavillaolo/3", "osa_a"),
      aineistopaketti: "/nahtavillaolo/3/aineisto.zip",
    },
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
        s3Key: "yllapito/tiedostot/projekti/1/nahtavillaolo/3/nahtavillaolo_vaihe_aineisto_valmis.txt",
        zipFolder: "Selostusosa/",
      },
    ],
    "yllapito/tiedostot/projekti/1/nahtavillaolo/3/aineisto.zip",
  ];
  expect(zipFilesFirstArgs).to.eql(expectedZipFilesFirstArgs);
};
