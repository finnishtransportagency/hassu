// Contains code generated or recommended by Amazon Q
import { expect } from "chai";
import sinon from "sinon";
import axios from "axios";
import { createMmlClient, MmlOptions } from "../../src/mml/mmlClient";

const BASE_OPTIONS: MmlOptions = {
  ogcEndpoint: "https://ogc.example.com",
  endpoint: "https://api.example.com",
  apiKey: "apikey",
  ogcApiKey: "ogcapikey",
  ogcApiExamples: "false",
};

const BBOX = [25.0, 61.0, 25.1, 61.1];

function makeFeatureCollection(features: object[]) {
  return { type: "FeatureCollection", features };
}

function makeKayttooikeusyksikkoSijaintiFeature(tunnus: string) {
  return { type: "Feature", geometry: null, properties: { kayttooikeusyksikkotunnus: tunnus } };
}

function makePerustiedotFeature(tunnus: string, rantakunnat: { id: number; nimi: string; kotikunta?: { nimiSuomeksi: string }[] }[]) {
  return {
    type: "Feature",
    geometry: null,
    properties: { kayttooikeusyksikkotunnus: tunnus, rantakunta: rantakunnat },
  };
}

function makeRantakunnanYhteystiedotFeature(id: number, nimi: string, osoite: object, kotikunta?: string) {
  return {
    type: "Feature",
    id,
    geometry: null,
    properties: {
      yhteyshenkilo: [
        {
          nimi,
          osoite: [osoite],
        },
      ],
      rantakunnanKotikunta: kotikunta ? [{ nimiSuomeksi: kotikunta }] : undefined,
    },
  };
}

describe("mmlClient.haeRantakunnat", () => {
  let axiosGet: sinon.SinonStub;

  beforeEach(() => {
    axiosGet = sinon.stub(axios, "get");
  });

  afterEach(() => {
    sinon.restore();
  });

  it("palauttaa tyhjän listan kun bbox-haku ei löydä rantakuntia", async () => {
    axiosGet.onFirstCall().resolves({ data: makeFeatureCollection([]) });

    const client = createMmlClient(BASE_OPTIONS);
    const result = await client.haeRantakunnat(BBOX, "testuid");
    expect(result).to.deep.equal([]);
  });

  it("palauttaa tyhjän listan kun perustiedoissa ei ole rantakunta-kenttää", async () => {
    axiosGet.onFirstCall().resolves({
      data: makeFeatureCollection([makeKayttooikeusyksikkoSijaintiFeature("Y2000-10001")]),
    });
    axiosGet.onSecondCall().resolves({
      data: makeFeatureCollection([
        { type: "Feature", geometry: null, properties: { kayttooikeusyksikkotunnus: "Y2000-10001", rantakunta: null } },
      ]),
    });

    const client = createMmlClient(BASE_OPTIONS);
    const result = await client.haeRantakunnat(BBOX, "testuid");
    expect(result).to.deep.equal([]);
  });

  it("palauttaa rantakunnat ilman yhteystietoja kun skipYhteystiedot=true", async () => {
    axiosGet.onFirstCall().resolves({
      data: makeFeatureCollection([makeKayttooikeusyksikkoSijaintiFeature("Y2000-10001")]),
    });
    axiosGet.onSecondCall().resolves({
      data: makeFeatureCollection([
        makePerustiedotFeature("Y2000-10001", [{ id: 42, nimi: "Testijärven yhteisalue", kotikunta: [{ nimiSuomeksi: "Testikunta" }] }]),
      ]),
    });

    const client = createMmlClient(BASE_OPTIONS);
    const result = await client.haeRantakunnat(BBOX, "testuid", false, true);

    expect(result).to.have.length(1);
    expect(result[0].kayttooikeusyksikkotunnus).to.equal("Y2000-10001");
    expect(result[0].omistajat[0].id).to.equal(42);
    expect(result[0].omistajat[0].nimi).to.equal("Testijärven yhteisalue");
    expect(result[0].omistajat[0].tiekuntaKunta).to.equal("Testikunta");
    expect(result[0].omistajat[0].yhteystiedot).to.be.undefined;
    // yhteystietoja ei haettu
    expect(axiosGet.callCount).to.equal(2);
  });

  it("hakee yhteystiedot ja palauttaa rantakunnat oikein", async () => {
    axiosGet.onFirstCall().resolves({
      data: makeFeatureCollection([makeKayttooikeusyksikkoSijaintiFeature("Y2000-10001")]),
    });
    axiosGet.onSecondCall().resolves({
      data: makeFeatureCollection([
        makePerustiedotFeature("Y2000-10001", [{ id: 42, nimi: "Testijärven yhteisalue", kotikunta: [{ nimiSuomeksi: "Testikunta" }] }]),
      ]),
    });
    axiosGet.onThirdCall().resolves({
      data: makeFeatureCollection([
        makeRantakunnanYhteystiedotFeature(
          42,
          "Yhteyshenkilö Testi",
          { osoite: "Rantakatu 1", postinumero: "12345", postitoimipaikka: "Testikylä", valtio: "FI" },
          "Testikunta"
        ),
      ]),
    });

    const client = createMmlClient(BASE_OPTIONS);
    const result = await client.haeRantakunnat(BBOX, "testuid");

    expect(result).to.have.length(1);
    const omistaja = result[0].omistajat[0];
    expect(omistaja.nimi).to.equal("Yhteyshenkilö Testi (Testijärven yhteisalue)");
    expect(omistaja.yhteystiedot?.jakeluosoite).to.equal("Rantakatu 1");
    expect(omistaja.yhteystiedot?.postinumero).to.equal("12345");
    expect(omistaja.yhteystiedot?.paikkakunta).to.equal("Testikylä");
    expect(omistaja.yhteystiedot?.maakoodi).to.equal("FI");
    expect(omistaja.tiekuntaKunta).to.equal("Testikunta");
  });

  it("ei ylikirjoita jo haettuja yhteystietoja duplikaatti-idllä", async () => {
    // Sama rantakunta kahdessa eri kayttooikeusyksikossa
    axiosGet.onFirstCall().resolves({
      data: makeFeatureCollection([
        makeKayttooikeusyksikkoSijaintiFeature("Y2000-10001"),
        makeKayttooikeusyksikkoSijaintiFeature("Y2000-10002"),
      ]),
    });
    axiosGet.onSecondCall().resolves({
      data: makeFeatureCollection([
        makePerustiedotFeature("Y2000-10001", [{ id: 42, nimi: "Testijärven yhteisalue" }]),
        makePerustiedotFeature("Y2000-10002", [{ id: 42, nimi: "Testijärven yhteisalue" }]),
      ]),
    });
    axiosGet.onThirdCall().resolves({
      data: makeFeatureCollection([
        makeRantakunnanYhteystiedotFeature(42, "Yhteyshenkilö Testi", {
          osoite: "Rantakatu 1",
          postinumero: "12345",
          postitoimipaikka: "Testikylä",
        }),
      ]),
    });

    const client = createMmlClient(BASE_OPTIONS);
    const result = await client.haeRantakunnat(BBOX, "testuid");

    // Sama rantakunta vain kerran tuloksissa
    expect(result).to.have.length(1);
  });

  it("palauttaa tyhjän listan kun KayttooikeusyksikonOsanSijaintitiedot-kokoelma ei ole saatavilla", async () => {
    axiosGet.onFirstCall().rejects({
      response: { data: { code: "400", description: "Unknown collection" } },
    });

    const client = createMmlClient(BASE_OPTIONS);
    const result = await client.haeRantakunnat(BBOX, "testuid");
    expect(result).to.deep.equal([]);
  });

  it("heittää virheen muussa HTTP-virheessä", async () => {
    axiosGet.onFirstCall().rejects({ response: { status: 500, data: { code: "500", description: "Internal Server Error" } } });

    const client = createMmlClient(BASE_OPTIONS);
    await expect(client.haeRantakunnat(BBOX, "testuid")).to.eventually.be.rejected;
  });

  it("ogcApiExamples=true: käyttää kiinteää example-id:tä yhteystietojen haussa", async () => {
    const optionsWithExamples: MmlOptions = { ...BASE_OPTIONS, ogcApiExamples: "true" };

    axiosGet.onFirstCall().resolves({
      data: makeFeatureCollection([makeKayttooikeusyksikkoSijaintiFeature("Y2000-10001")]),
    });
    axiosGet.onSecondCall().resolves({
      data: makeFeatureCollection([
        makePerustiedotFeature("Y2000-10001", [
          { id: 1, nimi: "Rantakunta A" },
          { id: 2, nimi: "Rantakunta B" },
        ]),
      ]),
    });
    // example-haku kiinteällä id:llä 94615362
    axiosGet.onThirdCall().resolves({
      data: makeRantakunnanYhteystiedotFeature(94615362, "Esimerkki Henkilö", {
        osoite: "Esimerkkikatu 1",
        postinumero: "00001",
        postitoimipaikka: "Helsinki",
        valtio: "FI",
      }),
    });

    const client = createMmlClient(optionsWithExamples);
    const result = await client.haeRantakunnat(BBOX, "testuid");

    const exampleUrl: string = axiosGet.thirdCall.args[0];
    expect(exampleUrl).to.include("/collections/RantakunnanYhteystiedot/items/94615362");

    // Ensimmäinen rantakunta jätetään ilman yhteyshenkilöä (shift())
    expect(result).to.have.length(2);
    expect(result[0].omistajat[0].yhteystiedot).to.be.undefined;
    expect(result[1].omistajat[0].nimi).to.include("Esimerkki Henkilö");
  });

  it("ogcApiExamples=true: ohittaa RantakunnanYhteystiedot-kokoelman puuttumisen", async () => {
    const optionsWithExamples: MmlOptions = { ...BASE_OPTIONS, ogcApiExamples: "true" };

    axiosGet.onFirstCall().resolves({
      data: makeFeatureCollection([makeKayttooikeusyksikkoSijaintiFeature("Y2000-10001")]),
    });
    axiosGet.onSecondCall().resolves({
      data: makeFeatureCollection([makePerustiedotFeature("Y2000-10001", [{ id: 1, nimi: "Rantakunta A" }])]),
    });
    axiosGet.onThirdCall().rejects({
      response: { data: { code: "400", description: "Unknown collection" } },
    });

    const client = createMmlClient(optionsWithExamples);
    const result = await client.haeRantakunnat(BBOX, "testuid");

    expect(result).to.have.length(1);
    expect(result[0].omistajat[0].yhteystiedot).to.be.undefined;
  });
});
