/* tslint:disable:only-arrow-functions */

import sinon from "sinon";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { KuulutusJulkaisuTila, TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { nahtavillaoloTilaManager } from "../../../src/handler/tila/nahtavillaoloTilaManager";
import MockDate from "mockdate";
import { DBProjekti, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../../../src/database/model";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { parameters } from "../../../src/aws/parameters";
import { pdfGeneratorClient } from "../../../src/asiakirja/lambda/pdfGeneratorClient";
import { fileService } from "../../../src/files/fileService";

import { expect } from "chai";
import { eventSqsClient } from "../../../src/sqsEvents/eventSqsClient";
import { emailClient } from "../../../src/email/email";

describe("nahtavillaoloTilaManager", () => {
  let projekti: DBProjekti;
  const userFixture = new UserFixture(userService);

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  beforeEach(() => {
    projekti = new ProjektiFixture().nahtavillaoloVaihe();
    userFixture.loginAs(UserFixture.hassuAdmin);
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
    userFixture.logout();
  });

  it("should set old julkaisu tila to PERUUTETTU when making uudelleenkuuluta, if old julkaisu's kuulutusPaiva has not passed", async function () {
    MockDate.set("2020-01-01");
    const nahtavillaoloJulkaisuUpdateStub = sinon.stub(projektiDatabase.nahtavillaoloVaiheJulkaisut, "update");
    sinon.stub(projektiDatabase, "saveProjekti");
    await nahtavillaoloTilaManager.uudelleenkuuluta(projekti);
    expect(nahtavillaoloJulkaisuUpdateStub.getCall(0).args[1]).to.eql({
      ...(projekti.nahtavillaoloVaiheJulkaisut as NahtavillaoloVaiheJulkaisu[])[0],
      tila: KuulutusJulkaisuTila.PERUUTETTU,
    });
  });

  it("should not set old julkaisu tila to PERUUTETTU when making uudelleenkuuluta, if old julkaisu's kuulutusPaiva has passed", async function () {
    MockDate.set("2023-01-01");
    const nahtavillaoloJulkaisuUpdateStub = sinon.stub(projektiDatabase.nahtavillaoloVaiheJulkaisut, "update");
    sinon.stub(projektiDatabase, "saveProjekti");
    await nahtavillaoloTilaManager.uudelleenkuuluta(projekti);
    expect(nahtavillaoloJulkaisuUpdateStub.callCount).to.eql(0);
  });

  it("should leave one published kuulutus when making uudelleenkuulutus", async function () {
    const addZipEventStub = sinon.stub(eventSqsClient, "zipLausuntoPyyntoAineisto");
    const originalKuulutusPaiva = projekti.nahtavillaoloVaihe?.kuulutusPaiva;
    projekti = { ...projekti, nahtavillaoloVaihe: { ...(projekti.nahtavillaoloVaihe as NahtavillaoloVaihe), aineistoNahtavilla: [] } };
    MockDate.set("2023-01-01");
    sinon
      .stub(pdfGeneratorClient, "createNahtavillaoloKuulutusPdf")
      .returns(Promise.resolve({ __typename: "PDF", nimi: "", sisalto: "", textContent: "" }));
    sinon.stub(fileService, "createFileToProjekti");
    sinon.stub(emailClient, "sendEmail");
    const loadProjektiStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    loadProjektiStub.resolves(projekti);
    const nahtavillaoloJulkaisuUpdateStub = sinon.stub(projektiDatabase.nahtavillaoloVaiheJulkaisut, "update");
    const nahtavillaoloJulkaisuInsertStub = sinon.stub(projektiDatabase.nahtavillaoloVaiheJulkaisut, "insert");
    const saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
    // Uudelleenkuuluta
    await nahtavillaoloTilaManager.uudelleenkuuluta(projekti);
    projekti = { ...projekti, ...saveProjektiStub.getCall(0).args[0] };
    // Old should julkaisut has not been updated so there is one HYVAKSYTTY left
    expect(nahtavillaoloJulkaisuUpdateStub.callCount).to.eql(0);
    // Send for approval
    await nahtavillaoloTilaManager.sendForApproval(projekti, UserFixture.hassuAdmin, TilasiirtymaTyyppi.NAHTAVILLAOLO);
    // Old julkaisut should not be updated and new one should be inserted with ODOTTAA_HYVAKSYNTAA.
    // If this is true, there should be only one JULKAISTU.
    expect(nahtavillaoloJulkaisuUpdateStub.callCount).to.eql(0);
    expect(nahtavillaoloJulkaisuInsertStub.getCall(0).args[1].id).to.eql(2);
    expect(nahtavillaoloJulkaisuInsertStub.getCall(0).args[1].tila).to.eql(KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
    expect(nahtavillaoloJulkaisuInsertStub.getCall(0).args[1].uudelleenKuulutus).to.eql(
      saveProjektiStub.getCall(0).args[0]?.nahtavillaoloVaihe?.uudelleenKuulutus
    );
    projekti = {
      ...projekti,
      nahtavillaoloVaiheJulkaisut: projekti.nahtavillaoloVaiheJulkaisut?.concat(nahtavillaoloJulkaisuInsertStub.getCall(0).args[1]),
    };

    sinon.stub(nahtavillaoloTilaManager, "cleanupKuulutusLuonnosAfterApproval");
    sinon.stub(nahtavillaoloTilaManager, "updateProjektiSchedule");
    sinon.stub(nahtavillaoloTilaManager, "sendApprovalMailsAndAttachments");
    sinon.stub(nahtavillaoloTilaManager, "handleAsianhallintaSynkronointi" as any);
    sinon.stub(nahtavillaoloTilaManager, "reloadProjekti").returns(Promise.resolve(projekti));
    await nahtavillaoloTilaManager.approve(projekti, UserFixture.hassuAdmin);
    // The new julkaisu should have the same date as the original (we did not change it),
    // so it is published right away.
    // Therefore, we should set the old julkaisu status to PERUUTETTU.
    expect(nahtavillaoloJulkaisuUpdateStub.getCall(0).args[1].id).to.eql(1); //The first julkaisu has id 1
    expect(nahtavillaoloJulkaisuUpdateStub.getCall(0).args[1].tila).to.eql(KuulutusJulkaisuTila.PERUUTETTU);
    expect(nahtavillaoloJulkaisuUpdateStub.getCall(1).args[1].id).to.eql(2); //The second julkaisu should have id 2
    expect(nahtavillaoloJulkaisuUpdateStub.getCall(1).args[1].tila).to.eql(KuulutusJulkaisuTila.HYVAKSYTTY);
    expect(nahtavillaoloJulkaisuUpdateStub.getCall(1).args[1].kuulutusPaiva).to.eql(originalKuulutusPaiva);
    expect(addZipEventStub.callCount).to.eql(1);
  });
});
