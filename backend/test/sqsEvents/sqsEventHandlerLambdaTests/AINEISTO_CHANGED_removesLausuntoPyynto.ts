import sinon from "sinon";
import { Aineisto, DBProjekti, LausuntoPyynto } from "../../../src/database/model";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import { fakeEventInSqsQueue, getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa, stubBasics } from "./util/util";
import {
  hyvaksymatonNahtavillaoloJulkaisuAineistoB,
  hyvaksyttyNahtavillaoloJulkaisuAineistoA,
  nahtavillaoloVaiheAineistoC,
} from "./util/nahtavillaoloTestData";
import * as API from "hassu-common/graphql/apiModel";
import { fileService } from "../../../src/files/fileService";
import { expect } from "chai";

// eventSqsHandlerLambda reacts to event AINEISTO_CHANGED by removing lausuntoPyynto that is marked to be removed
export const aineistoChangedRemovesLausuntoPyynto = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.AINEISTO_CHANGED, projektiOid: "1" });
  const lisaAineistot: Aineisto[] = getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa("lisa", "lausuntopyynto/joku-uuid");
  const lausuntoPyynnot: LausuntoPyynto[] = [
    {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      lisaAineistot,
      poistetaan: true,
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
  const {
    saveProjektiInternalStub,
    deleteFileStub,
    persistFileStub,
    zipFilesStub,
    addEventZipLausuntoPyynnonTaydennysAineistoStub,
    addEventZipLausuntoPyyntoAineistoStub,
  } = stubBasics({
    loadProjektiByOidReturnValue: projekti,
    applyProjektiStatusSetStatus: API.Status.NAHTAVILLAOLO,
  });
  const deleteProjektiFilesRecursivelyStub = sinon.stub(fileService, "deleteProjektiFilesRecursively");
  await handler();
  expect(saveProjektiInternalStub.callCount).to.eql(1);
  expect(saveProjektiInternalStub.firstCall).to.exist;
  expect(saveProjektiInternalStub.firstCall.args).to.exist;
  expect(saveProjektiInternalStub.firstCall.args[0]).to.exist;
  const saveProjektiFirstArgs = saveProjektiInternalStub.firstCall.args[0];
  const firstArgs = saveProjektiInternalStub.firstCall.args[0];
  expect((Object.keys(firstArgs) as (keyof DBProjekti)[]).filter((key) => !!firstArgs[key])).to.eql(["oid", "versio", "lausuntoPyynnot"]);
  expect(saveProjektiFirstArgs.lausuntoPyynnot).to.eql([]);
  expect(zipFilesStub.callCount).to.eql(0);
  expect(deleteFileStub.callCount).to.eql(0);
  expect(persistFileStub?.callCount).to.eql(0);
  expect(addEventZipLausuntoPyyntoAineistoStub.callCount).to.eql(1);
  expect(addEventZipLausuntoPyynnonTaydennysAineistoStub.callCount).to.eql(0);
  expect(deleteProjektiFilesRecursivelyStub.callCount).to.eql(1);
  expect(deleteProjektiFilesRecursivelyStub.firstCall.args).to.eql([{ parent: undefined, oid: "1" }, "lausuntopyynto/joku-uuid"]);
};
