import sinon from "sinon";
import { DBProjekti, LadattuTiedosto, LausuntoPyynto } from "../../../src/database/model";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import { fakeEventInSqsQueue, getThreeLadattuTiedostosValmisAndOdottaaPersistointiaAndOdottaaPoistoa, stubBasics } from "./util/util";
import {
  hyvaksymatonNahtavillaoloJulkaisuAineistoB,
  hyvaksyttyNahtavillaoloJulkaisuAineistoA,
  nahtavillaoloVaiheAineistoC,
} from "./util/nahtavillaoloTestData";
import * as API from "hassu-common/graphql/apiModel";
import { fileService } from "../../../src/files/fileService";
import { expect } from "chai";
import { cleanupLausuntoPyyntoTimestamps } from "../../../commonTestUtil/cleanUpFunctions";

// eventSqsHandlerLambda handles event AINEISTO_AND_FILES_CHANGED by removing lausuntoPyynto that is marked to be removed and handling changed aineistos
export const aineistoAndFilesChangedRemovesLausuntoPyyntoAndHandlesChanges = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.AINEISTO_AND_FILES_CHANGED, projektiOid: "1" });
  const lisaAineistot: LadattuTiedosto[] = getThreeLadattuTiedostosValmisAndOdottaaPersistointiaAndOdottaaPoistoa({
    name: "lisa",
    lausuntoPyyntoUuid: "joku-uuid",
  });
  const lisaAineistot2: LadattuTiedosto[] = getThreeLadattuTiedostosValmisAndOdottaaPersistointiaAndOdottaaPoistoa({
    name: "lisa",
    lausuntoPyyntoUuid: "joku-toinen-uuid",
  });

  const lausuntoPyynnot: LausuntoPyynto[] = [
    {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      lisaAineistot,
      poistetaan: true,
    },
    {
      uuid: "joku-toinen-uuid",
      poistumisPaiva: "2022-01-01",
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
  const {
    saveProjektiInternalStub,
    deleteFileStub,
    persistFileStub,
    zipFilesStub,
    addEventZipLausuntoPyynnonTaydennysAineistoStub,
    addEventZipLausuntoPyyntoAineistoStub,
    createAineistoToProjektiStub,
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
  const expectedLausuntoPyynnot = [
    {
      uuid: "joku-toinen-uuid",
      poistumisPaiva: "2022-01-01",
      lisaAineistot: [
        {
          jarjestys: 1,
          nimi: "lisa_tiedosto_valmis.txt",
          tiedosto: "/lausuntopyynto/joku-toinen-uuid/lisa_tiedosto_valmis.txt",
          tila: "VALMIS",
          tuotu: "***unittest***",
          uuid: "2",
        },
        {
          jarjestys: 2,
          nimi: "lisa_tiedosto_odottaa_persistointia.txt",
          tiedosto: "/lausuntopyynto/joku-toinen-uuid/lisa_tiedosto_odottaa_persistointia.txt",
          tila: "VALMIS",
          tuotu: "***unittest***",
          uuid: "1",
        },
      ],
    },
  ];
  expect(saveProjektiFirstArgs.lausuntoPyynnot?.map(cleanupLausuntoPyyntoTimestamps)).to.eql(expectedLausuntoPyynnot);
  expect(zipFilesStub.callCount).to.eql(0);
  expect(deleteFileStub.callCount).to.eql(1); // Nähtävilläolojulkaisulla ei oikeasti pitäisi olla tuomista tai poitamista odottavia aineistoja
  expect(createAineistoToProjektiStub.callCount).to.eql(0);
  expect(persistFileStub?.callCount).to.eql(1);
  expect(addEventZipLausuntoPyyntoAineistoStub.callCount).to.eql(1);
  expect(addEventZipLausuntoPyynnonTaydennysAineistoStub.callCount).to.eql(0);
  expect(deleteProjektiFilesRecursivelyStub.callCount).to.eql(1);
  expect(deleteProjektiFilesRecursivelyStub.firstCall.args).to.eql([{ parent: undefined, oid: "1" }, "lausuntopyynto/joku-uuid"]);
};
