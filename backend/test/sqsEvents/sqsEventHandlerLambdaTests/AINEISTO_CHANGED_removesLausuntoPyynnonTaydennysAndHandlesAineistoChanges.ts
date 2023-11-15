import { DBProjekti, LadattuTiedosto, LausuntoPyynnonTaydennys } from "../../../src/database/model";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import { fakeEventInSqsQueue, getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa, stubBasics } from "./util/util";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import { cleanupLausuntoPyynnonTaydennysTimestamps } from "../../../commonTestUtil/cleanUpFunctions";
import sinon from "sinon";
import { fileService } from "../../../src/files/fileService";

// sqsEventHandlerLambda handles event AINEISTO_CHANGED by removing lausuntoPyynnonTaydennys that are marked to be removed and handling changed aineisto for others
export const aineistoChangedRemovesLausuntoPyynnonTaydennysAndHandlesAineistoChanges = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.AINEISTO_CHANGED, projektiOid: "1" });
  const muistutukset: LadattuTiedosto[] = [
    {
      tiedosto: "joku-temp-lokaatio/odottaa_persistointia.txt",
      nimi: "tiedosto-valmis1.txt",
      tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
      tuotu: "2021-12-01T01:05",
      jarjestys: 2,
    },
    {
      tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/tiedosto-valmis2.txt",
      nimi: "tiedosto-valmis2",
      tila: API.LadattuTiedostoTila.VALMIS,
      tuotu: "2021-12-01T01:04",
      jarjestys: 1,
    },
    {
      tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/tiedosto-valmis2.txt",
      nimi: "tiedosto-valmis2",
      tila: API.LadattuTiedostoTila.ODOTTAA_POISTOA,
      tuotu: "2021-12-01T01:04",
      jarjestys: 3,
    },
  ];
  const muuAineisto = getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa("lisa", "lausuntopyynnon_taydennys/joku-uuid");
  const muuAineisto2 = getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa(
    "lisa",
    "lausuntopyynnon_taydennys/joku-toinen-uuid",
    "kategoriaId"
  );
  const lausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennys[] = [
    {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      muistutukset,
      muuAineisto,
      kunta: 1,
      poistetaan: true,
    },
    {
      uuid: "joku-toinen-uuid",
      poistumisPaiva: "2022-01-01",
      muuAineisto: muuAineisto2,
      kunta: 1,
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
  const {
    saveProjektiInternalStub,
    persistFileStub,
    deleteFileStub,
    addEventZipLausuntoPyynnonTaydennysAineistoStub,
    velhoGetAineistoStub,
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
  const firstArgs = saveProjektiInternalStub.firstCall.args[0];
  expect((Object.keys(firstArgs) as (keyof DBProjekti)[]).filter((key) => !!firstArgs[key])).to.eql([
    "oid",
    "versio",
    "lausuntoPyynnonTaydennykset",
  ]);
  expect(firstArgs.oid).to.eql("1");
  expect(firstArgs.versio).to.eql(1);
  const expectedLausuntoPyynnonTaydennykset = [
    {
      uuid: "joku-toinen-uuid",
      poistumisPaiva: "2022-01-01",
      muuAineisto: [
        {
          tiedosto: "/lausuntopyynnon_taydennys/joku-toinen-uuid/lisa_aineisto_valmis.txt",
          dokumenttiOid: "lisa2",
          nimi: "lisa_aineisto_valmis.txt",
          tila: "VALMIS",
          jarjestys: 2,
          tuotu: "***unittest***",
          kategoriaId: "kategoriaId",
        },
        {
          dokumenttiOid: "/lausuntopyynnon_taydennys/joku-toinen-uuid/lisa_aineisto_odottaa_tuontia.txt",
          jarjestys: 1,
          kategoriaId: "kategoriaId",
          nimi: "lisa_aineisto_odottaa_tuontia.txt",
          tiedosto: "/lausuntopyynnon_taydennys/joku-toinen-uuid/lisa_aineisto_odottaa_tuontia.txt",
          tila: "VALMIS",
          tuotu: "***unittest***",
        },
      ],
      kunta: 1,
    },
  ];
  expect(firstArgs.lausuntoPyynnonTaydennykset?.map(cleanupLausuntoPyynnonTaydennysTimestamps)).to.eql(expectedLausuntoPyynnonTaydennykset);
  expect(persistFileStub?.callCount).to.eql(0);
  expect(deleteFileStub.callCount).to.eql(1);
  expect(velhoGetAineistoStub.callCount).to.eql(1);
  expect(createAineistoToProjektiStub.callCount).to.eql(1);
  expect(deleteProjektiFilesRecursivelyStub.callCount).to.eql(1);
  expect(addEventZipLausuntoPyynnonTaydennysAineistoStub.callCount).to.eql(1);
  expect(deleteProjektiFilesRecursivelyStub.firstCall.args).to.eql([
    { parent: undefined, oid: "1" },
    "lausuntopyynnon_taydennys/joku-uuid",
  ]);
};
