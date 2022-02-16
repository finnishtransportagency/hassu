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
  Kieli,
  Projekti,
  ProjektiRooli,
  TallennaProjektiInput,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
} from "../../common/graphql/apiModel";
import { AloitusKuulutusJulkaisu, DBProjekti } from "../src/database/model/projekti";
import * as log from "loglevel";
import cloneDeep from "lodash/cloneDeep";
import mergeWith from "lodash/mergeWith";
import { PersonSearchFixture } from "./personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../src/personSearch/kayttajas";
import { AwsClientStub, mockClient } from "aws-sdk-client-mock";
import { getS3Client } from "../src/aws/clients";
import { PutObjectCommand, PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";

const { expect, assert } = require("chai");

describe("apiHandler", () => {
  let userFixture: UserFixture;

  afterEach(() => {
    sinon.reset();
    sinon.restore();
    userFixture.logout();
  });

  beforeEach(() => {
    userFixture = new UserFixture(userService);
  });

  describe("handleEvent", () => {
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
    let mockS3CLient: AwsClientStub<S3Client>;

    beforeEach(() => {
      createProjektiStub = sinon.stub(projektiDatabase, "createProjekti");
      getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
      saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
      loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
      insertAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase, "insertAloitusKuulutusJulkaisu");
      updateAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase, "updateAloitusKuulutusJulkaisu");
      deleteAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase, "deleteAloitusKuulutusJulkaisu");
      loadVelhoProjektiByOidStub = sinon.stub(velho, "loadProjekti");
      mockS3CLient = mockClient(getS3Client());

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
    });

    function mockLataaProjektiFromVelho() {
      loadProjektiByOidStub.resolves();
      loadVelhoProjektiByOidStub.callsFake(() => ({
        projekti: cloneDeep(fixture.velhoprojekti1),
        vastuuhenkilo: personSearchFixture.pekkaProjari.email,
        kayttoOikeudet: [],
      }));
      createProjektiStub.resolves();
    }

    function validatePutObjectCommandInput(callNumber: number, yllapitoBucketName: string, filePath: string) {
      const { Bucket: aloituskuulutusBucket, Key: aloituskuulutusKey } = mockS3CLient.call(callNumber).args[0]
        .input as PutObjectCommandInput;
      expect(aloituskuulutusBucket).to.eq(yllapitoBucketName);
      expect(aloituskuulutusKey).to.eq(filePath);
    }

    describe("lataaProjekti", () => {
      it("should load a new project from Velho", async () => {
        userFixture.loginAs(UserFixture.mattiMeikalainen);
        mockLataaProjektiFromVelho();

        const projekti = await api.lataaProjekti(fixture.projekti1.oid);
        expect(projekti).toMatchSnapshot();
        sinon.assert.calledOnce(loadProjektiByOidStub);
        sinon.assert.calledOnce(loadVelhoProjektiByOidStub);
      });
    });

    describe("tallennaProjekti", () => {
      it("should modify permissions from a project successfully", async () => {
        let mockedDatabaseProjekti: DBProjekti | undefined;

        async function saveAndLoadProjekti(
          p: Projekti,
          description: string,
          updatedValues: Partial<TallennaProjektiInput>
        ) {
          await api.tallennaProjekti({
            oid: fixture.PROJEKTI1_OID,
            ...updatedValues,
          });
          if (p.tallennettu) {
            expect(saveProjektiStub.calledOnce);
            expect(["Save projekti having " + description, saveProjektiStub.getCall(0).firstArg]).toMatchSnapshot();
            saveProjektiStub.resetHistory();
          } else {
            expect(createProjektiStub.calledOnce);
            expect(["Create projekti having " + description, createProjektiStub.getCall(0).firstArg]).toMatchSnapshot();
            createProjektiStub.resetHistory();
          }
          // Load projekti and examine its permissions again
          p = await api.lataaProjekti(fixture.projekti1.oid);
          expect(["Loaded projekti having " + description, p]).toMatchSnapshot();
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
              mockedDatabaseProjekti.aloitusKuulutusJulkaisut = [julkaisu];
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
            const julkaisu = findAloitusKuulutusJulkaisuByState(p, AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA);
            expect(julkaisu).to.not.be.empty;
            expect(!!p.aloitusKuulutus?.palautusSyy); // null or undefined
          } else if (expectedState == AloitusKuulutusTila.HYVAKSYTTY) {
            expect(p.aloitusKuulutusJulkaisut).not.be.empty;
            const julkaisu = findAloitusKuulutusJulkaisuByState(p, AloitusKuulutusTila.HYVAKSYTTY);
            expect(julkaisu).to.not.be.empty;
            expect(!!p.aloitusKuulutus?.palautusSyy); // null or undefined
          } else {
            // Either rejected or inital state
            const julkaisu = findAloitusKuulutusJulkaisuByState(p, AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA);
            expect(julkaisu).to.be.undefined;
            if (syy) {
              expect(p.aloitusKuulutus?.palautusSyy).to.eq(syy);
            }
          }
        }

        userFixture.loginAs(UserFixture.mattiMeikalainen);

        // Load projekti and examine its permissions
        mockLataaProjektiFromVelho();
        let projekti = await api.lataaProjekti(fixture.projekti1.oid);
        expect(["Initial state with projektipaallikko and omistaja", projekti.kayttoOikeudet]).toMatchSnapshot();

        // Create stubs to keep state of the "database" so that it can be modified in the following steps
        mockDatabase();
        // Save projekti with the defaults. It should have both projektipaallikko and the current user as omistaja
        projekti = await saveAndLoadProjekti(projekti, "having both projektipaallikko and omistaja", {
          kayttoOikeudet: [
            {
              rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
              kayttajatunnus: "A123",
              puhelinnumero: "11",
            },
            {
              kayttajatunnus: "A000111",
              rooli: ProjektiRooli.OMISTAJA,
              puhelinnumero: "22",
            },
          ],
        });

        // Remove omistaja and save
        projekti = await saveAndLoadProjekti(projekti, "having only projektipaallikko", {
          kayttoOikeudet: [
            {
              rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
              kayttajatunnus: "A123",
              puhelinnumero: "11",
            },
          ],
        });

        // Add omistaja back and examine the results
        userFixture.loginAs(UserFixture.pekkaProjari);
        projekti = await saveAndLoadProjekti(
          projekti,
          "while adding omistaja back. There should be projektipaallikko and omistaja in the projekti now. Projektipaallikko cannot be removed, so it always stays there.",
          {
            kayttoOikeudet: [
              {
                kayttajatunnus: "A000111",
                puhelinnumero: "123456789",
                rooli: ProjektiRooli.OMISTAJA,
              },
            ],
          }
        );

        // Add one muokkaaja more and examine the results. Also test that fields can be removed from database
        await saveAndLoadProjekti(
          projekti,
          "while adding one muokkaaja more. There should be three persons in the projekti now",
          {
            kayttoOikeudet: [
              {
                rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
                kayttajatunnus: "A123",
                puhelinnumero: "11",
              },
              {
                rooli: ProjektiRooli.OMISTAJA,
                kayttajatunnus: "A000111",
                puhelinnumero: "123456789",
              },
              {
                kayttajatunnus: "A2",
                puhelinnumero: "123456789",
                rooli: ProjektiRooli.OMISTAJA,
              },
            ],
            suunnitteluSopimus: null,
            euRahoitus: false, // mandatory field for perustiedot
            aloitusKuulutus: fixture.aloitusKuulutusInput,
            kielitiedot: {
              ensisijainenKieli: Kieli.SUOMI,
              toissijainenKieli: Kieli.SAAME,
              projektinNimiVieraskielella: "Projektin nimi saameksi",
            },
          }
        );

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
        mockS3CLient.on(PutObjectCommand).resolves({});
        await api.siirraTila({
          oid,
          tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
          toiminto: TilasiirtymaToiminto.HYVAKSY,
        });

        const calls = mockS3CLient.calls();
        expect(calls).to.have.length(2);
        validatePutObjectCommandInput(
          0,
          "hassu-localstack-yllapito",
          "yllapito/tiedostot/projekti/1/aloituskuulutus/KUULUTUS SUUNNITTELUN ALOITTAMISESTA Testiprojekti 1.pdf"
        );
        validatePutObjectCommandInput(
          1,
          "hassu-localstack-yllapito",
          "yllapito/tiedostot/projekti/1/aloituskuulutus/ILMOITUS TOIMIVALTAISEN VIRANOMAISEN KUULUTUKSESTA Testiprojekti 1.pdf"
        );

        // Verify that the accepted aloituskuulutus is available
        await validateAloitusKuulutusState({ oid, expectedState: AloitusKuulutusTila.HYVAKSYTTY });

        // Verify the end result using snapshot
        expect(await api.lataaProjekti(oid)).toMatchSnapshot();
      });
    });

    it("should return error if user has no permissions", async () => {
      userFixture.logout();

      createProjektiStub.resolves();

      await assert.isRejected(api.tallennaProjekti(fixture.tallennaProjektiInput), IllegalAccessError);
    });
  });
});

function findAloitusKuulutusJulkaisuByState(p: Projekti, tila: AloitusKuulutusTila) {
  return p.aloitusKuulutusJulkaisut?.filter((j) => j.tila == tila).pop();
}
