import { describe, it } from "mocha";
import * as sinon from "sinon";
import { S3Mock } from "../../aws/awsMock";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { aloitusKuulutusTilaManager } from "../../../src/handler/tila/aloitusKuulutusTilaManager";
import { parameters } from "../../../src/aws/parameters";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { DBProjekti } from "../../../src/database/model";
import { EmailClientStub } from "../../../integrationtest/api/testUtil/util";
import { AsianTila, SuunnittelustaVastaavaViranomainen, TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";
import { assertIsDefined } from "../../../src/util/assertions";
import { asianhallintaService } from "../../../src/asianhallinta/asianhallintaService";
import { IllegalArgumentError } from "hassu-common/error";
import { expect } from "chai";

type IncorrectState = Exclude<AsianTila, AsianTila.VALMIS_VIENTIIN> | undefined;

describe("aloitusKuulutusTilaManagerInternalApproval", () => {
  const userFixture = new UserFixture(userService);
  let checkAsianhallintaStateStub: sinon.SinonStub;
  let isAsianhallintaIntegrationEnabledStub: sinon.SinonStub;
  let isUspaIntegrationEnabledStub: sinon.SinonStub;

  let projekti: DBProjekti;

  const asianTilat: Readonly<(AsianTila | undefined)[]> = [...Object.values(AsianTila), undefined];

  const incorrectAsianTila: Readonly<IncorrectState[]> = asianTilat.filter(
    (tila): tila is IncorrectState => tila !== AsianTila.VALMIS_VIENTIIN
  );

  new S3Mock();
  new EmailClientStub();

  before(() => {
    sinon.stub(aloitusKuulutusTilaManager, "sendForApproval");
    checkAsianhallintaStateStub = sinon.stub(asianhallintaService, "checkAsianhallintaState");
    isAsianhallintaIntegrationEnabledStub = sinon.stub(parameters, "isAsianhallintaIntegrationEnabled");
    isUspaIntegrationEnabledStub = sinon.stub(parameters, "isUspaIntegrationEnabled");
  });

  beforeEach(() => {
    projekti = new ProjektiFixture().dbProjekti1();
    assertIsDefined(projekti.velho);

    // By default set values so that it's asianhallinta state will be checked
    projekti.asianhallinta = { inaktiivinen: false };
    projekti.velho.suunnittelustaVastaavaViranomainen = SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO;
    isAsianhallintaIntegrationEnabledStub.returns(Promise.resolve(true));
    isUspaIntegrationEnabledStub.returns(Promise.resolve(true));

    userFixture.loginAs(UserFixture.hassuAdmin);
  });

  afterEach(() => {
    sinon.reset();
    userFixture.logout();
  });

  after(() => {
    sinon.restore();
  });

  it("sendForApprovalInternal should throw if asianhallintaintegraatio is not in correct state", async () => {
    for (const incorrectTila of incorrectAsianTila) {
      checkAsianhallintaStateStub.returns(Promise.resolve(incorrectTila));
      await expect(
        aloitusKuulutusTilaManager["sendForApprovalInternal"](projekti, TilasiirtymaTyyppi.ALOITUSKUULUTUS)
      ).to.eventually.be.rejectedWith(
        IllegalArgumentError,
        `Suunnitelman asia ei ole valmis vientiin. Vaihe: ALOITUSKUULUTUS, tila: ${incorrectTila}`
      );
    }
    expect(checkAsianhallintaStateStub.callCount).to.equal(incorrectAsianTila.length);
  });

  it("sendForApprovalInternal should not throw if asianhallintaintegraatio is in correct state", async () => {
    checkAsianhallintaStateStub.returns(Promise.resolve(AsianTila.VALMIS_VIENTIIN));
    await expect(aloitusKuulutusTilaManager["sendForApprovalInternal"](projekti, TilasiirtymaTyyppi.ALOITUSKUULUTUS)).to.eventually.be
      .fulfilled;
    expect(checkAsianhallintaStateStub.calledOnce).to.be.true;
  });

  it("sendForApprovalInternal should not throw if projekti.asianhallinta.inaktiivinen is true", async () => {
    projekti.asianhallinta = { inaktiivinen: true };

    for (const tila of asianTilat) {
      checkAsianhallintaStateStub.returns(Promise.resolve(tila));
      await expect(aloitusKuulutusTilaManager["sendForApprovalInternal"](projekti, TilasiirtymaTyyppi.ALOITUSKUULUTUS)).to.eventually.be
        .fulfilled;
    }
    expect(checkAsianhallintaStateStub.notCalled).to.be.true;
  });

  it("sendForApprovalInternal should not throw if projekti.velho.suunnittelustaVastaavaViranomainen is not VAYLAVIRASTO", async () => {
    assertIsDefined(projekti.velho);
    projekti.velho.suunnittelustaVastaavaViranomainen = SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY;
    checkAsianhallintaStateStub.returns(Promise.resolve(AsianTila.VALMIS_VIENTIIN));
    await expect(aloitusKuulutusTilaManager["sendForApprovalInternal"](projekti, TilasiirtymaTyyppi.ALOITUSKUULUTUS)).to.eventually.be
      .fulfilled;
    expect(checkAsianhallintaStateStub.calledOnce).to.be.true;
  });

  it("sendForApprovalInternal should not throw if isAsianhallintaIntegrationEnabled parameter is false", async () => {
    isAsianhallintaIntegrationEnabledStub.returns(Promise.resolve(false));

    for (const tila of asianTilat) {
      checkAsianhallintaStateStub.returns(Promise.resolve(tila));
      await expect(aloitusKuulutusTilaManager["sendForApprovalInternal"](projekti, TilasiirtymaTyyppi.ALOITUSKUULUTUS)).to.eventually.be
        .fulfilled;
    }
    expect(checkAsianhallintaStateStub.notCalled).to.be.true;
  });
});
