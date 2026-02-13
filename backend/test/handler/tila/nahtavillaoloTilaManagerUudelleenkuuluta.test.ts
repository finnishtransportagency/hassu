/* tslint:disable:only-arrow-functions */

import sinon from "sinon";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { KuulutusJulkaisuTila, LadattuTiedostoTila, TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { nahtavillaoloTilaManager } from "../../../src/handler/tila/nahtavillaoloTilaManager";
import MockDate from "mockdate";
import { DBProjekti, LadattuTiedosto, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../../../src/database/model";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { nahtavillaoloVaiheJulkaisuDatabase } from "../../../src/database/KuulutusJulkaisuDatabase";
import { parameters } from "../../../src/aws/parameters";
import { pdfGeneratorClient } from "../../../src/asiakirja/lambda/pdfGeneratorClient";
import { fileService } from "../../../src/files/fileService";

import { expect } from "chai";
import { eventSqsClient } from "../../../src/sqsEvents/eventSqsClient";
import { emailClient } from "../../../src/email/email";
import { assertIsDefined } from "../../../src/util/assertions";
import { mockSaveProjektiToVelho, VelhoStub } from "../../../integrationtest/api/testUtil/util";

describe("nahtavillaoloTilaManager", () => {
  let projekti: DBProjekti;
  const userFixture = new UserFixture(userService);
  let saveProjektiStub: sinon.SinonStub;

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
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
    mockSaveProjektiToVelho(new VelhoStub());
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
    userFixture.logout();
  });

  it("should set old julkaisu tila to PERUUTETTU when making uudelleenkuuluta, if old julkaisu's kuulutusPaiva has not passed", async function () {
    MockDate.set("2020-01-01");
    const nahtavillaoloJulkaisuPutStub = sinon.stub(nahtavillaoloVaiheJulkaisuDatabase, "put");
    await nahtavillaoloTilaManager.uudelleenkuuluta(projekti);
    expect(nahtavillaoloJulkaisuPutStub.getCall(0).args[0]).to.eql({
      ...(projekti.nahtavillaoloVaiheJulkaisut as NahtavillaoloVaiheJulkaisu[])[0],
      tila: KuulutusJulkaisuTila.PERUUTETTU,
    });
  });

  it("should not set old julkaisu tila to PERUUTETTU when making uudelleenkuuluta, if old julkaisu's kuulutusPaiva has passed", async function () {
    MockDate.set("2023-01-01");
    const nahtavillaoloJulkaisuPutStub = sinon.stub(nahtavillaoloVaiheJulkaisuDatabase, "put");
    await nahtavillaoloTilaManager.uudelleenkuuluta(projekti);
    expect(nahtavillaoloJulkaisuPutStub.callCount).to.eql(0);
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
    const nahtavillaoloJulkaisuPutStub = sinon.stub(nahtavillaoloVaiheJulkaisuDatabase, "put");
    // Uudelleenkuuluta
    await nahtavillaoloTilaManager.uudelleenkuuluta(projekti);
    projekti = { ...projekti, ...saveProjektiStub.getCall(0).args[0] };
    // Old should julkaisut has not been updated so there is one HYVAKSYTTY left
    expect(nahtavillaoloJulkaisuPutStub.callCount).to.eql(0);
    // Send for approval
    await nahtavillaoloTilaManager.sendForApproval(projekti, UserFixture.hassuAdmin, TilasiirtymaTyyppi.NAHTAVILLAOLO);
    expect(nahtavillaoloJulkaisuPutStub.callCount).to.eql(1);
    expect(nahtavillaoloJulkaisuPutStub.getCall(0).args[0].id).to.eql(2);
    expect(nahtavillaoloJulkaisuPutStub.getCall(0).args[0].projektiOid).to.eql(projekti.oid);
    expect(nahtavillaoloJulkaisuPutStub.getCall(0).args[0].tila).to.eql(KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
    expect(nahtavillaoloJulkaisuPutStub.getCall(0).args[0].uudelleenKuulutus).to.eql(
      saveProjektiStub.getCall(0).args[0]?.nahtavillaoloVaihe?.uudelleenKuulutus
    );
    projekti = {
      ...projekti,
      nahtavillaoloVaiheJulkaisut: projekti.nahtavillaoloVaiheJulkaisut?.concat(nahtavillaoloJulkaisuPutStub.getCall(0).args[0]),
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
    expect(nahtavillaoloJulkaisuPutStub.callCount).to.eql(3);
    expect(nahtavillaoloJulkaisuPutStub.getCall(1).args[0].id).to.eql(1); //The first julkaisu has id 1
    expect(nahtavillaoloJulkaisuPutStub.getCall(1).args[0].projektiOid).to.eql(projekti.oid);
    expect(nahtavillaoloJulkaisuPutStub.getCall(1).args[0].tila).to.eql(KuulutusJulkaisuTila.PERUUTETTU);
    expect(nahtavillaoloJulkaisuPutStub.getCall(2).args[0].id).to.eql(2); //The second julkaisu should have id 2
    expect(nahtavillaoloJulkaisuPutStub.getCall(2).args[0].tila).to.eql(KuulutusJulkaisuTila.HYVAKSYTTY);
    expect(nahtavillaoloJulkaisuPutStub.getCall(2).args[0].kuulutusPaiva).to.eql(originalKuulutusPaiva);
  });

  it("should remove saamePDFs from old kuulutus when making uudelleenkuulutus", async function () {
    projekti.nahtavillaoloVaihe = {
      ...projekti.nahtavillaoloVaihe,
      id: 1,
      nahtavillaoloSaamePDFt: {
        POHJOISSAAME: {
          kuulutusPDF: {
            tiedosto: "/nahtavillaolo/1/kuulutus.pdf",
            nimi: "Saamenkielinen kuulutus",
            tuotu: "2023-01-01",
            tila: LadattuTiedostoTila.VALMIS,
            uuid: "f3e95705-eb43-4d9a-b4ce-fd57a26f0fa7",
          },
          kuulutusIlmoitusPDF: {
            tiedosto: "/nahtavillaolo/1/kuulutusilmoitus.pdf",
            nimi: "Saamenkielinen kuulutus ilmoitus",
            tuotu: "2023-01-01",
            tila: LadattuTiedostoTila.VALMIS,
            uuid: "171863a5-d8fd-413e-8a3d-8d24a20ca607",
          },
        },
      },
    };
    assertIsDefined(projekti.nahtavillaoloVaiheJulkaisut);
    projekti.nahtavillaoloVaiheJulkaisut = [
      {
        ...projekti.nahtavillaoloVaiheJulkaisut?.[0],
        id: 1,
        nahtavillaoloSaamePDFt: {
          POHJOISSAAME: {
            kuulutusPDF: {
              tiedosto: "/nahtavillaolo/1/kuulutus.pdf",
              nimi: "Saamenkielinen kuulutus",
              tuotu: "2023-01-01",
              tila: LadattuTiedostoTila.VALMIS,
              uuid: "9acdf250-3554-4303-9259-d725a4b623fd",
            },
            kuulutusIlmoitusPDF: {
              tiedosto: "/nahtavillaolo/1/kuulutusilmoitus.pdf",
              nimi: "Saamenkielinen kuulutus ilmoitus",
              tuotu: "2023-01-01",
              tila: LadattuTiedostoTila.VALMIS,
              uuid: "831c6ed8-7a77-4e34-a7ca-728952d51bcc",
            },
          },
        },
      },
    ];
    await nahtavillaoloTilaManager.uudelleenkuuluta(projekti);
    const savedProjekti: Partial<DBProjekti> = saveProjektiStub.getCall(0).firstArg;
    expect(savedProjekti.nahtavillaoloVaihe?.nahtavillaoloSaamePDFt).to.eql(undefined);
  });
});
