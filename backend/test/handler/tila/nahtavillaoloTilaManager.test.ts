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
import MockDate from "mockdate";
import { projektiSchedulerService } from "../../../src/sqsEvents/projektiSchedulerService";
import { SchedulerMock } from "../../../integrationtest/api/testUtil/util";
import { formatDate } from "hassu-common/util/dateUtils";

describe("nahtavillaoloTilaManager", () => {
  let projekti: DBProjekti;
  const userFixture = new UserFixture(userService);
  new S3Mock();

  beforeEach(() => {
    projekti = new ProjektiFixture().nahtavillaoloVaihe();
    userFixture.loginAs(UserFixture.hassuAdmin);
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
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
    await expect(() => nahtavillaoloTilaManager.validateSendForApproval(projekti)).to.throw(
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

  it(", on nahtavillaolo approve, should add new schedule for ZIP_LAUSUNTOPYYNNOT, with a firing time for nahtavillaolo publish date", async function () {
    assertIsDefined(projekti.nahtavillaoloVaiheJulkaisut);
    const projekti1: DBProjekti = {
      ...projekti,
      nahtavillaoloVaiheJulkaisut: [
        {
          ...projekti.nahtavillaoloVaiheJulkaisut[0],
          tila: API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
          kuulutusPaiva: "2022-06-20T11:54",
        },
      ],
    };
    MockDate.set("2022-05-20"); // Before kuulutusPaiva
    sinon.stub(eventSqsClient, "zipLausuntoPyyntoAineisto");
    sinon.stub(projektiDatabase, "loadProjektiByOid").resolves(projekti1);
    sinon.stub(projektiDatabase, "updateJulkaisuToList");
    sinon.stub(nahtavillaoloTilaManager, "sendApprovalMailsAndAttachments");
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").resolves(false);
    sinon.stub(parameters, "isUspaIntegrationEnabled").resolves(false);
    new SchedulerMock();
    const triggerEventAtSpecificTimeStub = sinon.stub(projektiSchedulerService, "triggerEventAtSpecificTime");
    await nahtavillaoloTilaManager.approve(projekti1, { __typename: "NykyinenKayttaja", etunimi: "", sukunimi: "" });
    // Etsi kaikista triggerEventAtSpecificTimeStub:n kutsuista se, jossa argumenttina annetaan ZIP_LAUSUNTOPYYNNOT
    const callForZipLausuntoPyynnotArgs = Array.from(Array(triggerEventAtSpecificTimeStub.callCount))
      .map((_number: number, index: number) => triggerEventAtSpecificTimeStub.getCall(index).args)
      .find((callArgs) => callArgs[3] === "ZIP_LAUSUNTOPYYNNOT");
    expect(callForZipLausuntoPyynnotArgs).to.exist;
    expect(callForZipLausuntoPyynnotArgs?.[0]).to.eql({
      oid: "3",
      scheduleName: "P3-2022-06-20T00-00-00-PNA",
      dateString: "2022-06-20T00:00:00",
    });
    expect(formatDate(callForZipLausuntoPyynnotArgs?.[1])).to.eql("20.06.2022");
    MockDate.reset();
  });
});
