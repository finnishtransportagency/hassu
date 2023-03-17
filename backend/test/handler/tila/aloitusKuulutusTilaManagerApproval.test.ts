import { describe, it } from "mocha";
import { Readable } from "stream";
import * as sinon from "sinon";
import { aineistoSynchronizerService } from "../../../src/aineisto/aineistoSynchronizerService";
import { getS3 } from "../../../src/aws/client";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { fileService } from "../../../src/files/fileService";
import { Kayttajas } from "../../../src/personSearch/kayttajas";
import { personSearch } from "../../../src/personSearch/personSearchClient";
import { awsMockResolves } from "../../aws/awsMock";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { mockBankHolidays } from "../../mocks";
import { PersonSearchFixture } from "../../personSearch/lambda/personSearchFixture";
import { aloitusKuulutusTilaManager } from "../../../src/handler/tila/aloitusKuulutusTilaManager";
import { UserFixture } from "../../fixture/userFixture";
import { defaultMocks } from "../../../integrationtest/api/testUtil/util";
import { DBProjekti } from "../../../src/database/model";
import { assertIsDefined } from "../../../src/util/assertions";
import { findJulkaisutWithTila, findJulkaisuWithTila, sortByKuulutusPaivaDesc } from "../../../src/projekti/projektiUtil";
import { KuulutusJulkaisuTila } from "../../../../common/graphql/apiModel";
import { expect } from "chai";
import dayjs from "dayjs";
import { isDateTimeInThePast } from "../../../src/util/dateUtil";

describe("AloituskuulutusTilaManager", () => {
  let getObjectStub: sinon.SinonStub;
  let getKayttajasStub: sinon.SinonStub;
  let loadProjektiByOidStub: sinon.SinonStub;
  let updateAloitusKuulutusJulkaisuStub: sinon.SinonStub;
  let publishProjektiFileStub: sinon.SinonStub;
  let synchronizeProjektiFilesStub: sinon.SinonStub;
  let personSearchFixture: PersonSearchFixture;
  let fixture: ProjektiFixture;
  defaultMocks();
  mockBankHolidays();

  before(() => {
    getObjectStub = sinon.stub(getS3(), "getObject");
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    updateAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "update");
    publishProjektiFileStub = sinon.stub(fileService, "publishProjektiFile");
    synchronizeProjektiFilesStub = sinon.stub(aineistoSynchronizerService, "synchronizeProjektiFiles");
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
      const todayIso = dayjs().format("YYYY-MM-DD");
      loadProjektiByOidStub.resolves(fixture.dbProjekti2UseammallaKuulutuksella(todayIso));
      awsMockResolves(getObjectStub, {
        Body: new Readable(),
        ContentType: "application/pdf",
      });
    });

    it("should set all other kuulutuksien tila to PERUUTETTU", async () => {
      publishProjektiFileStub.resolves();
      synchronizeProjektiFilesStub.resolves();
      updateAloitusKuulutusJulkaisuStub.resolves();

      const todayIso = dayjs().format("YYYY-MM-DD");
      let projekti: DBProjekti | undefined = fixture.dbProjekti2UseammallaKuulutuksella(todayIso);

      const hyvaksyntaaOdottavaKuulutus = findJulkaisuWithTila(projekti.aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
      await aloitusKuulutusTilaManager.approve(projekti, UserFixture.pekkaProjari);
      projekti = await projektiDatabase.loadProjektiByOid(projekti.oid);
      assertIsDefined(projekti);
      const hyvaksytytKuulutukset = findJulkaisutWithTila(projekti.aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
      expect(hyvaksytytKuulutukset?.length).to.equal(1);
      expect(hyvaksytytKuulutukset?.[0].id === hyvaksyntaaOdottavaKuulutus?.id);

      const peruutettujenMaara = findJulkaisutWithTila(projekti.aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.PERUUTETTU)?.length;
      expect(peruutettujenMaara).to.equal(6);
    });
  });

  describe("approval when kuulutusPaiva is set to tomorrow", () => {
    const tomorrowIso = dayjs().add(1, "day").format("YYYY-MM-DD");
    beforeEach(() => {
      fixture = new ProjektiFixture();
      personSearchFixture = new PersonSearchFixture();
      loadProjektiByOidStub.resolves(fixture.dbProjekti2UseammallaKuulutuksella(tomorrowIso));
      awsMockResolves(getObjectStub, {
        Body: new Readable(),
        ContentType: "application/pdf",
      });
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
