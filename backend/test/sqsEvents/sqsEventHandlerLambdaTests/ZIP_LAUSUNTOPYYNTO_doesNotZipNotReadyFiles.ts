import { Aineisto, DBProjekti, LausuntoPyynto } from "../../../src/database/model";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import { fakeEventInSqsQueue, getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa, stubBasics } from "./util/util";
import {
  hyvaksymatonNahtavillaoloJulkaisuAineistoB,
  hyvaksyttyNahtavillaoloJulkaisuAineistoA,
  nahtavillaoloVaiheAineistoC,
} from "./util/nahtavillaoloTestData";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";

// eventSqsHandlerLambda reacts to event ZIP_LAUSUNTOPYYNTO by zipping lausuntoPyynto files, but not files that are to be removed or are not imported
export const zipLausuntoPyyntoDoesNotZipNotReadyFiles = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.ZIP_LAUSUNTOPYYNTO, projektiOid: "1", uuid: "joku-uuid" });
  const lisaAineistot: Aineisto[] = getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa("lisa", "lausuntopyynto/joku-uuid");
  const lausuntoPyynnot: LausuntoPyynto[] = [
    {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      lisaAineistot,
    },
  ];
  const projekti: DBProjekti = {
    oid: "1",
    versio: 1,
    kayttoOikeudet: [],
    salt: "salt",
    nahtavillaoloVaihe: nahtavillaoloVaiheAineistoC,
    nahtavillaoloVaiheJulkaisut: [
      {
        ...hyvaksyttyNahtavillaoloJulkaisuAineistoA,
        aineistoNahtavilla: getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa("nahtavillaolo", "nahtavillaolo/1", "osa_a"),
      },
      hyvaksymatonNahtavillaoloJulkaisuAineistoB,
    ],
    lausuntoPyynnot,
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
    lausuntoPyynnot: [
      {
        uuid: "joku-uuid",
        poistumisPaiva: "2022-01-01",
        lisaAineistot,
        aineistopaketti: "/lausuntopyynto/joku-uuid/aineisto.zip",
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
        s3Key: "yllapito/tiedostot/projekti/1/nahtavillaolo/1/nahtavillaolo_aineisto_valmis.txt",
        zipFolder: "Selostusosa/",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/1/lausuntopyynto/joku-uuid/lisa_aineisto_valmis.txt",
        zipFolder: "lisa-aineistot/",
      },
    ],
    "yllapito/tiedostot/projekti/1/lausuntopyynto/joku-uuid/aineisto.zip",
  ];
  expect(zipFilesFirstArgs).to.eql(expectedZipFilesFirstArgs);
};
