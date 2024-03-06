/* tslint:disable:only-arrow-functions */

import sinon from "sinon";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { DBProjekti } from "../../../src/database/model";
import { VuorovaikutusKierrosTila } from "hassu-common/graphql/apiModel";
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
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

describe("nahtavillaoloTilaManager", () => {
  let projekti: DBProjekti;
  const userFixture = new UserFixture(userService);
  new S3Mock();

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
    await nahtavillaoloTilaManager.approve(projekti1, { __typename: "NykyinenKayttaja", etunimi: "", sukunimi: "" });
    expect(zipLausuntoPyyntoAineistoStub.callCount).to.eql(1);
  });
});
