import { DBProjekti, LadattuTiedosto, LausuntoPyynto } from "../../../src/database/model";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import { fakeEventInSqsQueue, stubBasics } from "./util/util";
import {
  hyvaksymatonNahtavillaoloJulkaisuAineistoB,
  hyvaksyttyNahtavillaoloJulkaisuAineistoA,
  nahtavillaoloVaiheAineistoC,
} from "./util/nahtavillaoloTestData";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";

//eventSqsHandlerLambda reacts to event ZIP_LAUSUNTOPYYNTO by zipping specified lausuntoPyynto when there are multiple lausuntoPyyntos
export const zipLausuntoPyyntoZipsSpecifiedLausuntoPyynto = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.ZIP_LAUSUNTOPYYNTO, projektiOid: "1", uuid: "joku-toinen-uuid" });
  const lisaAineistot1: LadattuTiedosto[] = [
    {
      tiedosto: "/lausuntopyynto/joku-uuid/Tiedosto%201.txt",
      nimi: "Tiedosto%201.txt",
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 2,
      uuid: "23e81b5d-6cc3-4941-898e-8ca4bb531751",
    },
  ];
  const lisaAineistot2: LadattuTiedosto[] = [
    {
      tiedosto: "/lausuntopyynto/joku-toinen-uuid/Tiedosto%202.txt",
      nimi: "Tiedosto%202.txt",
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 2,
      uuid: "",
    },
  ];
  const lausuntoPyynnot: LausuntoPyynto[] = [
    {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      lisaAineistot: lisaAineistot1,
    },
    {
      uuid: "joku-toinen-uuid",
      poistumisPaiva: "2022-01-02",
      lisaAineistot: lisaAineistot2,
    },
  ];
  const projekti: DBProjekti = {
    oid: "1",
    versio: 1,
    kayttoOikeudet: [],
    salt: "salt",
    nahtavillaoloVaihe: nahtavillaoloVaiheAineistoC,
    nahtavillaoloVaiheJulkaisut: [hyvaksyttyNahtavillaoloJulkaisuAineistoA, hyvaksymatonNahtavillaoloJulkaisuAineistoB],
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
        lisaAineistot: lisaAineistot1,
      },
      {
        uuid: "joku-toinen-uuid",
        poistumisPaiva: "2022-01-02",
        lisaAineistot: lisaAineistot2,
        aineistopaketti: "/lausuntopyynto/joku-toinen-uuid/aineisto.zip",
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
        s3Key: "yllapito/tiedostot/projekti/1/nahtavillaolo/1/AineistoA.txt",
        zipFolder: "Selostusosa/",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/1/lausuntopyynto/joku-toinen-uuid/Tiedosto%202.txt",
        zipFolder: "Lisäaineistot/",
      },
    ],
    "yllapito/tiedostot/projekti/1/lausuntopyynto/joku-toinen-uuid/aineisto.zip",
  ];
  expect(zipFilesFirstArgs).to.eql(expectedZipFilesFirstArgs);
};
