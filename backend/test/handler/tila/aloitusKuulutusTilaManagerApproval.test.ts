import { describe, it } from "mocha";
import { Readable } from "stream";
import * as sinon from "sinon";
import { projektiSchedulerService } from "../../../src/sqsEvents/projektiSchedulerService";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { fileService } from "../../../src/files/fileService";
import { Kayttajas } from "../../../src/personSearch/kayttajas";
import { personSearch } from "../../../src/personSearch/personSearchClient";
import { S3Mock } from "../../aws/awsMock";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { mockBankHolidays } from "../../mocks";
import { PersonSearchFixture } from "../../personSearch/lambda/personSearchFixture";
import { aloitusKuulutusTilaManager } from "../../../src/handler/tila/aloitusKuulutusTilaManager";
import { UserFixture } from "../../fixture/userFixture";
import { DBProjekti } from "../../../src/database/model";
import { assertIsDefined } from "../../../src/util/assertions";
import { findJulkaisutWithTila, findJulkaisuWithTila, sortByKuulutusPaivaDesc } from "../../../src/projekti/projektiUtil";
import { KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import dayjs from "dayjs";
import {
  EmailClientStub,
  SaveProjektiToVelhoMocks,
  SchedulerMock,
  VelhoStub,
  mockSaveProjektiToVelho,
} from "../../../integrationtest/api/testUtil/util";
import { isDateTimeInThePast, nyt } from "../../../src/util/dateUtil";
import { GetObjectCommand, GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { parameters } from "../../../src/aws/parameters";

describe("aloitusKuulutusTilaManagerApproval", () => {
  let getKayttajasStub: sinon.SinonStub;
  let loadProjektiByOidStub: sinon.SinonStub;
  let updateAloitusKuulutusJulkaisuStub: sinon.SinonStub;
  let publishProjektiFileStub: sinon.SinonStub;
  let synchronizeProjektiFilesStub: sinon.SinonStub;
  let personSearchFixture: PersonSearchFixture;
  let fixture: ProjektiFixture;
  let saveProjektiAloituskuulutusPaivaStub: SaveProjektiToVelhoMocks["saveProjektiAloituskuulutusPaivaStub"];
  mockBankHolidays();
  const s3Mock = new S3Mock();
  new SchedulerMock();
  new EmailClientStub();

  before(() => {
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    updateAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "update");
    publishProjektiFileStub = sinon.stub(fileService, "publishProjektiFile");
    synchronizeProjektiFilesStub = sinon.stub(projektiSchedulerService, "synchronizeProjektiFiles");
    saveProjektiAloituskuulutusPaivaStub = mockSaveProjektiToVelho(new VelhoStub()).saveProjektiAloituskuulutusPaivaStub;
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
  });

  beforeEach(() => {
    personSearchFixture = new PersonSearchFixture();
    getKayttajasStub.resolves(
      Kayttajas.fromKayttajaList([
        personSearchFixture.pekkaProjari,
        personSearchFixture.mattiMeikalainen,
        personSearchFixture.manuMuokkaaja,
      ])
    );
  });

  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  describe("approval when kuulutusPaiva is set to this day", () => {
    beforeEach(() => {
      fixture = new ProjektiFixture();
      personSearchFixture = new PersonSearchFixture();
      const todayIso = nyt().format("YYYY-MM-DD");
      loadProjektiByOidStub.resolves(fixture.dbProjekti2UseammallaKuulutuksella(todayIso));
      s3Mock.s3Mock.on(GetObjectCommand).resolves({
        Body: Readable.from(""),
        ContentType: "application/pdf",
      } as GetObjectCommandOutput);
    });

    it("should set all other kuulutuksien tila to PERUUTETTU", async () => {
      publishProjektiFileStub.resolves();
      synchronizeProjektiFilesStub.resolves();
      updateAloitusKuulutusJulkaisuStub.resolves();

      const todayIso = nyt().format("YYYY-MM-DD");
      let projekti: DBProjekti | undefined = fixture.dbProjekti2UseammallaKuulutuksella(todayIso);

      const hyvaksyntaaOdottavaKuulutus = findJulkaisuWithTila(projekti.aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
      await aloitusKuulutusTilaManager.approve(projekti, UserFixture.pekkaProjari);
      projekti = await projektiDatabase.loadProjektiByOid(projekti.oid);
      assertIsDefined(projekti);
      const hyvaksytytKuulutukset = findJulkaisutWithTila(projekti.aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
      expect(hyvaksytytKuulutukset?.length).to.equal(1);
      expect(hyvaksytytKuulutukset?.[0].id).to.equal(hyvaksyntaaOdottavaKuulutus?.id);

      const peruutettujenMaara = findJulkaisutWithTila(projekti.aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.PERUUTETTU)?.length;
      expect(peruutettujenMaara).to.equal(6);
    });

    it("should call saveProjektiAloituskuulutusPaivaStub with kuulutus information", async () => {
      publishProjektiFileStub.resolves();
      synchronizeProjektiFilesStub.resolves();
      updateAloitusKuulutusJulkaisuStub.resolves();
      const todayIso = dayjs().format("YYYY-MM-DD");
      const projekti: DBProjekti | undefined = fixture.dbProjekti2UseammallaKuulutuksella(todayIso);
      await aloitusKuulutusTilaManager.approve(projekti, UserFixture.pekkaProjari);
      expect(saveProjektiAloituskuulutusPaivaStub.callCount).to.equal(1);
      const oid = saveProjektiAloituskuulutusPaivaStub.getCall(0).args[0];
      const julkaisu = saveProjektiAloituskuulutusPaivaStub.getCall(0).args[1];

      expect(oid).to.equal(projekti.oid);
      expect(julkaisu.kuulutusPaiva).to.equal(todayIso);
    });
  });

  describe("approval when kuulutusPaiva is set to tomorrow", () => {
    const tomorrowIso = nyt().add(1, "day").format("YYYY-MM-DD");
    beforeEach(() => {
      fixture = new ProjektiFixture();
      personSearchFixture = new PersonSearchFixture();
      loadProjektiByOidStub.resolves(fixture.dbProjekti2UseammallaKuulutuksella(tomorrowIso));
      s3Mock.s3Mock.on(GetObjectCommand).resolves({
        Body: Readable.from(""),
        ContentType: "application/pdf",
      } as GetObjectCommandOutput);
    });

    it("should set all but the most recent published kuulutuksien tila to PERUUTETTU", async () => {
      publishProjektiFileStub.resolves();
      synchronizeProjektiFilesStub.resolves();
      updateAloitusKuulutusJulkaisuStub.resolves();

      let projekti: DBProjekti | undefined = fixture.dbProjekti2UseammallaKuulutuksella(tomorrowIso);

      const hyvaksyntaaOdottavaKuulutus = findJulkaisuWithTila(projekti.aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
      const mostRecentHyvaksyttyJulkaisu = findJulkaisutWithTila(
        projekti.aloitusKuulutusJulkaisut,
        KuulutusJulkaisuTila.HYVAKSYTTY,
        sortByKuulutusPaivaDesc
      )?.find((julkaisu) => julkaisu.kuulutusPaiva && isDateTimeInThePast(julkaisu.kuulutusPaiva, "start-of-day"));
      await aloitusKuulutusTilaManager.approve(projekti, UserFixture.pekkaProjari);
      projekti = await projektiDatabase.loadProjektiByOid(projekti.oid);
      assertIsDefined(projekti);
      const hyvaksytyt = findJulkaisutWithTila(projekti.aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
      expect(hyvaksytyt?.length).to.equal(2);
      const uusiJulkaisu = hyvaksytyt?.find((julkaisu) => julkaisu.id === hyvaksyntaaOdottavaKuulutus?.id);
      const aiempiJulkaisu = hyvaksytyt?.find((julkaisu) => julkaisu.id === mostRecentHyvaksyttyJulkaisu?.id);
      expect(uusiJulkaisu).to.not.be.undefined;
      expect(aiempiJulkaisu).to.not.be.undefined;
      const peruutettujenMaara = findJulkaisutWithTila(projekti.aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.PERUUTETTU)?.length;
      expect(peruutettujenMaara).to.equal(5);
    });
  });
});
