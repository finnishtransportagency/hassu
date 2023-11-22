import sinon from "sinon";
import { fakeEventInSqsQueue, getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa, stubBasics } from "./util/util";
import { DBProjekti, VuorovaikutusKierrosJulkaisu } from "../../../src/database/model";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { SqsEventType } from "../../../src/sqsEvents/sqsEvent";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import { cleanupVuorovaikutusKierrosTimestamps } from "../../../commonTestUtil/cleanUpFunctions";

// eventSqsHandlerLambda reacts to event AINEISTO_AND_FILES_CHANGED by handling vuorovaikutusKierrosJulkaisu aineistos
export const aineistoAndFilesChangedHandlesVuorovaikutusKierrosJulkaisu = async () => {
  // This kind of situation should not result in AINEISTO_AND_FILES_CHANGED event but only AINEISTO_CHANGED event.
  // However, it is good to test that everything would go ok anyway.
  const handler = fakeEventInSqsQueue({ eventType: SqsEventType.AINEISTO_AND_FILES_CHANGED, projektiOid: "1" });
  const vuorovaikutusKierrosJulkaisut: VuorovaikutusKierrosJulkaisu[] = [
    {
      id: 1,
      yhteystiedot: [],
      esitettavatYhteystiedot: {},
      esittelyaineistot: getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa("esittelyaineisto", "suunnitteluvaihe/vuorovaikutus_1"),
      suunnitelmaluonnokset: getThreeAineistosValmisAndOdottaaTuontiaAndOdottaaPoistoa(
        "suunnitelmaluonnos",
        "suunnitteluvaihe/vuorovaikutus_1"
      ),
      hankkeenKuvaus: { SUOMI: "" },
      ilmoituksenVastaanottajat: {},
    },
    {
      id: 2,
      yhteystiedot: [],
      esitettavatYhteystiedot: {},
      esittelyaineistot: [],
      suunnitelmaluonnokset: [],
      hankkeenKuvaus: { SUOMI: "" },
      ilmoituksenVastaanottajat: {},
    },
  ];
  const projekti: DBProjekti = {
    oid: "1",
    versio: 1,
    kayttoOikeudet: [],
    salt: "salt",
    vuorovaikutusKierrosJulkaisut,
    tallennettu: true,
    velho: { nimi: "Projekti 1" },
  };
  const { saveProjektiInternalStub, addEventZipLausuntoPyynnonTaydennysAineistoStub, velhoGetAineistoStub, createAineistoToProjektiStub } =
    stubBasics({
      loadProjektiByOidReturnValue: projekti,
      applyProjektiStatusSetStatus: API.Status.NAHTAVILLAOLO,
    });
  const updateJulkaisuToListStub = sinon.stub(projektiDatabase, "updateJulkaisuToList");
  await handler();
  expect(addEventZipLausuntoPyynnonTaydennysAineistoStub.callCount).to.eql(0);
  expect(saveProjektiInternalStub.callCount).to.eql(0);
  expect(updateJulkaisuToListStub.callCount).to.eql(1);
  expect(velhoGetAineistoStub.callCount).to.eql(2);
  expect(createAineistoToProjektiStub.callCount).to.eql(2);
  const expectedUpdateJulkaisuToListStubFirstParamsSecondVuorovaikutusKierrosJulkaisu = {
    id: 2,
    yhteystiedot: [],
    esitettavatYhteystiedot: {},
    esittelyaineistot: [],
    suunnitelmaluonnokset: [],
    hankkeenKuvaus: { SUOMI: "" },
    ilmoituksenVastaanottajat: {},
  };
  expect(updateJulkaisuToListStub.firstCall.args[0]?.vuorovaikutusKierrosJulkaisut?.[1]).to.eql(
    expectedUpdateJulkaisuToListStubFirstParamsSecondVuorovaikutusKierrosJulkaisu
  );
  const expectedUpdateJulkaisuToListStubSecondParam = {
    id: 1,
    yhteystiedot: [],
    esitettavatYhteystiedot: {},
    esittelyaineistot: [
      {
        tiedosto: "/suunnitteluvaihe/vuorovaikutus_1/esittelyaineisto_aineisto_valmis.txt",
        dokumenttiOid: "esittelyaineisto2",
        nimi: "esittelyaineisto_aineisto_valmis.txt",
        tila: "VALMIS",
        jarjestys: 2,
        tuotu: "***unittest***",
        kategoriaId: undefined,
      },
      {
        tiedosto: "/suunnitteluvaihe/vuorovaikutus_1/esittelyaineisto_aineisto_odottaa_tuontia.txt",
        dokumenttiOid: "/suunnitteluvaihe/vuorovaikutus_1/esittelyaineisto_aineisto_odottaa_tuontia.txt",
        nimi: "esittelyaineisto_aineisto_odottaa_tuontia.txt",
        tila: "VALMIS",
        jarjestys: 1,
        kategoriaId: undefined,
        tuotu: "***unittest***",
      },
    ],
    suunnitelmaluonnokset: [
      {
        tiedosto: "/suunnitteluvaihe/vuorovaikutus_1/suunnitelmaluonnos_aineisto_valmis.txt",
        dokumenttiOid: "suunnitelmaluonnos2",
        nimi: "suunnitelmaluonnos_aineisto_valmis.txt",
        tila: "VALMIS",
        jarjestys: 2,
        tuotu: "***unittest***",
        kategoriaId: undefined,
      },
      {
        tiedosto: "/suunnitteluvaihe/vuorovaikutus_1/suunnitelmaluonnos_aineisto_odottaa_tuontia.txt",
        dokumenttiOid: "/suunnitteluvaihe/vuorovaikutus_1/suunnitelmaluonnos_aineisto_odottaa_tuontia.txt",
        nimi: "suunnitelmaluonnos_aineisto_odottaa_tuontia.txt",
        tila: "VALMIS",
        jarjestys: 1,
        kategoriaId: undefined,
        tuotu: "***unittest***",
      },
    ],
    hankkeenKuvaus: { SUOMI: "" },
    ilmoituksenVastaanottajat: {},
  };
  expect(cleanupVuorovaikutusKierrosTimestamps(updateJulkaisuToListStub.firstCall.args[1] as VuorovaikutusKierrosJulkaisu)).to.eql(
    expectedUpdateJulkaisuToListStubSecondParam
  );
};
