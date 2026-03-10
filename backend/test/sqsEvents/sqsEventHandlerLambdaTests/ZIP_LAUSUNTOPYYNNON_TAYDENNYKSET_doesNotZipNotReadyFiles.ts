import { DBProjekti, LadattuTiedosto, LausuntoPyynnonTaydennys } from "../../../src/database/model";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import { fakeEventInSqsQueue, getThreeLadattuTiedostosValmisAndOdottaaPersistointiaAndOdottaaPoistoa, stubBasics } from "./util/util";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";

// eventSqsHandlerLambda reacts to event ZIP_LAUSUNTOPYYNNON_TAYDENNYKSET by zipping lausuntoPyynnonTaydennys files,
// but not non-persisted / ODOTTAA_TUONTIA or to-be-removed files
export const zipLausuntoPyynnonTaydennyksetDoesNotZipNotReadyFiles = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.ZIP_LAUSUNTOPYYNNON_TAYDENNYKSET, projektiOid: "1" });
  const muistutukset: LadattuTiedosto[] = [
    {
      tiedosto: "temporary-uploads-file-location/tiedosto_odottaa_persistointia.txt",
      nimi: "tiedosto_odottaa_persistointia.txt",
      tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
      jarjestys: 2,
      uuid: "140c2abe-2a53-4143-bf6c-8f982d2d5d6d",
    },
    {
      tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/tiedosto_valmis.txt",
      nimi: "tiedosto_valmis.txt",
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 1,
      tuotu: "2021-06-01T01:01",
      uuid: "040a6a49-3e00-4ff5-a670-42fd398ddd4d",
    },
    {
      tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/tiedosto_odottaa_poistoa.txt",
      nimi: "tiedosto_odottaa_poistoa.txt",
      tila: API.LadattuTiedostoTila.ODOTTAA_POISTOA,
      jarjestys: 3,
      tuotu: "2021-06-01T01:02",
      uuid: "7c175762-1e7b-4b0b-a32f-5f279a2bb29d",
    },
  ];
  const muuAineisto: LadattuTiedosto[] = getThreeLadattuTiedostosValmisAndOdottaaPersistointiaAndOdottaaPoistoa({
    name: "muu",
    lausuntoPyynnonTaydennysUuid: "joku-uuid",
  });
  const lausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennys[] = [
    {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      muistutukset,
      muuAineisto,
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
    lausuntoPyynnonTaydennykset: [
      {
        uuid: "joku-uuid",
        poistumisPaiva: "2022-01-01",
        muistutukset,
        muuAineisto,
        kunta: 1,
        aineistopaketti: "/lausuntopyynnon_taydennys/joku-uuid/aineisto.zip",
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
        s3Key: "yllapito/tiedostot/projekti/1/lausuntopyynnon_taydennys/joku-uuid/tiedosto_valmis.txt",
        zipFolder: "Muistutukset/",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/1/lausuntopyynnon_taydennys/joku-uuid/muu_tiedosto_valmis.txt",
        zipFolder: "Muu aineisto/",
      },
    ],
    "yllapito/tiedostot/projekti/1/lausuntopyynnon_taydennys/joku-uuid/aineisto.zip",
  ];
  expect(zipFilesFirstArgs).to.eql(expectedZipFilesFirstArgs);
};
