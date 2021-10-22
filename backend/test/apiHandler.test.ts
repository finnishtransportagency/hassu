import { assert } from "chai";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../src/database/projektiDatabase";
import { ProjektiFixture } from "./fixture/projektiFixture";
import { UserFixture } from "./fixture/userFixture";
import { IllegalAccessError } from "../src/error/IllegalAccessError";
import { velho } from "../src/velho/velhoClient";
import { api } from "../integrationtest/api/apiClient";
import { personSearch } from "../src/personSearch/personSearchClient";
import {
  pekkaProjariFromPersonSearch,
  pekkaProjariProjektiKayttaja,
  vaylaMatti,
  vaylaMattiFromPersonSearch,
  vaylaMattiProjektiKayttaja,
} from "./fixture/users";
import { Projekti, ProjektiKayttajaInput, ProjektiRooli } from "../../common/graphql/apiModel";
import { DBProjekti } from "../src/database/model/projekti";
import * as _ from "lodash";
import * as log from "loglevel";

const { expect } = require("chai");

describe("apiHandler", () => {
  const userFixture = new UserFixture();

  afterEach(() => {
    sinon.reset();
    sinon.restore();
    userFixture.logout();
  });

  describe("handleEvent", () => {
    let fixture: ProjektiFixture;

    let createProjektiStub: sinon.SinonStub;
    let saveProjektiStub: sinon.SinonStub;
    let loadProjektiByOidStub: sinon.SinonStub;
    let listAccountsStub: sinon.SinonStub;
    let loadVelhoProjektiByOidStub: sinon.SinonStub;

    beforeEach(() => {
      createProjektiStub = sinon.stub(projektiDatabase, "createProjekti");
      listAccountsStub = sinon.stub(personSearch, "listAccounts");
      saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
      loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
      loadVelhoProjektiByOidStub = sinon.stub(velho, "loadProjekti");

      fixture = new ProjektiFixture();
      listAccountsStub.resolves([vaylaMattiFromPersonSearch, pekkaProjariFromPersonSearch]);
    });

    function mockLataaProjektiFromVelho() {
      loadProjektiByOidStub.resolves();
      loadVelhoProjektiByOidStub.callsFake(
        () =>
          ({
            projekti: _.cloneDeep(fixture.velhoprojekti1),
            vastuuhenkilo: pekkaProjariProjektiKayttaja.email,
            kayttoOikeudet: [],
          } as { projekti: DBProjekti; vastuuhenkilo: string })
      );
      createProjektiStub.resolves();
    }

    describe("lataaProjekti", () => {
      it("should load a new project from Velho", async () => {
        userFixture.loginAs(vaylaMatti);
        mockLataaProjektiFromVelho();

        const projekti = await api.lataaProjekti(fixture.projekti1.oid);
        expect(projekti).toMatchSnapshot();
        sinon.assert.calledOnce(loadProjektiByOidStub);
        sinon.assert.calledOnce(loadVelhoProjektiByOidStub);
      });
    });

    describe("tallennaProjekti", () => {
      it("should save a new project", async () => {
        userFixture.loginAs(vaylaMatti);
        mockLataaProjektiFromVelho();

        await api.tallennaProjekti(fixture.tallennaProjektiInput);
        sinon.assert.calledOnce(loadProjektiByOidStub); // To check if the projekti already exists in the database
        sinon.assert.calledOnce(loadVelhoProjektiByOidStub); // To load the projekti from Velho
        sinon.assert.calledOnce(createProjektiStub); // To create the projekti in our database
        expect(createProjektiStub.getCall(0).firstArg).toMatchSnapshot();
      });

      it("should update an existing project", async () => {
        userFixture.loginAs(vaylaMatti);
        loadProjektiByOidStub.resolves(fixture.dbProjekti1);
        saveProjektiStub.resolves();

        await api.tallennaProjekti({
          ...fixture.tallennaProjektiInput,
          kuvaus: fixture.PROJEKTI1_KUVAUS_2,
        });
        expect(saveProjektiStub.calledOnce);
        expect(saveProjektiStub.getCall(0).firstArg).toMatchSnapshot();
      });

      it("should modify permissions from a project successfully", async () => {
        let mockedDatabaseProjekti: DBProjekti | undefined;

        async function saveAndLoadProjekti(p: Projekti, description: string, kayttoOikeudet?: ProjektiKayttajaInput[]) {
          await api.tallennaProjekti({
            oid: fixture.PROJEKTI1_OID,
            kayttoOikeudet,
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
          const updatedKayttoOikeudet = p.kayttoOikeudet;
          expect(["Loaded projekti having " + description, updatedKayttoOikeudet]).toMatchSnapshot();
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
            mockedDatabaseProjekti = _.mergeWith(mockedDatabaseProjekti, dbProjekti);
            if (dbProjekti.kayttoOikeudet) {
              // @ts-ignore
              mockedDatabaseProjekti.kayttoOikeudet = dbProjekti.kayttoOikeudet;
            }
            log.info(mockedDatabaseProjekti);
          });
          createProjektiStub.callsFake((dbProjekti: DBProjekti) => {
            dbProjekti.tallennettu = true;
            mockedDatabaseProjekti = dbProjekti;
          });
        }

        userFixture.loginAs(vaylaMatti);

        // Load projekti and examine its permissions
        mockLataaProjektiFromVelho();
        let projekti = await api.lataaProjekti(fixture.projekti1.oid);
        expect(["Initial state with projektipaallikko and omistaja", projekti.kayttoOikeudet]).toMatchSnapshot();

        // Create stubs to keep state of the "database" so that it can be modified in the following steps
        mockDatabase();
        // Save projekti with the defaults. It should have both projektipaallikko and the current user as omistaja
        projekti = await saveAndLoadProjekti(projekti, "having both projektipaallikko and omistaja");

        // Remove vaylaMatti and save
        const onlyProjektiPaallikko = projekti.kayttoOikeudet?.filter((user) => user.kayttajatunnus !== vaylaMatti.uid);
        projekti = await saveAndLoadProjekti(projekti, "having only projektipaallikko", onlyProjektiPaallikko);

        // Add omistaja back and examine the results
        await saveAndLoadProjekti(
          projekti,
          "while adding omistaja back. There should be projektipaallikko and omistaja in the projekti now",
          [
            {
              kayttajatunnus: vaylaMattiProjektiKayttaja.kayttajatunnus,
              puhelinnumero: vaylaMattiProjektiKayttaja.puhelinnumero,
              rooli: ProjektiRooli.OMISTAJA,
            },
          ]
        );
      });

      it("should return error if user has no permissions", async () => {
        userFixture.logout();

        createProjektiStub.resolves();

        await assert.isRejected(api.tallennaProjekti(fixture.tallennaProjektiInput), IllegalAccessError);
      });
    });
  });
});
