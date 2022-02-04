/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { runAsVaylaUser } from "../util/users";
import { api } from "./apiClient";
import { setupLocalDatabase } from "../util/databaseUtil";
import * as log from "loglevel";
import {
  AloitusKuulutus,
  AsiakirjaTyyppi,
  ProjektiRooli,
  SuunnitteluSopimus,
  SuunnitteluSopimusInput,
} from "../../../common/graphql/apiModel";
import fs from "fs";
import axios from "axios";
import * as sinon from "sinon";
import { personSearchUpdaterClient } from "../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../src/personSearch/lambda/personSearchUpdaterHandler";
import { openSearchClient } from "../../src/projektiSearch/openSearchClient";
import { localstackS3Client } from "../util/s3Util";
import { s3Cache } from "../../src/cache/s3Cache";
import { PERSON_SEARCH_CACHE_KEY } from "../../src/personSearch/personSearchClient";

const { expect } = require("chai");
const sandbox = sinon.createSandbox();

describe("Api", () => {
  let readUsersFromSearchUpdaterLambda: sinon.SinonStub;

  before(async () => {
    localstackS3Client();
    await s3Cache.clear(PERSON_SEARCH_CACHE_KEY);
  });

  afterEach(() => {
    sandbox.restore();
  });

  beforeEach("Initialize test database!", async () => await setupLocalDatabase());

  beforeEach(async () => {
    readUsersFromSearchUpdaterLambda = sandbox.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
    readUsersFromSearchUpdaterLambda.callsFake(async () => {
      return await personSearchUpdaterHandler.handleEvent();
    });

    sandbox.stub(openSearchClient, "query").resolves({ status: 200 });
    sandbox.stub(openSearchClient, "deleteProjekti");
    sandbox.stub(openSearchClient, "putProjekti");
  });

  it("should search, load and save a project", async function () {
    if (process.env.SKIP_VELHO_TESTS) {
      this.skip();
    }
    runAsVaylaUser();

    const oid = await searchProjectsFromVelhoAndPickFirst();
    const projekti = await api.lataaProjekti(oid);
    await expect(projekti.tallennettu).to.be.false;
    log.info(JSON.stringify(projekti, null, 2));

    // Expect that projektipaallikko is found
    expect(
      projekti.kayttoOikeudet?.filter(
        (kayttaja) => kayttaja.rooli === ProjektiRooli.PROJEKTIPAALLIKKO && kayttaja.email
      )
    ).is.not.empty;

    const kayttoOikeudet = projekti.kayttoOikeudet?.map((value) => ({
      rooli: value.rooli,
      kayttajatunnus: value.kayttajatunnus,
      puhelinnumero: "123",
    }));

    await api.tallennaProjekti({
      oid,
      kayttoOikeudet,
    });
    await loadProjektiFromDatabase(oid);

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
      hankkeenKuvaus: "Lorem Ipsum",
      hankkeenKuvausRuotsi: "På Svenska",
      hankkeenKuvausSaame: "Saameksi",
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

    const lisakuulutuskieli = "ruotsi";

    await api.tallennaProjekti({
      oid,
      muistiinpano: newNote,
      aloitusKuulutus,
      suunnitteluSopimus: suunnitteluSopimusInput,
      lisakuulutuskieli,
      euRahoitus: false,
    });

    const updatedProjekti = await loadProjektiFromDatabase(oid);
    expect(updatedProjekti.muistiinpano).to.be.equal(newNote);
    expect(updatedProjekti.aloitusKuulutus).eql(aloitusKuulutus);
    expect(updatedProjekti.suunnitteluSopimus).include(suunnitteluSopimus);
    expect(updatedProjekti.suunnitteluSopimus?.logo).contain("/suunnittelusopimus/logo.png");
    expect(updatedProjekti.lisakuulutuskieli).to.be.equal(lisakuulutuskieli);
    expect(updatedProjekti.euRahoitus).to.be.false;

    const pdf = await api.lataaAsiakirjaPDF(oid, AsiakirjaTyyppi.ALOITUSKUULUTUS);
    expect(pdf.nimi).to.be.equal("aloituskuulutus.pdf");
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
    expect(updatedProjekti2.lisakuulutuskieli).to.be.equal(lisakuulutuskieli);
  });

  async function loadProjektiFromDatabase(oid: string) {
    const savedProjekti = await api.lataaProjekti(oid);
    expect(savedProjekti.tallennettu).to.be.true;
    return savedProjekti;
  }

  async function searchProjectsFromVelhoAndPickFirst(): Promise<string> {
    const searchResult = await api.getVelhoSuunnitelmasByName("HASSUTESTIPROJEKTI");
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
