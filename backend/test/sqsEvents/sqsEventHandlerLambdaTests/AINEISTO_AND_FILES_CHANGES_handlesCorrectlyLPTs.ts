import sinon from "sinon";
import {
  fakeEventInSqsQueue,
  getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa,
  getThreeLadattuTiedostosValmisAndOdottaaPersistointiaAndOdottaaPoistoa,
  stubBasics,
} from "./util/util";
import { Aineisto, DBProjekti, LadattuTiedosto, LausuntoPyynnonTaydennys } from "../../../src/database/model";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import { fileService } from "../../../src/files/fileService";
import { cleanupLausuntoPyynnonTaydennysTimestamps } from "../../../commonTestUtil/cleanUpFunctions";

// sqsEventHandlerLambda handles event AINEISTO_AND_FILES_CHANGED by handling correctly lausuntoPyynnonTaydennykset
export const aineistoAndFilesChangesHandlesCorrectlyLPTs = async () => {
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.AINEISTO_AND_FILES_CHANGED, projektiOid: "1" });
  const muistutukset1: LadattuTiedosto[] = getThreeLadattuTiedostosValmisAndOdottaaPersistointiaAndOdottaaPoistoa({
    name: "eka_muistutus",
    lausuntoPyynnonTaydennysUuid: "joku-uuid",
  });
  const muuAineisto1: Aineisto[] = getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa("eka", "lausuntopyynnon_taydennys/joku-uuid");
  const muistutukset2: LadattuTiedosto[] = getThreeLadattuTiedostosValmisAndOdottaaPersistointiaAndOdottaaPoistoa({
    name: "toka_muistutus",
    lausuntoPyynnonTaydennysUuid: "joku-toinen-uuid",
  });
  const muuAineisto2: Aineisto[] = getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa(
    "toka",
    "lausuntopyynnon_taydennys/joku-toinen-uuid"
  );
  const lausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennys[] = [
    {
      uuid: "joku-uuid",
      poistumisPaiva: "2022-01-01",
      muistutukset: muistutukset1,
      muuAineisto: muuAineisto1,
      kunta: 1,
    },
    {
      uuid: "joku-toinen-uuid",
      poistumisPaiva: "2022-01-01",
      muistutukset: muistutukset2,
      muuAineisto: muuAineisto2,
      kunta: 2,
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
    createAineistoToProjektiStub,
  } = stubBasics({
    loadProjektiByOidReturnValue: projekti,
    applyProjektiStatusSetStatus: API.Status.NAHTAVILLAOLO,
  });
  const deleteAineistoStub = sinon.stub(fileService, "deleteAineisto");
  const updateJulkaisuToListStub = sinon.stub(projektiDatabase, "updateJulkaisuToList");
  await handler();
  expect(addEventZipLausuntoPyynnonTaydennysAineistoStub.callCount).to.eql(1);
  expect(saveProjektiInternalStub.callCount).to.eql(1);
  expect(updateJulkaisuToListStub.callCount).to.eql(0);
  expect(createAineistoToProjektiStub.callCount).to.eql(2);
  expect(deleteAineistoStub.callCount).to.eql(2);
  expect(deleteFileStub.callCount).to.eql(2);
  expect(persistFileStub?.callCount).to.eql(2);
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
          tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/eka_muistutus_tiedosto_odottaa_persistointia.txt",
          nimi: "eka_muistutus_tiedosto_odottaa_persistointia.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "***unittest***",
          jarjestys: 2,
        },
        {
          jarjestys: 1,
          nimi: "eka_muistutus_tiedosto_valmis.txt",
          tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/eka_muistutus_tiedosto_valmis.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "***unittest***",
        },
      ],
      muuAineisto: [
        {
          tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/eka_aineisto_valmis.txt",
          dokumenttiOid: "eka2",
          nimi: "eka_aineisto_valmis.txt",
          tila: API.AineistoTila.VALMIS,
          jarjestys: 2,
          tuotu: "***unittest***",
          kategoriaId: undefined,
        },
        {
          tiedosto: "/lausuntopyynnon_taydennys/joku-uuid/eka_aineisto_odottaa_tuontia.txt",
          dokumenttiOid: "/lausuntopyynnon_taydennys/joku-uuid/eka_aineisto_odottaa_tuontia.txt",
          nimi: "eka_aineisto_odottaa_tuontia.txt",
          tila: API.AineistoTila.VALMIS,
          jarjestys: 1,
          kategoriaId: undefined,
          tuotu: "***unittest***",
        },
      ],
      kunta: 1,
    },
    {
      uuid: "joku-toinen-uuid",
      poistumisPaiva: "2022-01-01",
      muistutukset: [
        {
          tiedosto: "/lausuntopyynnon_taydennys/joku-toinen-uuid/toka_muistutus_tiedosto_odottaa_persistointia.txt",
          nimi: "toka_muistutus_tiedosto_odottaa_persistointia.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "***unittest***",
          jarjestys: 2,
        },
        {
          jarjestys: 1,
          nimi: "toka_muistutus_tiedosto_valmis.txt",
          tiedosto: "/lausuntopyynnon_taydennys/joku-toinen-uuid/toka_muistutus_tiedosto_valmis.txt",
          tila: API.LadattuTiedostoTila.VALMIS,
          tuotu: "***unittest***",
        },
      ],
      muuAineisto: [
        {
          tiedosto: "/lausuntopyynnon_taydennys/joku-toinen-uuid/toka_aineisto_valmis.txt",
          dokumenttiOid: "toka2",
          nimi: "toka_aineisto_valmis.txt",
          tila: API.AineistoTila.VALMIS,
          jarjestys: 2,
          tuotu: "***unittest***",
          kategoriaId: undefined,
        },
        {
          tiedosto: "/lausuntopyynnon_taydennys/joku-toinen-uuid/toka_aineisto_odottaa_tuontia.txt",
          dokumenttiOid: "/lausuntopyynnon_taydennys/joku-toinen-uuid/toka_aineisto_odottaa_tuontia.txt",
          nimi: "toka_aineisto_odottaa_tuontia.txt",
          tila: API.AineistoTila.VALMIS,
          jarjestys: 1,
          kategoriaId: undefined,
          tuotu: "***unittest***",
        },
      ],
      kunta: 2,
    },
  ];
  expect(cleanupLausuntoPyynnonTaydennysTimestamps(firstArgs.lausuntoPyynnonTaydennykset?.[0])?.muistutukset).to.eql(
    expectedLausuntoPyynnonTaydennykset[0].muistutukset
  );
  expect(cleanupLausuntoPyynnonTaydennysTimestamps(firstArgs.lausuntoPyynnonTaydennykset?.[0])?.muuAineisto).to.eql(
    expectedLausuntoPyynnonTaydennykset[0].muuAineisto
  );
  expect(cleanupLausuntoPyynnonTaydennysTimestamps(firstArgs.lausuntoPyynnonTaydennykset?.[1])?.muistutukset).to.eql(
    expectedLausuntoPyynnonTaydennykset[1].muistutukset
  );
  expect(cleanupLausuntoPyynnonTaydennysTimestamps(firstArgs.lausuntoPyynnonTaydennykset?.[1])?.muuAineisto).to.eql(
    expectedLausuntoPyynnonTaydennykset[1].muuAineisto
  );
};
