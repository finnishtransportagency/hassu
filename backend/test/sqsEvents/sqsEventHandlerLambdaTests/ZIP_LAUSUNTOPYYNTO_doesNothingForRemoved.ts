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

// eventSqsHandlerLambda reacts to event ZIP_LAUSUNTOPYYNTO by doing nothing if lausuntoPyynto is marked to be removed
export const zipLausuntoPyyntoDoesNothingForRemoved = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.ZIP_LAUSUNTOPYYNTO, projektiOid: "1", uuid: "joku-uuid" });
  const lisaAineistot1: LadattuTiedosto[] = [
    {
      tiedosto: "/lausuntopyynto/joku-uuid/Tiedosto%201.txt",
      nimi: "Tiedosto%201.txt",
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 2,
      uuid: "e1915c3c-2ded-4141-bc8c-ebe4ad2c9ce1",
    },
  ];
  const lisaAineistot2: LadattuTiedosto[] = [
    {
      tiedosto: "/lausuntopyynto/joku-toinen-uuid/Tiedosto%202.txt",
      nimi: "Tiedosto%202.txt",
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 2,
      uuid: "e5c9f896-ace4-4d97-bbbc-7e5e1e01e109",
    },
  ];
  const lausuntoPyynnot: LausuntoPyynto[] = [
    {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      lisaAineistot: lisaAineistot1,
      poistetaan: true,
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
  expect(saveProjektiInternalStub.callCount).to.eql(0);
  expect(zipFilesStub.callCount).to.eql(0);
};
