import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../src/database/projektiDatabase";
import { ProjektiFixture } from "./fixture/projektiFixture";
import { UserFixture } from "./fixture/userFixture";
import { velho } from "../src/velho/velhoClient";
import { api } from "../integrationtest/api/apiClient";
import { personSearch } from "../src/personSearch/personSearchClient";
import { userService } from "../src/user";
import {
  KayttajaTyyppi,
  Kieli,
  KuulutusJulkaisuTila,
  LadattuTiedostoTila,
  Projekti,
  TallennaProjektiInput,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
} from "hassu-common/graphql/apiModel";
import { AloitusKuulutusJulkaisu, DBProjekti } from "../src/database/model";
import * as log from "loglevel";
import mergeWith from "lodash/mergeWith";
import { PersonSearchFixture } from "./personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../src/personSearch/kayttajas";
import { fileService } from "../src/files/fileService";
import { emailClient } from "../src/email/email";
import { pdfGeneratorClient } from "../src/asiakirja/lambda/pdfGeneratorClient";
import { handleEvent as pdfGenerator } from "../src/asiakirja/lambda/pdfGeneratorHandler";
import { kuntametadata } from "hassu-common/kuntametadata";
import { projektiSchedulerService } from "../src/sqsEvents/projektiSchedulerService";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { defaultUnitTestMocks } from "./mocks";
import assert from "assert";
import { NoVaylaAuthenticationError } from "hassu-common/error";
import { lyhytOsoiteDatabase } from "../src/database/lyhytOsoiteDatabase";
import { S3Mock } from "./aws/awsMock";
import { mockSaveProjektiToVelho } from "../integrationtest/api/testUtil/util";
import chai from "chai";
import { assertIsDefined } from "../src/util/assertions";
import { asetaAika } from "../integrationtest/api/testUtil/tests";
import { preventArrayMergingCustomizer } from "../src/util/preventArrayMergingCustomizer";

const { expect } = chai;

describe("apiHandler", () => {
  const userFixture = new UserFixture(userService);

  let fixture: ProjektiFixture;
  let personSearchFixture: PersonSearchFixture;

  let createProjektiStub: sinon.SinonStub;

  let saveProjektiStub: sinon.SinonStub;
  let loadProjektiByOidStub: sinon.SinonStub;
  let getKayttajasStub: sinon.SinonStub;
  let loadVelhoProjektiByOidStub: sinon.SinonStub;
  let insertAloitusKuulutusJulkaisuStub: sinon.SinonStub;
  let updateAloitusKuulutusJulkaisuStub: sinon.SinonStub;
  let deleteAloitusKuulutusJulkaisuStub: sinon.SinonStub;
  let generateAndSetLyhytOsoiteStub: sinon.SinonStub;
  let persistFileToProjektiStub: sinon.SinonStub;
  let sendEmailStub: sinon.SinonStub;
  let pdfGeneratorLambdaStub: sinon.SinonStub;
  let aineistoServiceStub: sinon.SinonStub;

  defaultUnitTestMocks();

  new S3Mock(true);
  before(() => {
    createProjektiStub = sinon.stub(projektiDatabase, "createProjekti");
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    insertAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "insert");
    updateAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "update");
    deleteAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "delete");
    generateAndSetLyhytOsoiteStub = sinon.stub(lyhytOsoiteDatabase, "generateAndSetLyhytOsoite");
    loadVelhoProjektiByOidStub = sinon.stub(velho, "loadProjekti");
    persistFileToProjektiStub = sinon.stub(fileService, "persistFileToProjekti");
    sendEmailStub = sinon.stub(emailClient, "sendEmail");
    mockSaveProjektiToVelho();

    pdfGeneratorLambdaStub = sinon.stub(pdfGeneratorClient, "generatePDF");

    aineistoServiceStub = sinon.stub(projektiSchedulerService, "synchronizeProjektiFiles");
    aineistoServiceStub.callsFake(async () => {
      console.log("Synkataan aineisto");
    });
  });

  after(() => {
    sinon.restore();
  });

  beforeEach(() => {
    fixture = new ProjektiFixture();
    personSearchFixture = new PersonSearchFixture();
    getKayttajasStub.resolves(
      Kayttajas.fromKayttajaList([
        personSearchFixture.pekkaProjari,
        personSearchFixture.mattiMeikalainen,
        personSearchFixture.manuMuokkaaja,
        personSearchFixture.createKayttaja("A2"),
      ])
    );

    pdfGeneratorLambdaStub.callsFake(async (event) => {
      return await pdfGenerator(event);
    });

    sendEmailStub.callsFake((options) => {
      return Promise.resolve({
        messageId: "messageId_test",
        accepted: (options.to || []) as string[],
        rejected: [],
        pending: [],
      } as unknown as SMTPTransport.SentMessageInfo);
    });

    generateAndSetLyhytOsoiteStub.resolves("ABCD");
  });

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
  });

  function mockLataaProjektiFromVelho() {
    loadProjektiByOidStub.resolves();
    const velhoProjekti = fixture.velhoprojekti1();
    assertIsDefined(velhoProjekti.velho);
    velhoProjekti.velho.vastuuhenkilonEmail = personSearchFixture.pekkaProjari.email;

    loadVelhoProjektiByOidStub.resolves(velhoProjekti);
  }

  it("should load a new project from Velho", async () => {
    asetaAika("2022-01-02");
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    mockLataaProjektiFromVelho();

    const projekti = await api.lataaProjekti(fixture.PROJEKTI1_OID);
    expect(cleanup(projekti)).toMatchSnapshot();
    sinon.assert.calledOnce(loadProjektiByOidStub);
    sinon.assert.calledOnce(loadVelhoProjektiByOidStub);
  });

  it("should modify permissions from a project successfully", async () => {
    asetaAika("2022-01-02");
    let mockedDatabaseProjekti: DBProjekti | undefined;

    async function saveAndLoadProjekti(p: Projekti, description: string, updatedValues: Partial<TallennaProjektiInput>) {
      assert(p.versio, "versio puuttuu");
      await api.tallennaProjekti({
        oid: fixture.PROJEKTI1_OID,
        versio: p.versio,
        ...updatedValues,
      });

      if (p.tallennettu) {
        expect(saveProjektiStub.calledOnce).to.be.true;
        const projekti = saveProjektiStub.getCall(0).firstArg;
        expect(projekti.salt).to.not.be.empty;
        projekti.salt = "***unittest***";
        expect(["Save projekti having " + description, cleanup(projekti)]).toMatchSnapshot();
        saveProjektiStub.resetHistory();
      } else {
        expect(createProjektiStub.calledOnce).to.be.true;
        const projekti = createProjektiStub.getCall(0).firstArg;
        if (projekti.salt) {
          projekti.salt = "***unittest***";
        }
        expect(["Create projekti having " + description, cleanup(projekti)]).toMatchSnapshot();
        createProjektiStub.resetHistory();
      }
      // Load projekti and examine its permissions again
      p = await api.lataaProjekti(fixture.PROJEKTI1_OID);
      expect(["Loaded projekti having " + description, cleanup(p)]).toMatchSnapshot();
      return p;
    }

    function mockDatabase() {
      mockedDatabaseProjekti = undefined;
      loadProjektiByOidStub.reset();
      saveProjektiStub.reset();
      loadProjektiByOidStub.callsFake(async () => {
        return mockedDatabaseProjekti;
      });
      saveProjektiStub.callsFake(async (dbProjekti: DBProjekti) => {
        log.info("saveProjektiStub", mockedDatabaseProjekti);
        mockedDatabaseProjekti = mergeWith(mockedDatabaseProjekti, dbProjekti, preventArrayMergingCustomizer);
        if (mockedDatabaseProjekti && dbProjekti.kayttoOikeudet) {
          mockedDatabaseProjekti.kayttoOikeudet = dbProjekti.kayttoOikeudet;
        }
        log.info("saveProjektiStub", mockedDatabaseProjekti);
      });

      createProjektiStub.callsFake((dbProjekti: DBProjekti) => {
        dbProjekti.tallennettu = true;
        mockedDatabaseProjekti = dbProjekti;
      });

      insertAloitusKuulutusJulkaisuStub.callsFake((_oid: string, julkaisu: AloitusKuulutusJulkaisu) => {
        if (mockedDatabaseProjekti) {
          // Just a simple mock to support only one julkaisu
          mockedDatabaseProjekti.aloitusKuulutusJulkaisut = [julkaisu];
        }
      });
      updateAloitusKuulutusJulkaisuStub.callsFake((_oid: string, julkaisu: AloitusKuulutusJulkaisu) => {
        if (mockedDatabaseProjekti) {
          // Just a simple mock to support only one julkaisu
          mockedDatabaseProjekti.aloitusKuulutusJulkaisut = [
            {
              ...julkaisu,
              aloituskuulutusPDFt: {
                SUOMI: {
                  aloituskuulutusIlmoitusPDFPath: "/aloituskuulutus/1/T412_1 Ilmoitus aloituskuulutuksesta.pdf",
                  aloituskuulutusPDFPath: "/aloituskuulutus/1/T412 Aloituskuulutus.pdf",
                },
              },
              aloituskuulutusSaamePDFt: {
                POHJOISSAAME: {
                  kuulutusPDF: {
                    uuid: "jotain",
                    tila: LadattuTiedostoTila.VALMIS,
                    tiedosto: "/Saame.pdf",
                  },
                  kuulutusIlmoitusPDF: {
                    uuid: "jotainmuuta",
                    tila: LadattuTiedostoTila.VALMIS,
                    tiedosto: "/Saame.pdf",
                  },
                },
              },
            },
          ];
        }
      });
      deleteAloitusKuulutusJulkaisuStub.callsFake(() => {
        if (mockedDatabaseProjekti) {
          // Just a simple mock to support only one julkaisu
          mockedDatabaseProjekti.aloitusKuulutusJulkaisut = [];
        }
      });
    }

    async function validateAloitusKuulutusState({
      oid,
      expectedState,
      syy,
    }: {
      expectedState: KuulutusJulkaisuTila | undefined;
      oid: string;
      syy?: string;
    }) {
      const p = await api.lataaProjekti(oid);
      if (expectedState == KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA) {
        expect(p.aloitusKuulutusJulkaisu).not.be.undefined;
        expect(p.aloitusKuulutusJulkaisu?.tila).to.eq(KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
        expect(p.aloitusKuulutus?.palautusSyy).be.oneOf([undefined, null]);
      } else if (expectedState == KuulutusJulkaisuTila.HYVAKSYTTY) {
        expect(p.aloitusKuulutusJulkaisu).not.be.undefined;
        expect(p.aloitusKuulutusJulkaisu?.tila).to.eq(KuulutusJulkaisuTila.HYVAKSYTTY);
        expect(p.aloitusKuulutus?.palautusSyy).be.oneOf([undefined, null]);
      } else {
        // Either rejected or inital state
        expect(p.aloitusKuulutusJulkaisu?.tila).to.be.undefined;
        if (syy) {
          expect(p.aloitusKuulutus?.palautusSyy).to.eq(syy);
        }
      }
    }

    userFixture.loginAs(UserFixture.mattiMeikalainen);

    // Load projekti and examine its permissions
    mockLataaProjektiFromVelho();

    let projekti = await api.lataaProjekti(fixture.PROJEKTI1_OID);
    expect(["Initial state with projektipaallikko and omistaja", projekti.kayttoOikeudet]).toMatchSnapshot();

    // Create stubs to keep state of the "database" so that it can be modified in the following steps
    mockDatabase();
    // Save projekti with the defaults. It should have both projektipaallikko and the current user
    projekti = await saveAndLoadProjekti(projekti, "both projektipaallikko and omistaja", {
      kayttoOikeudet: [
        {
          tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
          kayttajatunnus: "A123",
          puhelinnumero: "11",
        },
        {
          kayttajatunnus: "A000111",
          puhelinnumero: "22",
          yleinenYhteystieto: true,
        },
      ],
    });

    // Remove the other user and save
    projekti = await saveAndLoadProjekti(projekti, "only projektipaallikko", {
      kayttoOikeudet: [
        {
          tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
          kayttajatunnus: "A123",
          puhelinnumero: "11",
        },
      ],
    });

    // Add omistaja back and examine the results
    userFixture.loginAs(UserFixture.pekkaProjari);
    projekti = await saveAndLoadProjekti(
      projekti,
      "while adding other user back. There should be projektipaallikko and one user in the projekti now. Projektipaallikko cannot be removed, so it always stays there.",
      {
        kayttoOikeudet: [
          {
            kayttajatunnus: "A000111",
            puhelinnumero: "123456789",
          },
        ],
      }
    );

    // Add one muokkaaja more and examine the results. Also test that fields can be removed from database
    persistFileToProjektiStub.resolves("/suunnittelusopimus/logo.gif");
    const updatedValues: Partial<TallennaProjektiInput> = {
      versio: projekti.versio,
      kayttoOikeudet: [
        {
          tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
          kayttajatunnus: "A123",
          puhelinnumero: "11",
        },
        {
          kayttajatunnus: "A000111",
          puhelinnumero: "123456789",
        },
        {
          kayttajatunnus: "A2",
          puhelinnumero: "123456789",
        },
      ],
      suunnitteluSopimus: {
        kunta: kuntametadata.idForKuntaName("Nokia"),
        logo: {
          SUOMI: "/suunnittelusopimus/logo.gif",
        },
        yhteysHenkilo: "A2",
      },
      euRahoitus: false, // mandatory field for perustiedot
      vahainenMenettely: false, // mandatory field for perustiedot
      aloitusKuulutus: fixture.aloitusKuulutusInput,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.POHJOISSAAME,
        projektinNimiVieraskielella: "Projektin nimi saameksi",
      },
    };
    await saveAndLoadProjekti(
      projekti,
      "while adding one muokkaaja more. There should be three persons in the projekti now",
      updatedValues
    );

    // Verify that projekti is not visible for anonymous users
    userFixture.logout();
    await expect(api.lataaProjekti(fixture.PROJEKTI1_OID)).to.eventually.be.rejectedWith(NoVaylaAuthenticationError);
    userFixture.loginAs(UserFixture.pekkaProjari);

    // Send aloituskuulutus to be approved
    const oid = projekti.oid;
    await api.siirraTila({
      oid,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
    });

    // Check that the snapshot for aloituskuulutus is available
    await validateAloitusKuulutusState({
      oid,
      expectedState: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
    });

    // Reject aloituskuulutus
    const reason = "Tietoja puuttuu!";
    await api.siirraTila({
      oid,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
      toiminto: TilasiirtymaToiminto.HYLKAA,
      syy: reason,
    });

    // Verify rejection status from API
    await validateAloitusKuulutusState({ oid, expectedState: undefined, syy: reason });

    // Send aloituskuulutus to be approved again
    await api.siirraTila({
      oid,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
    });

    // Check that the snapshot for aloituskuulutus is available
    await validateAloitusKuulutusState({
      oid,
      expectedState: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
    });

    // Accept aloituskuulutus
    await api.siirraTila({
      oid,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
      toiminto: TilasiirtymaToiminto.HYVAKSY,
    });

    // Verify that the accepted aloituskuulutus is available
    await validateAloitusKuulutusState({ oid, expectedState: KuulutusJulkaisuTila.HYVAKSYTTY });

    // Verify the end result using snapshot
    expect(cleanup(await api.lataaProjekti(oid))).toMatchSnapshot();

    // Verify the public result using snapshot
    userFixture.logout();
    expect({
      description: "Public version of the projekti",
      projekti: cleanup(await api.lataaProjektiJulkinen(oid, Kieli.SUOMI)),
    }).toMatchSnapshot();
  });

  it("should return error if user has no permissions", async () => {
    userFixture.logout();

    createProjektiStub.resolves();

    await chai.assert.isRejected(api.tallennaProjekti(fixture.tallennaProjektiInput), NoVaylaAuthenticationError);
  });
});

function cleanup(obj: Record<string, any>) {
  replaceFieldsByName(obj, "2022-09-28T00:00", "lahetetty");
  replaceFieldsByName(obj, "2022-09-28", "hyvaksymisPaiva");
  return obj;
}

export function replaceFieldsByName(obj: Record<string, any>, value: unknown, ...fieldNames: string[]): void {
  Object.keys(obj).forEach(function (prop) {
    if (typeof obj[prop] == "object" && obj[prop] !== null) {
      replaceFieldsByName(obj[prop], value, ...fieldNames);
    } else if (fieldNames.indexOf(prop) >= 0) {
      obj[prop] = value;
    }
  });
}
