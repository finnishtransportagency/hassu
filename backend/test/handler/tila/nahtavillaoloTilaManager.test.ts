// Contains code generated or recommended by Amazon Q
/* tslint:disable:only-arrow-functions */

import sinon from "sinon";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { DBProjekti } from "../../../src/database/model";
import { ProjektiTyyppi, VuorovaikutusKierrosTila } from "hassu-common/graphql/apiModel";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { S3Mock } from "../../aws/awsMock";
import { nahtavillaoloTilaManager } from "../../../src/handler/tila/nahtavillaoloTilaManager";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import { assertIsDefined } from "../../../src/util/assertions";
import { eventSqsClient } from "../../../src/sqsEvents/eventSqsClient";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { parameters } from "../../../src/aws/parameters";
import { omistajaDatabase } from "../../../src/database/omistajaDatabase";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { mockSaveProjektiToVelho, SaveProjektiToVelhoMocks, VelhoStub } from "../../../integrationtest/api/testUtil/util";

describe("nahtavillaoloTilaManager", () => {
  let projekti: DBProjekti;
  const userFixture = new UserFixture(userService);
  new S3Mock();
  let saveJulkaisupvmStub: SaveProjektiToVelhoMocks["saveJulkaisupvmStub"];

  before(() => {
    mockClient(DynamoDBDocumentClient);
  });

  beforeEach(() => {
    projekti = new ProjektiFixture().nahtavillaoloVaihe();
    userFixture.loginAs(UserFixture.hassuAdmin);
  });

  afterEach(() => {
    sinon.reset();
    userFixture.logout();
  });

  after(() => {
    sinon.restore();
  });

  it("should reject sendForApproval if vuorovaikutusKierros is still unpublished", async function () {
    delete projekti.nahtavillaoloVaiheJulkaisut;
    projekti.vuorovaikutusKierros = {
      vuorovaikutusNumero: 2,
      tila: VuorovaikutusKierrosTila.MUOKATTAVISSA,
    };
    expect(nahtavillaoloTilaManager.validateSendForApproval(projekti)).rejectedWith(
      "Toiminto ei ole sallittu, koska vuorovaikutuskierros on vielä julkaisematta."
    );
  });

  it("should skip kiinteisto validation for TOIMINNALLINEN project type even when suomifi is enabled and no omistajat exist", async function () {
    const sandbox = sinon.createSandbox();
    try {
      const toiminnallinenProjekti: DBProjekti = {
        ...projekti,
        velho: { ...projekti.velho!, tyyppi: ProjektiTyyppi.TOIMINNALLINEN },
        omistajahaku: undefined,
      };
      sandbox.stub(parameters, "isSuomiFiViestitIntegrationEnabled").resolves(true);
      await expect(nahtavillaoloTilaManager.validateSendForApproval(toiminnallinenProjekti)).to.be.fulfilled;
    } finally {
      sandbox.restore();
    }
  });

  it("should require kiinteisto validation for non-TOIMINNALLINEN project type when suomifi is enabled and no omistajat exist", async function () {
    const sandbox = sinon.createSandbox();
    try {
      const tieProjekti: DBProjekti = {
        ...projekti,
        velho: { ...projekti.velho!, tyyppi: ProjektiTyyppi.TIE },
        omistajahaku: undefined,
      };
      sandbox.stub(parameters, "isSuomiFiViestitIntegrationEnabled").resolves(true);
      sandbox.stub(omistajaDatabase, "hasOmistajat").resolves(false);
      await expect(nahtavillaoloTilaManager.validateSendForApproval(tieProjekti)).to.be.rejectedWith(
        "Kiinteistönomistajia ei ole haettu ennen nähtävilläolon hyväksyntää"
      );
    } finally {
      sandbox.restore();
    }
  });

  it("should create ZIP_LAUSUNTOPYYNNOT event on nahtavillaolo approve", async function () {
    assertIsDefined(projekti.nahtavillaoloVaiheJulkaisut);
    const projekti1: DBProjekti = {
      ...projekti,
      nahtavillaoloVaiheJulkaisut: [
        {
          ...projekti.nahtavillaoloVaiheJulkaisut[0],
          tila: API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
        },
      ],
    };
    const zipLausuntoPyyntoAineistoStub = sinon.stub(eventSqsClient, "zipLausuntoPyyntoAineisto");
    sinon.stub(projektiDatabase, "loadProjektiByOid").resolves(projekti1);
    sinon.stub(projektiDatabase, "updateJulkaisuToList");
    sinon.stub(nahtavillaoloTilaManager, "updateProjektiSchedule");
    sinon.stub(nahtavillaoloTilaManager, "sendApprovalMailsAndAttachments");
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").resolves(false);
    sinon.stub(parameters, "isUspaIntegrationEnabled").resolves(false);
    saveJulkaisupvmStub = mockSaveProjektiToVelho(new VelhoStub()).saveJulkaisupvmStub;
    await nahtavillaoloTilaManager.approve(projekti1, { __typename: "NykyinenKayttaja", etunimi: "", sukunimi: "" });
    expect(zipLausuntoPyyntoAineistoStub.callCount).to.eql(1);
    expect(saveJulkaisupvmStub.callCount).to.eql(1);
  });
});
