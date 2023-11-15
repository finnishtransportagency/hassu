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
import { cleanupLausuntoPyyntoTimestamps } from "../../../commonTestUtil/cleanUpFunctions";

// eventSqsHandlerLambda handles event AINEISTO_CHANGED by removing lausuntoPyynto that is marked to be removed and handling changed aineistos
export const aineistoChangedRemovesLausuntoPyyntoAndHandlesChanges = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.AINEISTO_CHANGED, projektiOid: "1" });
  const lisaAineistot: Aineisto[] = getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa(
    "lisa",
    "lausuntopyynto/joku-uuid",
    "kategoriaId"
  );
  const lisaAineistot2: Aineisto[] = getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa(
    "lisa",
    "lausuntopyynto/joku-toinen-uuid",
    "kategoriaId"
  );

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
          tiedosto: "/lausuntopyynto/joku-toinen-uuid/lisa_aineisto_valmis.txt",
          dokumenttiOid: "lisa2",
          nimi: "lisa_aineisto_valmis.txt",
          tila: "VALMIS",
          jarjestys: 2,
          tuotu: "***unittest***",
          kategoriaId: "kategoriaId",
        },
        {
          tiedosto: "/lausuntopyynto/joku-toinen-uuid/lisa_aineisto_odottaa_tuontia.txt",
          dokumenttiOid: "/lausuntopyynto/joku-toinen-uuid/lisa_aineisto_odottaa_tuontia.txt",
          nimi: "lisa_aineisto_odottaa_tuontia.txt",
          tila: "VALMIS",
          jarjestys: 1,
          kategoriaId: "kategoriaId",
          tuotu: "***unittest***",
        },
      ],
    },
  ];
  expect(saveProjektiFirstArgs.lausuntoPyynnot?.map(cleanupLausuntoPyyntoTimestamps)).to.eql(expectedLausuntoPyynnot);
  expect(zipFilesStub.callCount).to.eql(0);
  expect(deleteFileStub.callCount).to.eql(1); // Nähtävilläolojulkaisulla ei oikeasti pitäisi olla tuomista tai poitamista odottavia aineistoja
  expect(createAineistoToProjektiStub.callCount).to.eql(1); // Nähtävilläolojulkaisulla ei oikeasti pitäisi olla tuomista tai poitamista odottavia aineistoja
  expect(persistFileStub?.callCount).to.eql(0);
  expect(addEventZipLausuntoPyyntoAineistoStub.callCount).to.eql(1);
  expect(addEventZipLausuntoPyynnonTaydennysAineistoStub.callCount).to.eql(0);
  expect(deleteProjektiFilesRecursivelyStub.callCount).to.eql(1);
  expect(deleteProjektiFilesRecursivelyStub.firstCall.args).to.eql([{ parent: undefined, oid: "1" }, "lausuntopyynto/joku-uuid"]);
};
