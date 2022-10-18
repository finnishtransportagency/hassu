import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../src/database/projektiDatabase";
import { ProjektiFixture } from "./fixture/projektiFixture";
import { UserFixture } from "./fixture/userFixture";
import { IllegalAccessError } from "../src/error/IllegalAccessError";
import { velho } from "../src/velho/velhoClient";
import { api } from "../integrationtest/api/apiClient";
import { personSearch } from "../src/personSearch/personSearchClient";
import { userService } from "../src/user";
import {
  AloitusKuulutusTila,
  KayttajaTyyppi,
  Kieli,
  Projekti,
  TallennaProjektiInput,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
} from "../../common/graphql/apiModel";
import { AloitusKuulutusJulkaisu, DBProjekti } from "../src/database/model";
import * as log from "loglevel";
import mergeWith from "lodash/mergeWith";
import { PersonSearchFixture } from "./personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../src/personSearch/kayttajas";
import { fileService } from "../src/files/fileService";
import { NotFoundError } from "../src/error/NotFoundError";
import { emailClient } from "../src/email/email";
import AWS from "aws-sdk";
import { findJulkaisuWithTila } from "../src/projekti/projektiUtil";
import { Readable } from "stream";
import { pdfGeneratorClient } from "../src/asiakirja/lambda/pdfGeneratorClient";
import { handleEvent as pdfGenerator } from "../src/asiakirja/lambda/pdfGeneratorHandler";
import { getS3 } from "../src/aws/client";
import { awsMockResolves, expectAwsCalls } from "./aws/awsMock";
import { kuntametadata } from "../../common/kuntametadata";

const { expect, assert } = require("chai");

AWS.config.logger = console;

describe("apiHandler", () => {
  let userFixture: UserFixture;
  let fixture: ProjektiFixture;
  let personSearchFixture: PersonSearchFixture;

  let putObjectStub: sinon.SinonStub;
  let copyObjectStub: sinon.SinonStub;
  let getObjectStub: sinon.SinonStub;
  let headObjectStub: sinon.SinonStub;
  let deleteObjectStub: sinon.SinonStub;

  let createProjektiStub: sinon.SinonStub;

  let saveProjektiStub: sinon.SinonStub;
  let loadProjektiByOidStub: sinon.SinonStub;
  let getKayttajasStub: sinon.SinonStub;
  let loadVelhoProjektiByOidStub: sinon.SinonStub;
  let insertAloitusKuulutusJulkaisuStub: sinon.SinonStub;
  let updateAloitusKuulutusJulkaisuStub: sinon.SinonStub;
  let deleteAloitusKuulutusJulkaisuStub: sinon.SinonStub;
  let persistFileToProjektiStub: sinon.SinonStub;
  let sendEmailStub: sinon.SinonStub;
  let pdfGeneratorLambdaStub: sinon.SinonStub;

  before(() => {
    userFixture = new UserFixture(userService);
    let s3 = getS3();
    putObjectStub = sinon.stub(s3, "putObject");
    copyObjectStub = sinon.stub(s3, "copyObject");
    getObjectStub = sinon.stub(s3, "getObject");
    headObjectStub = sinon.stub(s3, "headObject");
    deleteObjectStub = sinon.stub(s3, "deleteObject");

    createProjektiStub = sinon.stub(projektiDatabase, "createProjekti");
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    insertAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "insert");
    updateAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "update");
    deleteAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "delete");
    loadVelhoProjektiByOidStub = sinon.stub(velho, "loadProjekti");
    persistFileToProjektiStub = sinon.stub(fileService, "persistFileToProjekti");
    sendEmailStub = sinon.stub(emailClient, "sendEmail");

    sendEmailStub.resolves();

    pdfGeneratorLambdaStub = sinon.stub(pdfGeneratorClient, "generatePDF");
  });

  after(() => {
    sinon.restore();
  });

  beforeEach(() => {
    awsMockResolves(getObjectStub, {
      Body: new Readable(),
    });

    awsMockResolves(headObjectStub, { Metadata: {} });
    awsMockResolves(putObjectStub);
    awsMockResolves(deleteObjectStub);
    awsMockResolves(copyObjectStub);

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
  });

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
  });

  describe("handleEvent", () => {
    function mockLataaProjektiFromVelho() {
      loadProjektiByOidStub.resolves();
      const velhoProjekti = fixture.velhoprojekti1();
      velhoProjekti.velho!.vastuuhenkilonEmail = personSearchFixture.pekkaProjari.email;

      loadVelhoProjektiByOidStub.resolves(velhoProjekti);
    }

    describe("lataaProjekti", () => {
      it("should load a new project from Velho", async () => {
        userFixture.loginAs(UserFixture.mattiMeikalainen);
        mockLataaProjektiFromVelho();

        const projekti = await api.lataaProjekti(fixture.PROJEKTI1_OID);
        expect(cleanup(projekti)).toMatchSnapshot();
        sinon.assert.calledOnce(loadProjektiByOidStub);
        sinon.assert.calledOnce(loadVelhoProjektiByOidStub);
      });
    });

    describe("tallennaProjekti", () => {
      it("should modify permissions from a project successfully", async () => {
        let mockedDatabaseProjekti: DBProjekti | undefined;

        async function saveAndLoadProjekti(p: Projekti, description: string, updatedValues: Partial<TallennaProjektiInput>) {
          await api.tallennaProjekti({
            oid: fixture.PROJEKTI1_OID,
            ...updatedValues,
          });

          if (p.tallennettu) {
            expect(saveProjektiStub.calledOnce);
            const projekti = saveProjektiStub.getCall(0).firstArg;
            expect(projekti.salt).to.not.be.empty;
            projekti.salt = "***unittest***";
            expect(["Save projekti having " + description, cleanup(projekti)]).toMatchSnapshot();
            saveProjektiStub.resetHistory();
          } else {
            expect(createProjektiStub.calledOnce);
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
            log.info(mockedDatabaseProjekti);
            mockedDatabaseProjekti = mergeWith(mockedDatabaseProjekti, dbProjekti);
            if (mockedDatabaseProjekti && dbProjekti.kayttoOikeudet) {
              mockedDatabaseProjekti.kayttoOikeudet = dbProjekti.kayttoOikeudet;
            }
            log.info(mockedDatabaseProjekti);
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
                      aloituskuulutusIlmoitusPDFPath: "/aloituskuulutus/T412_1 Ilmoitus aloituskuulutuksesta.pdf",
                      aloituskuulutusPDFPath: "/aloituskuulutus/T412 Aloituskuulutus.pdf",
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
          expectedState: AloitusKuulutusTila | undefined;
          oid: string;
          syy?: string;
        }) {
          const p = await api.lataaProjekti(oid);
          if (expectedState == AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA) {
            expect(p.aloitusKuulutusJulkaisut).not.be.empty;
            const julkaisu = findJulkaisuWithTila(p.aloitusKuulutusJulkaisut, AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA);
            expect(julkaisu).to.not.be.empty;
            expect(!!p.aloitusKuulutus?.palautusSyy); // null or undefined
          } else if (expectedState == AloitusKuulutusTila.HYVAKSYTTY) {
            expect(p.aloitusKuulutusJulkaisut).not.be.empty;
            const julkaisu = findJulkaisuWithTila(p.aloitusKuulutusJulkaisut, AloitusKuulutusTila.HYVAKSYTTY);
            expect(julkaisu).to.not.be.empty;
            expect(!!p.aloitusKuulutus?.palautusSyy); // null or undefined
          } else {
            // Either rejected or inital state
            const julkaisu = findJulkaisuWithTila(p.aloitusKuulutusJulkaisut, AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA);
            expect(julkaisu).to.be.undefined;
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
        let updatedValues: Partial<TallennaProjektiInput> = {
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
            logo: "/suunnittelusopimus/logo.gif",
            yhteysHenkilo: "A2",
          },
          euRahoitus: false, // mandatory field for perustiedot
          aloitusKuulutus: fixture.aloitusKuulutusInput,
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
            toissijainenKieli: Kieli.SAAME,
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
        await expect(api.lataaProjekti(fixture.PROJEKTI1_OID)).to.eventually.be.rejectedWith(NotFoundError);
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
          expectedState: AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA,
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
          expectedState: AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA,
        });

        // Accept aloituskuulutus
        await api.siirraTila({
          oid,
          tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
          toiminto: TilasiirtymaToiminto.HYVAKSY,
        });

        expectAwsCalls(putObjectStub);
        expectAwsCalls(copyObjectStub);
        expectAwsCalls(getObjectStub);
        expectAwsCalls(headObjectStub);
        expectAwsCalls(deleteObjectStub);

        // Verify that the accepted aloituskuulutus is available
        await validateAloitusKuulutusState({ oid, expectedState: AloitusKuulutusTila.HYVAKSYTTY });

        // Verify the end result using snapshot
        expect(cleanup(await api.lataaProjekti(oid))).toMatchSnapshot();

        // Verify the public result using snapshot
        userFixture.logout();
        expect({
          description: "Public version of the projekti",
          projekti: cleanup(await api.lataaProjekti(oid)),
        }).toMatchSnapshot();
      });
    });

    it("should return error if user has no permissions", async () => {
      userFixture.logout();

      createProjektiStub.resolves();

      await assert.isRejected(api.tallennaProjekti(fixture.tallennaProjektiInput), IllegalAccessError);
    });
  });
});

function cleanup(obj: Record<string, any>) {
  replaceFieldsByName(obj, "2022-09-28T00:00", "lahetetty");
  return obj;
}

function replaceFieldsByName(obj: Record<string, any>, value: unknown, ...fieldNames: string[]): void {
  Object.keys(obj).forEach(function (prop) {
    if (typeof obj[prop] == "object" && obj[prop] !== null) {
      replaceFieldsByName(obj[prop], value, ...fieldNames);
    } else if (fieldNames.indexOf(prop) >= 0) {
      obj[prop] = value;
    }
  });
}
