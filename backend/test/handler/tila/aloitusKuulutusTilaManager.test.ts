/* tslint:disable:only-arrow-functions */

import { aloitusKuulutusTilaManager } from "../../../src/handler/tila/aloitusKuulutusTilaManager";
import sinon from "sinon";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { IllegalArgumentError } from "../../../src/error/IllegalArgumentError";
import { DBProjekti } from "../../../src/database/model";
import dayjs from "dayjs";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { dateToString } from "../../../src/util/dateUtil";
import { UudelleenkuulutusTila } from "../../../../common/graphql/apiModel";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { S3Mock } from "../../aws/awsMock";

const { expect } = require("chai");

describe("aloitusKuulutusTilaManager", () => {
  let saveProjektiStub: sinon.SinonStub;
  let projekti: DBProjekti;
  const userFixture = new UserFixture(userService);
  new S3Mock();
  before(() => {
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
  });

  beforeEach(() => {
    const projekti4 = new ProjektiFixture().dbProjekti4();
    const { oid, versio, kayttoOikeudet, euRahoitus, vahainenMenettely, kielitiedot, velho, aloitusKuulutus, aloitusKuulutusJulkaisut } =
      projekti4;
    projekti = {
      oid,
      versio,
      kayttoOikeudet,
      euRahoitus,
      vahainenMenettely,
      kielitiedot,
      velho,
      aloitusKuulutus,
      aloitusKuulutusJulkaisut,
      tallennettu: true,
    };
    userFixture.loginAs(UserFixture.hassuAdmin);
  });

  afterEach(() => {
    sinon.reset();
    userFixture.logout();
  });

  after(() => {
    sinon.restore();
  });

  it("should reject uudelleenkuulutus succesfully", async function () {
    projekti.aloitusKuulutusJulkaisut = undefined;
    await expect(aloitusKuulutusTilaManager.uudelleenkuuluta(projekti)).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Ei ole olemassa kuulutusta, jota uudelleenkuuluttaa"
    );

    projekti.aloitusKuulutus = undefined;
    await expect(aloitusKuulutusTilaManager.uudelleenkuuluta(projekti)).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Projektilla ei ole aloituskuulutusta"
    );

    await expect(aloitusKuulutusTilaManager.uudelleenkuuluta(new ProjektiFixture().dbProjekti4())).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Et voi uudelleenkuuluttaa aloistuskuulutusta projektin ollessa tässä tilassa:NAHTAVILLAOLO"
    );
  });

  it("should create uudelleenkuulutus succesfully for unpublished kuulutus", async function () {
    projekti.aloitusKuulutusJulkaisut![0].kuulutusPaiva = dateToString(dayjs().add(1, "day")); // Tomorrow
    await aloitusKuulutusTilaManager.uudelleenkuuluta(projekti);
    const savedProjekti: Partial<DBProjekti> = saveProjektiStub.getCall(0).firstArg;
    expect(savedProjekti.aloitusKuulutus?.uudelleenKuulutus).to.eql({ tila: UudelleenkuulutusTila.PERUUTETTU });
  });

  it("should create uudelleenkuulutus succesfully for published kuulutus", async function () {
    projekti.aloitusKuulutusJulkaisut![0].kuulutusPaiva = dateToString(dayjs().add(-1, "day")); // Yesterday
    await aloitusKuulutusTilaManager.uudelleenkuuluta(projekti);
    const savedProjekti: Partial<DBProjekti> = saveProjektiStub.getCall(0).firstArg;
    expect(savedProjekti.aloitusKuulutus?.uudelleenKuulutus).to.eql({
      tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
      alkuperainenHyvaksymisPaiva: "2022-03-21",
    });
  });
});
