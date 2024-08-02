import sinon from "sinon";
import { userService } from "../../src/user";
import TEST_HYVAKSYMISESITYS, {
  TEST_HYVAKSYMISESITYS2,
  TEST_HYVAKSYMISESITYS_FILES,
  TEST_HYVAKSYMISESITYS_FILES2,
} from "./TEST_HYVAKSYMISESITYS";
import { deleteYllapitoFiles, insertYllapitoFileToS3 } from "./util";
import { UserFixture } from "../../test/fixture/userFixture";
import { insertProjektiToDB, removeProjektiFromDB, setupLocalDatabase } from "../util/databaseUtil";
import { TEST_PROJEKTI, TEST_PROJEKTI_FILES } from "./TEST_PROJEKTI";
import * as API from "hassu-common/graphql/apiModel";
import { haeHyvaksymisEsityksenTiedot, listaaHyvaksymisEsityksenTiedostot } from "../../src/HyvaksymisEsitys/actions";
import { expect } from "chai";
import { assertIsDefined } from "../../src/util/assertions";
import axios from "axios";
import { adaptFileName } from "../../src/tiedostot/paths";
import { IllegalAccessError } from "hassu-common/error";
import MockDate from "mockdate";
import omit from "lodash/omit";
import { DBVaylaUser } from "../../src/database/model";
import GetProjektiStatus from "../../src/projekti/status/getProjektiStatus";

describe("Hyväksymisesityksen tiedostojen listaaminen (aineistolinkin katselu)", () => {
  const userFixture = new UserFixture(userService);
  setupLocalDatabase();
  const oid = TEST_PROJEKTI.oid;
  let hash = ""; // Asetetaan before each -funktiossa

  // Määritetään DB:ssä olevan projektin tiedot
  const projari = UserFixture.pekkaProjari;
  const projariAsVaylaDBUser: DBVaylaUser = {
    kayttajatunnus: projari.uid!,
    tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
    email: "email@email.com",
    puhelinnumero: "01234567",
    organisaatio: "Väylävirasto",
    etunimi: "Pekka",
    sukunimi: "Projari",
    muokattavissa: false,
    yleinenYhteystieto: true,
    elyOrganisaatio: API.ELY.LAPIN_ELY,
  };
  const projektiInDB = {
    ...TEST_PROJEKTI,
    muokattavaHyvaksymisEsitys: {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.MUOKKAUS,
    },
    julkaistuHyvaksymisEsitys: {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksyja: "theadminuid",
      hyvaksymisPaiva: "2022-01-01",
    },
    kayttoOikeudet: [projariAsVaylaDBUser],
    aineistoHandledAt: "2022-01-02T02:00:01+02:00", //sekunti aineistojen lisäyshetken jälkeen
  };

  before(async () => {
    // Poista projektin tiedostot testisetin alussa
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}/`);
    // Before eachissä haetaan projektin tiedot, mitä varten tarvitaan getProjektiStatusta
    sinon.stub(GetProjektiStatus, "getProjektiStatus").resolves(API.Status.NAHTAVILLAOLO);
  });

  beforeEach(async () => {
    MockDate.set("2032-12-31"); // Päivä ennen poistumispäivää
    // Aseta projektille tiedostoja S3:een
    await Promise.all(
      TEST_PROJEKTI_FILES.map(async ({ tiedosto }) => {
        let path;
        if (tiedosto.includes("Maanomistajaluettelo")) {
          path = `yllapito/sisaiset/projekti/${oid}${tiedosto}`;
        } else {
          path = `yllapito/tiedostot/projekti/${oid}${tiedosto}`;
        }
        await insertYllapitoFileToS3(path);
      })
    );
    // Aseta muokattavalle hyväksymisesitykselle tiedostoja S3:een
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES2.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/${path}`;
        await insertYllapitoFileToS3(fullpath);
      })
    );
    // Aseta julkaistulle hyväksymisesitykselle tiedostoja S3:een
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/hyvaksymisesitys/${path}`;
        await insertYllapitoFileToS3(fullpath);
      })
    );
    // Aseta projekti DB:hen ja hae hash
    await insertProjektiToDB(projektiInDB);
    userFixture.loginAsAdmin();
    const { hyvaksymisEsitys } = await haeHyvaksymisEsityksenTiedot(oid);
    userFixture.logout(); // Halutaan testata tiedostojen listaaminen kirjautumattomana käyttäjänä!
    expect(hyvaksymisEsitys).to.exist;
    assertIsDefined(hyvaksymisEsitys, "On juuri testattu, että hyväksymisesitys on olemassa");
    const { hash: hyvaksymisEsityksenHash } = hyvaksymisEsitys;
    hash = hyvaksymisEsityksenHash;
  });

  afterEach(async () => {
    // Poista projektin tiedostot joka testin päätteeksi
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}`);
    // Poista projekti joka testin päätteeksi
    await removeProjektiFromDB(oid);
    userFixture.logout();
    MockDate.reset();
  });

  after(() => {
    sinon.reset();
    sinon.restore();
  });

  it("antaa oikeat tiedostot", async () => {
    const ladattavatTiedostot = await listaaHyvaksymisEsityksenTiedostot({ oid, listaaHyvaksymisEsityksenTiedostotInput: { hash } });
    const ladattavatTiedostotList = Object.values(ladattavatTiedostot).reduce((acc, value) => {
      if (Array.isArray(value)) {
        acc.push(...value);
      }
      return acc;
    }, [] as (API.LadattavaTiedosto | API.KunnallinenLadattavaTiedosto)[]);
    const nimet = ladattavatTiedostotList.map(({ nimi }) => nimi);
    const expectedFileNames = [
      ...TEST_PROJEKTI_FILES.filter(({ nimi }) => !nimi.match(/se\.pdf$/)).map((file) => file.nimi), // ei saametiedostoja
      ...TEST_HYVAKSYMISESITYS_FILES.filter(({ nimi }) => !nimi.match(/se\.pdf$/)).map((file) => file.nimi), // ei saametiedostoja
    ]
      .filter((nimi) => !nimi.includes("lähetekirje"))
      .filter((nimi) => !nimi.includes("vuorovaikutusaineisto"))
      .filter((nimi) => !nimi.includes("nähtävilläoloaineisto"))
      .filter((nimi) => !nimi.includes("Ilmoitus aloituskuulutuksesta"))
      .filter((nimi) => !nimi.includes("Ilmoitus suunnitelman"));
    expect(nimet.sort()).to.eql(expectedFileNames.sort());
  });

  it("antaa tiedostoille toimivat latauslinkit", async () => {
    const ladattavatTiedostot = await listaaHyvaksymisEsityksenTiedostot({ oid, listaaHyvaksymisEsityksenTiedostotInput: { hash } });
    const ladattavatTiedostotList = Object.values(ladattavatTiedostot).reduce((acc, value) => {
      if (Array.isArray(value)) {
        acc.push(...value);
      }
      return acc;
    }, [] as (API.LadattavaTiedosto | API.KunnallinenLadattavaTiedosto)[]);
    const linkit = ladattavatTiedostotList.map(({ linkki }) => linkki);
    expect(linkit.length).to.eql(linkit.filter((linkki) => !!linkki).length);
    const files = Promise.all(linkit.map((linkki) => axios.get(linkki as string)));
    await expect(files).to.eventually.be.fulfilled;
  });

  it("palauttaa viimeisimmät tiedostot", async () => {
    // Simuloidaan tilanne, jossa on tehty uusi julkaisu, jossa on uusia tiedostoja
    const muuAineistoKoneelta = [
      {
        nimi: `muuAineistoKoneelta äöå 3.png`,
        uuid: `muuAineistoKoneelta-esitys-uuid3`,
        lisatty: "2022-01-02T02:00:00+02:00",
      },
    ];
    const muuAineistoVelhosta = [
      {
        dokumenttiOid: `muuAineistoVelhostaDokumenttiOid3`,
        nimi: `muuAineistoVelhosta äöå 3.png`,
        uuid: `muuAineistoVelhosta-uuid3`,
        lisatty: "2022-01-02T02:00:00+02:00",
      },
    ];
    const fullpath1 = `yllapito/tiedostot/projekti/${oid}/hyvaksymisesitys/muuAineistoKoneelta/${adaptFileName(
      "muuAineistoKoneelta äöå 3.png"
    )}`;
    const fullpath2 = `yllapito/tiedostot/projekti/${oid}/hyvaksymisesitys/muuAineistoVelhosta/${adaptFileName(
      "muuAineistoVelhosta äöå 3.png"
    )}`;
    await insertYllapitoFileToS3(fullpath1);
    await insertYllapitoFileToS3(fullpath2);
    const projektiInDB = {
      ...TEST_PROJEKTI,
      muokattavaHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS2,
        muuAineistoKoneelta,
        muuAineistoVelhosta,
        tila: API.HyvaksymisTila.HYVAKSYTTY,
      },
      julkaistuHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        muuAineistoKoneelta,
        muuAineistoVelhosta,
        hyvaksyja: "theadminuid",
        hyvaksymisPaiva: "2022-01-01",
      },
      aineistoHandledAt: "2022-01-02T02:00:01+02:00", // sekunti tiedostojen lisäämishetken jälkeen
    };
    await insertProjektiToDB(projektiInDB);
    // Testataan, saadaanko uudet tiedostot
    const ladattavatTiedostot = await listaaHyvaksymisEsityksenTiedostot({ oid, listaaHyvaksymisEsityksenTiedostotInput: { hash } });
    const ladattavatTiedostotList = Object.values(ladattavatTiedostot).reduce((acc, value) => {
      if (Array.isArray(value)) {
        acc.push(...value);
      }
      return acc;
    }, [] as (API.LadattavaTiedosto | API.KunnallinenLadattavaTiedosto)[]);
    const uusiAineistoVelhosta = ladattavatTiedostotList.find(
      (tiedosto: API.LadattavaTiedosto | API.KunnallinenLadattavaTiedosto) => tiedosto.nimi == "muuAineistoVelhosta äöå 3.png"
    );
    const uusiAineistoKoneelta = ladattavatTiedostotList.find(
      (tiedosto: API.LadattavaTiedosto | API.KunnallinenLadattavaTiedosto) => tiedosto.nimi == "muuAineistoKoneelta äöå 3.png"
    );
    expect(!!uusiAineistoVelhosta).to.be.true;
    expect(!!uusiAineistoKoneelta).to.be.true;
    expect(
      !!ladattavatTiedostotList.find(
        (tiedosto: API.LadattavaTiedosto | API.KunnallinenLadattavaTiedosto) => tiedosto.nimi == "muuAineistoVelhosta äöå .png"
      )
    ).to.be.false;
    expect(
      !!ladattavatTiedostotList.find(
        (tiedosto: API.LadattavaTiedosto | API.KunnallinenLadattavaTiedosto) => tiedosto.nimi == "muuAineistoKoneelta äöå .png"
      )
    ).to.be.false;
    const lataus1 = axios.get(uusiAineistoVelhosta?.linkki as string);
    const lataus2 = axios.get(uusiAineistoKoneelta?.linkki as string);
    await expect(lataus1).to.eventually.be.fulfilled;
    await expect(lataus2).to.eventually.be.fulfilled;
  });

  it("ei toimi väärällä hashillä", async () => {
    const kutsu = listaaHyvaksymisEsityksenTiedostot({
      oid,
      listaaHyvaksymisEsityksenTiedostotInput: { hash: hash.substring(1, hash.length) },
    });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalAccessError);
  });

  it("ei toimi ilman hashiä", async () => {
    const kutsu = listaaHyvaksymisEsityksenTiedostot({
      oid,
      listaaHyvaksymisEsityksenTiedostotInput: {} as any as { hash: string },
    });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalAccessError);
  });

  it("palauttaa projektipäällikön yhteystiedot ja ei tiedostoja, jos poistumispäivä on mennyt", async () => {
    MockDate.set("2033-01-02"); // Päivä jälkeen poistumispäivän
    const response = await listaaHyvaksymisEsityksenTiedostot({
      oid,
      listaaHyvaksymisEsityksenTiedostotInput: { hash },
    });
    expect(response).to.eql({
      __typename: "HyvaksymisEsityksenAineistot",
      poistumisPaiva: "2033-01-01",
      linkkiVanhentunut: true,
      perustiedot: {
        __typename: "ProjektinPerustiedot",
        asiatunnus: "asiatunnusVayla",
        kunnat: [91, 92],
        suunnitelmanNimi: "Projektin nimi",
        vastuuorganisaatio: "VAYLAVIRASTO",
        yTunnus: "1010547-1",
        projektiTyyppi: API.ProjektiTyyppi.TIE,
      },
      projektipaallikonYhteystiedot: {
        __typename: "ProjektiKayttajaJulkinen",
        etunimi: "Pekka",
        sukunimi: "Projari",
        email: "email@email.com",
        puhelinnumero: "01234567",
        organisaatio: "Väylävirasto",
        projektiPaallikko: true,
        elyOrganisaatio: "LAPIN_ELY",
      },
    });
  });

  it("palauttaa projektipäällikön yhteystiedot ja ei tiedostoja, jos hyväksymisesitystä ei vielä ole", async () => {
    // Aseta projekti DB:hen ja hae hash
    await insertProjektiToDB({
      ...projektiInDB,
      muokattavaHyvaksymisEsitys: { ...projektiInDB.muokattavaHyvaksymisEsitys, tila: API.HyvaksymisTila.MUOKKAUS },
      julkaistuHyvaksymisEsitys: undefined,
    });
    const response = await listaaHyvaksymisEsityksenTiedostot({
      oid,
      listaaHyvaksymisEsityksenTiedostotInput: { hash },
    });
    expect(response).to.eql({
      __typename: "HyvaksymisEsityksenAineistot",
      eiOlemassa: true,
      perustiedot: {
        __typename: "ProjektinPerustiedot",
        asiatunnus: "asiatunnusVayla",
        kunnat: [91, 92],
        suunnitelmanNimi: "Projektin nimi",
        vastuuorganisaatio: "VAYLAVIRASTO",
        yTunnus: "1010547-1",
        projektiTyyppi: API.ProjektiTyyppi.TIE,
      },
      projektipaallikonYhteystiedot: {
        __typename: "ProjektiKayttajaJulkinen",
        etunimi: "Pekka",
        sukunimi: "Projari",
        email: "email@email.com",
        puhelinnumero: "01234567",
        organisaatio: "Väylävirasto",
        projektiPaallikko: true,
        elyOrganisaatio: "LAPIN_ELY",
      },
    });
  });

  it("ei onnistu jos hyväksymisesityksen versionumeroa nostetaan", async () => {
    // Vuotaneen linkin voi mitätöidä tällä tekniikalla
    const newProjektiInDB = {
      ...projektiInDB,
      julkaistuHyvaksymisEsitys: {
        ...projektiInDB.julkaistuHyvaksymisEsitys,
        versio: projektiInDB.julkaistuHyvaksymisEsitys.versio + 1,
      },
    };
    await insertProjektiToDB(newProjektiInDB);
    const kutsu = listaaHyvaksymisEsityksenTiedostot({
      oid,
      listaaHyvaksymisEsityksenTiedostotInput: { hash },
    });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalAccessError);
  });

  it("onnistuu vaikka projektilla ei olisi suunnitteluvaihetta", async () => {
    const newProjektiInDB = {
      ...omit(projektiInDB, "vuorovaikutusKierrosJulkaisut"),
    };
    await insertProjektiToDB(newProjektiInDB);
    const kutsu = listaaHyvaksymisEsityksenTiedostot({
      oid,
      listaaHyvaksymisEsityksenTiedostotInput: { hash },
    });
    await expect(kutsu).to.eventually.be.fulfilled;
  });

  it("onnistuu päivämäärän menon jälkeen, jos päivämäärää jatketaan", async () => {
    MockDate.set("2033-01-02"); // Päivä jälkeen poistumispäivän
    const newProjektiInDB = {
      ...projektiInDB,
      julkaistuHyvaksymisEsitys: {
        ...projektiInDB.julkaistuHyvaksymisEsitys,
        poistumisPaiva: "2033-02-02",
      },
    };
    await insertProjektiToDB(newProjektiInDB);
    const ladattavatTiedostot = await listaaHyvaksymisEsityksenTiedostot({
      oid,
      listaaHyvaksymisEsityksenTiedostotInput: { hash },
    });
    expect(ladattavatTiedostot.linkkiVanhentunut).to.not.be.true;
  });
});
