import { DBProjekti, LadattuTiedosto, LausuntoPyynnonTaydennys } from "../../../src/database/model";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import { fakeEventInSqsQueue, stubBasics } from "./util/util";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import { cleanupLausuntoPyynnonTaydennysTimestamps } from "../../../commonTestUtil/cleanUpFunctions";

// sqsEventHandlerLambda handles event FILES_CHANGED by persisting and deleting lausuntoPyynnonTaydennys files when there is one lausuntoPyynnonTaydennys"
export const filesChangedPersistsAndDeletesLausuntoPyynnonTaydennysFiles = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.FILES_CHANGED, projektiOid: "1" });
  const muistutukset: LadattuTiedosto[] = [
    {
      tiedosto: "joku-hassu-lokaatio/tiedosto_odottaa_persistointia.txt",
      nimi: "tiedosto_odottaa_persistointia.txt",
      tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
      jarjestys: 2,
      uuid: "uuid1",
    },
    {
      tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/Tiedosto%202.txt",
      nimi: "Tiedosto 2",
      tila: API.LadattuTiedostoTila.ODOTTAA_POISTOA,
      tuotu: "2021-12-01T01:04",
      jarjestys: 1,
      uuid: "uuid2",
    },
  ];
  const lausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennys[] = [
    {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      muistutukset,
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
  const { saveProjektiInternalStub, persistFileStub, deleteFileStub, addEventZipLausuntoPyynnonTaydennysAineistoStub } = stubBasics({
    loadProjektiByOidReturnValue: projekti,
    applyProjektiStatusSetStatus: API.Status.NAHTAVILLAOLO,
  });
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
  const expectedLausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennys[] = [
    {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      muistutukset: [
        {
          tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/tiedosto_odottaa_persistointia.txt",
          nimi: "tiedosto_odottaa_persistointia.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "***unittest***",
          jarjestys: 2,
          uuid: "uuid1",
        },
      ],
      kunta: 1,
    },
  ];
  expect(cleanupLausuntoPyynnonTaydennysTimestamps(firstArgs.lausuntoPyynnonTaydennykset?.[0])?.muistutukset).to.eql(
    expectedLausuntoPyynnonTaydennykset[0].muistutukset
  );
  expect(persistFileStub?.callCount).to.eql(1);
  expect(deleteFileStub.callCount).to.eql(1);
  expect(addEventZipLausuntoPyynnonTaydennysAineistoStub.callCount).to.eql(1);
};
