import sinon, { SinonStub } from "sinon";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { nahtavillaoloTilaManager } from "../../../src/handler/tila/nahtavillaoloTilaManager";
import MockDate from "mockdate";
import {
  Aineisto,
  DBProjekti,
  Kielitiedot,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  KuulutusSaamePDFt,
  UudelleenkuulutusTila,
} from "../../../src/database/model";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { fileService } from "../../../src/files/fileService";
import { AineistoTila, Kieli, KuulutusJulkaisuTila, LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";

import { expect } from "chai";
import { projektiSchedulerService } from "../../../src/sqsEvents/projektiSchedulerService";

describe("nahtavillaoloTilaManager (avaa aineistomuokkaus)", () => {
  let projekti: DBProjekti;
  const userFixture = new UserFixture(userService);
  let copyYllapitoFolder: SinonStub;
  let saveProjekti: SinonStub;
  let synchronizeProjektiFilesStub: SinonStub;
  let updateProjektiSynchronizationScheduleStub: SinonStub;

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
    copyYllapitoFolder = sinon.stub(fileService, "copyYllapitoFolder");
    saveProjekti = sinon.stub(projektiDatabase, "saveProjekti");
    synchronizeProjektiFilesStub = sinon.stub(projektiSchedulerService, "synchronizeProjektiFiles");
    updateProjektiSynchronizationScheduleStub = sinon.stub(projektiSchedulerService, "updateProjektiSynchronizationSchedule");
    synchronizeProjektiFilesStub.resolves();
    updateProjektiSynchronizationScheduleStub.resolves();
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
    userFixture.logout();
  });

  after(() => {
    sinon.restore();
  });

  it("should copy aineistot to a new folder when making avaaAineistoMuokkaus", async function () {
    MockDate.set("2022-06-18");
    await nahtavillaoloTilaManager.avaaAineistoMuokkaus(projekti);
    expect(copyYllapitoFolder.getCall(0).args[0].yllapitoFullPath).to.eql("yllapito/tiedostot/projekti/3/nahtavillaolo/1");
    expect(copyYllapitoFolder.getCall(0).args[1].yllapitoFullPath).to.eql("yllapito/tiedostot/projekti/3/nahtavillaolo/2");
  });

  it("should set aineistoMuokkaus to nahtavillaoloVaihe and increase id by one when making avaaAineistoMuokkaus", async function () {
    MockDate.set("2022-06-18");
    // For the test, we create a project with POHJOISSAAME as toissijainen kieli, and we set up aineistot,
    // and nahtavillaoloSaamePDFt to test that they are copied.
    const kielitiedot: Kielitiedot = {
      ensisijainenKieli: Kieli.SUOMI,
      toissijainenKieli: Kieli.POHJOISSAAME,
      projektinNimiVieraskielella: "Saamenkielinen nimi",
    };
    projekti.kielitiedot = kielitiedot;
    const aineistoNahtavilla: Aineisto[] = [
      {
        dokumenttiOid: "1",
        nimi: "Aineistonimi",
        tila: AineistoTila.VALMIS,
        tiedosto: "nahtavillaolo/1/tiedostoA.pdf",
        uuid: "uuid-0x",
      },
    ];
    const nahtavillaoloSaamePDFt: KuulutusSaamePDFt = {
      POHJOISSAAME: {
        kuulutusPDF: {
          tiedosto: "nahtavillaolo/1/tiedosto1.pdf",
          nimi: "Tiedosto 1",
          tuotu: "2022-06-05",
          tila: LadattuTiedostoTila.VALMIS,
          uuid: "uuid-1x",
        },
        kuulutusIlmoitusPDF: {
          tiedosto: "nahtavillaolo/1/tiedosto2.pdf",
          nimi: "Tiedosto 2",
          tuotu: "2022-06-05",
          tila: LadattuTiedostoTila.VALMIS,
          uuid: "uuid-2x",
        },
      },
    };
    const projektiAineistoilla: DBProjekti = {
      ...projekti,
      nahtavillaoloVaihe: {
        ...projekti.nahtavillaoloVaihe,
        id: 1,
        aineistoNahtavilla,
        nahtavillaoloSaamePDFt,
        uudelleenKuulutus: undefined,
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          ...(projekti.nahtavillaoloVaiheJulkaisut?.[0] as NahtavillaoloVaiheJulkaisu),
          kielitiedot,
          aineistoNahtavilla,
          nahtavillaoloSaamePDFt,
          uudelleenKuulutus: undefined,
        },
      ],
    };
    // We create an obeject that represents what nahtavillaoloVaihe should look like after the avaaAineistoMuokkaus operation
    const aineistoNahtavillaUusi: Aineisto[] = [
      {
        dokumenttiOid: "1",
        nimi: "Aineistonimi",
        tila: AineistoTila.VALMIS,
        tiedosto: "nahtavillaolo/2/tiedostoA.pdf",
        uuid: "uuid-0x",
      },
    ];
    const nahtavillaoloSaamePDFtUusi: KuulutusSaamePDFt = {
      POHJOISSAAME: {
        kuulutusPDF: {
          tiedosto: "nahtavillaolo/2/tiedosto1.pdf",
          nimi: "Tiedosto 1",
          tuotu: "2022-06-05",
          tila: LadattuTiedostoTila.VALMIS,
          uuid: "uuid-1x",
        },
        kuulutusIlmoitusPDF: {
          tiedosto: "nahtavillaolo/2/tiedosto2.pdf",
          nimi: "Tiedosto 2",
          tuotu: "2022-06-05",
          tila: LadattuTiedostoTila.VALMIS,
          uuid: "uuid-2x",
        },
      },
    };
    const uusiNahtavillaoloVaihe: NahtavillaoloVaihe = {
      ...projektiAineistoilla.nahtavillaoloVaihe,
      id: (projektiAineistoilla.nahtavillaoloVaihe?.id || 1) + 1,
      aineistoMuokkaus: {
        alkuperainenHyvaksymisPaiva: projektiAineistoilla.nahtavillaoloVaiheJulkaisut?.[0]?.hyvaksymisPaiva as string,
      },
      aineistoNahtavilla: aineistoNahtavillaUusi,
      nahtavillaoloSaamePDFt: nahtavillaoloSaamePDFtUusi,
      uudelleenKuulutus: undefined,
    };
    await nahtavillaoloTilaManager.avaaAineistoMuokkaus(projektiAineistoilla);
    expect(saveProjekti.getCall(0).args[0]).to.eql({
      oid: projektiAineistoilla.oid,
      versio: projektiAineistoilla.versio,
      nahtavillaoloVaihe: uusiNahtavillaoloVaihe,
    });
  });

  it("should take information about uudelleenkuulutus and set it up properly when making avaaAineistoMuokkaus", async function () {
    MockDate.set("2022-06-21");
    // We set up the project so that there has been one uudelleenKuulutus, but it's the date of its kuulutusPaiva has no passed yet.
    projekti.nahtavillaoloVaihe = {
      ...projekti.nahtavillaoloVaihe,
      id: 2,
      kuulutusPaiva: "2022-06-22",
      kuulutusVaihePaattyyPaiva: "2022-07-22",
    };
    projekti.nahtavillaoloVaiheJulkaisut?.push({
      ...projekti.nahtavillaoloVaiheJulkaisut[0],
      id: 2,
      kuulutusPaiva: "2022-06-22",
      kuulutusVaihePaattyyPaiva: "2022-07-22",
      uudelleenKuulutus: {
        tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
        alkuperainenHyvaksymisPaiva: "2022-06-01",
      },
      hyvaksymisPaiva: "2022-06-21",
    });
    await nahtavillaoloTilaManager.avaaAineistoMuokkaus(projekti);
    const expectedNahtavillaoloVaiheAfter: NahtavillaoloVaihe = {
      ...projekti.nahtavillaoloVaihe,
      id: 3,
      aineistoMuokkaus: {
        alkuperainenHyvaksymisPaiva: "2022-06-21",
      },
      uudelleenKuulutus: {
        tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
        alkuperainenHyvaksymisPaiva: "2022-06-01",
      },
      aineistoNahtavilla: undefined,
      nahtavillaoloSaamePDFt: undefined,
    };
    expect(saveProjekti.getCall(0).args[0]).to.eql({
      oid: projekti.oid,
      versio: projekti.versio,
      nahtavillaoloVaihe: expectedNahtavillaoloVaiheAfter,
    });
  });

  it("should reject avaaAineistoMuokkaus if kuulutusPaiva has already passed", async function () {
    MockDate.set("2023-06-18");
    expect(nahtavillaoloTilaManager.avaaAineistoMuokkaus(projekti)).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Aineistomuokkauksen voi avata vain julkaisulle, jonka kuulutuspäivä ei ole vielä koittanut"
    );
  });

  it("should reject avaaAineistoMuokkaus if there is no nahtavillaoloKuulutusJulkaisu", async function () {
    MockDate.set("2022-06-18");
    projekti.nahtavillaoloVaiheJulkaisut = [];
    expect(nahtavillaoloTilaManager.avaaAineistoMuokkaus(projekti)).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Aineistomuokkaus täytyy avata tietylle julkaisulle, ja julkaisua ei löytynyt"
    );
  });

  it("should reject avaaAineistoMuokkaus if there is already aineistoMuokkaus", async function () {
    MockDate.set("2022-06-18");
    projekti.nahtavillaoloVaihe = {
      ...projekti.nahtavillaoloVaihe,
      id: 2,
      aineistoMuokkaus: {
        alkuperainenHyvaksymisPaiva: projekti.nahtavillaoloVaiheJulkaisut?.[0].hyvaksymisPaiva as string,
      },
    };
    expect(nahtavillaoloTilaManager.avaaAineistoMuokkaus(projekti)).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Aineistomuokkaus on jo avattu. Et voi avata sitä uudestaan."
    );
  });

  it("should reject avaaAineistoMuokkaus if the latest kuulutus is not accepted yet", async function () {
    MockDate.set("2022-06-18");
    projekti.nahtavillaoloVaiheJulkaisut = [
      {
        ...(projekti.nahtavillaoloVaiheJulkaisut?.[0] as NahtavillaoloVaiheJulkaisu),
        tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
      },
    ];
    expect(nahtavillaoloTilaManager.avaaAineistoMuokkaus(projekti)).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Aineistomuokkauksen voi avata vain hyväksytylle julkaisulle"
    );
  });

  it("should reject avaaAineistoMuokkaus if the latest nahtavillaoloKuulutusJulkaisu is not accepted yet, even though there is one accepted nahtavillaoloKuulutusJulkaisu", async function () {
    MockDate.set("2022-06-21");
    // We set up the project so that there has been one uudelleenKuulutus, but it's the date of its kuulutusPaiva has no passed yet.
    projekti.nahtavillaoloVaihe = {
      ...projekti.nahtavillaoloVaihe,
      id: 2,
      kuulutusPaiva: "2022-06-22",
      kuulutusVaihePaattyyPaiva: "2022-07-22",
    };
    projekti.nahtavillaoloVaiheJulkaisut?.push({
      ...projekti.nahtavillaoloVaiheJulkaisut[0],
      id: 2,
      kuulutusPaiva: "2022-06-22",
      kuulutusVaihePaattyyPaiva: "2022-07-22",
      uudelleenKuulutus: {
        tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
        alkuperainenHyvaksymisPaiva: "2022-06-01",
      },
      tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
      hyvaksymisPaiva: undefined,
    });
    expect(nahtavillaoloTilaManager.avaaAineistoMuokkaus(projekti)).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Aineistomuokkauksen voi avata vain hyväksytylle julkaisulle"
    );
  });
});
