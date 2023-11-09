import { Aineisto, DBProjekti, LausuntoPyynto } from "../../../src/database/model";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import { fakeEventInSqsQueue, stubBasics } from "./util/util";
import {
  hyvaksymatonNahtavillaoloJulkaisuAineistoB,
  hyvaksyttyNahtavillaoloJulkaisuAineistoA,
  nahtavillaoloVaiheAineistoC,
} from "./util/nahtavillaoloTestData";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import sinon from "sinon";
import { eventSqsClient } from "../../../src/sqsEvents/eventSqsClient";

// eventSqsHandlerLambda react to event ZIP_LAUSUNTOPYYNNOT by adding ZIP_LAUSUNTOPYYNTO events to sqsQueue
export const zipLausuntoPyynnotAddsZipLausuntoPyyntoEventsToQueue = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.ZIP_LAUSUNTOPYYNNOT, projektiOid: "1" });
  const lisaAineistot1: Aineisto[] = [
    {
      tiedosto: "/lausuntopyynto/joku-uuid/Tiedosto%201.txt",
      dokumenttiOid: "foo",
      nimi: "Tiedosto%201.txt",
      tila: API.AineistoTila.VALMIS,
      jarjestys: 2,
    },
  ];
  const lisaAineistot2: Aineisto[] = [
    {
      tiedosto: "/lausuntopyynto/joku-toinen-uuid/Tiedosto%202.txt",
      dokumenttiOid: "bar",
      nimi: "Tiedosto%202.txt",
      tila: API.AineistoTila.VALMIS,
      jarjestys: 2,
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
  const stubZipSingleLausuntoPyynto = sinon.stub(eventSqsClient, "zipSingleLausuntoPyynto");
  await handler();
  expect(saveProjektiInternalStub.callCount).to.eql(0);
  expect(zipFilesStub.callCount).to.eql(0);
  expect(stubZipSingleLausuntoPyynto.callCount).to.eql(2);
  expect(stubZipSingleLausuntoPyynto.firstCall.args).to.eql(["1", "joku-uuid"]);
  expect(stubZipSingleLausuntoPyynto.secondCall.args).to.eql(["1", "joku-toinen-uuid"]);
};
