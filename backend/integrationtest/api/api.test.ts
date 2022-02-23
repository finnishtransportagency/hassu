import { describe, it } from "mocha";
import { api } from "./apiClient";
import { setupLocalDatabase } from "../util/databaseUtil";
import * as log from "loglevel";
import {
  AloitusKuulutus,
  AsiakirjaTyyppi,
  Kieli,
  Kielitiedot,
  KielitiedotInput,
  ProjektiRooli,
  SuunnitteluSopimus,
  SuunnitteluSopimusInput,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
} from "../../../common/graphql/apiModel";
import fs from "fs";
import axios from "axios";
import * as sinon from "sinon";
import { personSearchUpdaterClient } from "../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../src/personSearch/lambda/personSearchUpdaterHandler";
import { openSearchClient } from "../../src/projektiSearch/openSearchClient";
import { localstackS3Client } from "../util/s3Util";
import { projektiArchive } from "../../src/archive/projektiArchiveService";
import { fail } from "assert";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";

const { expect } = require("chai");
const sandbox = sinon.createSandbox();

describe("Api", () => {
  let readUsersFromSearchUpdaterLambda: sinon.SinonStub;
  let userFixture: UserFixture;

  before(async () => {
    localstackS3Client();
  });

  afterEach(() => {
    userFixture.logout();
    sandbox.restore();
  });

  beforeEach("Initialize test database!", async () => await setupLocalDatabase());

  beforeEach(async () => {
    userFixture = new UserFixture(userService);
    readUsersFromSearchUpdaterLambda = sandbox.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
    readUsersFromSearchUpdaterLambda.callsFake(async () => {
      return await personSearchUpdaterHandler.handleEvent();
    });

    sandbox.stub(openSearchClient, "query").resolves({ status: 200 });
    sandbox.stub(openSearchClient, "deleteProjekti");
    sandbox.stub(openSearchClient, "putProjekti");
  });

  it.only("should search, load and save a project", async function () {
    if (process.env.SKIP_VELHO_TESTS) {
      this.skip();
    }
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    const { oid, projekti } = await readProjektiFromVelho();

    // Expect that projektipaallikko is found
    const projektiPaallikko = projekti.kayttoOikeudet
      ?.filter((kayttaja) => kayttaja.rooli === ProjektiRooli.PROJEKTIPAALLIKKO && kayttaja.email)
      .pop();
    expect(projektiPaallikko).is.not.empty;

    const kayttoOikeudet = projekti.kayttoOikeudet?.map((value) => ({
      rooli: value.rooli,
      kayttajatunnus: value.kayttajatunnus,
      puhelinnumero: "123",
    }));

    // Save and load projekti
    await api.tallennaProjekti({
      oid,
      kayttoOikeudet,
    });
    await loadProjektiFromDatabase(oid);

    // Fill in information to projekti, including a file
    const uploadedFile = await tallennaLogo();
    const newNote = "uusi muistiinpano";
    const suunnitteluSopimusInput: SuunnitteluSopimusInput = {
      email: "Joku.Jossain@vayla.fi",
      puhelinnumero: "123",
      etunimi: "Joku",
      sukunimi: "Jossain",
      kunta: "Nokia",
      logo: uploadedFile,
    };
    const suunnitteluSopimus: SuunnitteluSopimus = {
      __typename: "SuunnitteluSopimus",
      email: "Joku.Jossain@vayla.fi",
      puhelinnumero: "123",
      etunimi: "Joku",
      sukunimi: "Jossain",
      kunta: "Nokia",
    };

    const aloitusKuulutus: AloitusKuulutus = {
      __typename: "AloitusKuulutus",
      kuulutusPaiva: "2022-01-02",
      hankkeenKuvaus: {
        __typename: "HankkeenKuvaukset",
        SUOMI: "Lorem Ipsum",
        RUOTSI: "På Svenska",
        SAAME: "Saameksi",
      },
      siirtyySuunnitteluVaiheeseen: "2022-01-01",
      elyKeskus: "Pirkanmaa",
      esitettavatYhteystiedot: [
        {
          __typename: "Yhteystieto",
          etunimi: "Marko",
          sukunimi: "Koi",
          sahkoposti: "markku.koi@koi.com",
          organisaatio: "Kajaani",
          puhelinnumero: "0293121213",
        },
      ],
    };

    const kielitiedotInput: KielitiedotInput = {
      ensisijainenKieli: Kieli.SUOMI,
    };

    const kielitiedot: Kielitiedot = {
      __typename: "Kielitiedot",
      ensisijainenKieli: Kieli.SUOMI,
    };

    await api.tallennaProjekti({
      oid,
      muistiinpano: newNote,
      aloitusKuulutus,
      suunnitteluSopimus: suunnitteluSopimusInput,
      kielitiedot: kielitiedotInput,
      euRahoitus: false,
    });

    // Check that the saved projekti is what it is supposed to be
    const updatedProjekti = await loadProjektiFromDatabase(oid);
    expect(updatedProjekti.muistiinpano).to.be.equal(newNote);
    expect(updatedProjekti.aloitusKuulutus).eql(aloitusKuulutus);
    expect(updatedProjekti.suunnitteluSopimus).include(suunnitteluSopimus);
    expect(updatedProjekti.suunnitteluSopimus?.logo).contain("/suunnittelusopimus/logo.png");
    expect(updatedProjekti.kielitiedot).eql(kielitiedot);
    expect(updatedProjekti.euRahoitus).to.be.false;

    // Generate Aloituskuulutus PDF
    const pdf = await api.esikatseleAsiakirjaPDF(oid, AsiakirjaTyyppi.ALOITUSKUULUTUS, Kieli.SUOMI);
    expect(pdf.nimi).to.include(".pdf");
    expect(pdf.sisalto).not.to.be.empty;
    expect(pdf.sisalto.length).to.be.greaterThan(50000);
    fs.mkdirSync(".report", { recursive: true });
    fs.writeFileSync(".report/" + pdf.nimi, Buffer.from(pdf.sisalto, "base64"));

    // Test that fields can be removed as well
    await api.tallennaProjekti({
      oid,
      suunnitteluSopimus: null,
    });

    const updatedProjekti2 = await loadProjektiFromDatabase(oid);
    expect(updatedProjekti2.muistiinpano).to.be.equal(newNote);
    expect(updatedProjekti2.aloitusKuulutus).eql(aloitusKuulutus);
    expect(updatedProjekti2.suunnitteluSopimus).to.be.undefined;
    expect(updatedProjekti2.kielitiedot).eql(kielitiedot);

    userFixture.loginAsProjektiKayttaja(projektiPaallikko);
    await api.siirraTila({
      oid,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
    });
    await api.siirraTila({ oid, tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS, toiminto: TilasiirtymaToiminto.HYVAKSY });

    userFixture.logout();
    const publicProjekti = await loadProjektiFromDatabase(oid);
    expect(publicProjekti).toMatchSnapshot();

    // Finally delete the projekti
    const archiveResult = await projektiArchive.archiveProjekti(oid);
    expect(archiveResult.oid).to.be.equal(oid);
    expect(archiveResult.timestamp).to.not.be.empty;
  });

  async function readProjektiFromVelho() {
    const oid = await searchProjectsFromVelhoAndPickFirst();
    const projekti = await api.lataaProjekti(oid);
    await expect(projekti.tallennettu).to.be.false;
    log.info(JSON.stringify(projekti, null, 2));
    return { oid, projekti };
  }

  async function loadProjektiFromDatabase(oid: string) {
    const savedProjekti = await api.lataaProjekti(oid);
    expect(!savedProjekti.tallennettu || savedProjekti.tallennettu).to.be.true;
    return savedProjekti;
  }

  async function searchProjectsFromVelhoAndPickFirst(): Promise<string> {
    const searchResult = await api.getVelhoSuunnitelmasByName("HASSU AUTOMAATTITESTIPROJEKTI1");
    // tslint:disable-next-line:no-unused-expression
    expect(searchResult).not.to.be.empty;

    const oid = searchResult.pop()?.oid;
    if (!oid) {
      fail("No suitable projekti found from Velho");
    }
    return oid;
  }

  async function tallennaLogo() {
    const uploadProperties = await api.valmisteleTiedostonLataus("logo.png");
    expect(uploadProperties).to.not.be.empty;
    expect(uploadProperties.latausLinkki).to.not.be.undefined;
    expect(uploadProperties.tiedostoPolku).to.not.be.undefined;
    const putResponse = await axios.put(
      uploadProperties.latausLinkki,
      fs.readFileSync(__dirname + "/../files/logo.png"),
      {
        headers: { "content-type": "image/png" },
      }
    );
    expect(putResponse.status).to.be.eq(200);
    return uploadProperties.tiedostoPolku;
  }
});
