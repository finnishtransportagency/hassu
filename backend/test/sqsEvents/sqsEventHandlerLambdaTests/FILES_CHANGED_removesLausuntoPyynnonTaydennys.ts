import sinon from "sinon";
import { DBProjekti, LadattuTiedosto, LausuntoPyynnonTaydennys } from "../../../src/database/model";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import { fakeEventInSqsQueue, getThreeLadattuTiedostosValmisAndOdottaaPersistointiaAndOdottaaPoistoa, stubBasics } from "./util/util";
import * as API from "hassu-common/graphql/apiModel";
import { fileService } from "../../../src/files/fileService";
import { expect } from "chai";

// sqsEventHandlerLambda handles event FILES_CHANGED by removing lausuntoPyynnonTaydennys that are marked to be removed
export const filesChangedRemovesLausuntoPyynnonTaydennysFiles = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.FILES_CHANGED, projektiOid: "1" });
  const muistutukset: LadattuTiedosto[] = [
    {
      tiedosto: "joku-temp-lokaatio/odottaa_persistointia.txt",
      nimi: "tiedosto-valmis1.txt",
      tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
      tuotu: "2021-12-01T01:05",
      jarjestys: 2,
      uuid: "1",
    },
    {
      tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/tiedosto-valmis2.txt",
      nimi: "tiedosto-valmis2",
      tila: API.LadattuTiedostoTila.VALMIS,
      tuotu: "2021-12-01T01:04",
      jarjestys: 1,
      uuid: "2",
    },
    {
      tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/tiedosto-valmis2.txt",
      nimi: "tiedosto-valmis2",
      tila: API.LadattuTiedostoTila.ODOTTAA_POISTOA,
      tuotu: "2021-12-01T01:04",
      jarjestys: 3,
      uuid: "3",
    },
  ];
  const muuAineisto = getThreeLadattuTiedostosValmisAndOdottaaPersistointiaAndOdottaaPoistoa({
    name: "lisa",
    lausuntoPyynnonTaydennysUuid: "joku-uuid",
  });

  const lausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennys[] = [
    {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      muistutukset,
      muuAineisto,
      kunta: 1,
      poistetaan: true,
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
  const { saveProjektiInternalStub, persistFileStub, deleteFileStub, addEventZipLausuntoPyynnonTaydennysAineistoStub } = stubBasics({
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
  expect(firstArgs.lausuntoPyynnonTaydennykset).to.eql([]);
  expect(persistFileStub?.callCount).to.eql(0);
  expect(deleteFileStub.callCount).to.eql(0);
  expect(deleteProjektiFilesRecursivelyStub.callCount).to.eql(1);
  expect(addEventZipLausuntoPyynnonTaydennysAineistoStub.callCount).to.eql(1);
  expect(deleteProjektiFilesRecursivelyStub.firstCall.args).to.eql([
    { parent: undefined, oid: "1" },
    "lausuntopyynnon_taydennys/joku-uuid",
  ]);
};
