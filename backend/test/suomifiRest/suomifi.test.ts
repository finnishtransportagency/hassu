// Contains code generated or recommended by Amazon Q
import { assert, expect } from "chai";
import * as sinon from "sinon";
import { Readable } from "stream";
import { SuomiFiRestClient } from "../../src/suomifi/suomifiRest/client";
import * as clientModule from "../../src/suomifi/suomifiRest/client";
import { getSuomiFiClient, Options, PdfViesti, Viesti } from "../../src/suomifi/suomifiRest/suomifi";

function createMockRestClient(): sinon.SinonStubbedInstance<SuomiFiRestClient> {
  return {
    postMailboxesActive: sinon.stub(),
    uploadAttachment: sinon.stub(),
    postMessage: sinon.stub(),
    postElectronicMessage: sinon.stub(),
    postPaperMailMessage: sinon.stub(),
  };
}

const defaultOptions: Options = {
  endpoint: "http://localhost",
  apiKey: "test-key",
  viranomaisTunnus: "VLS",
  yhteysHenkilo: "test@test.fi",
  palveluTunnus: "VLS",
  laskutusTunniste: { VAYLAVIRASTO: "tunniste1" },
  laskutusSalasana: { VAYLAVIRASTO: "salasana1" },
};

function createPdfViesti(overrides?: Partial<PdfViesti>): PdfViesti {
  return {
    otsikko: "Otsikko",
    sisalto: "Sisältö",
    nimi: "Testi Teppo",
    lahiosoite: "Osoite 1",
    postinumero: "00100",
    postitoimipaikka: "Helsinki",
    maa: "FI",
    suunnittelustaVastaavaViranomainen: "VAYLAVIRASTO",
    tiedosto: { nimi: "tiedosto.pdf", kuvaus: "Kuvaus", sisalto: Buffer.from("pdf-sisalto") },
    ...overrides,
  };
}

describe("suomifiRest/suomifi", () => {
  let mockClient: sinon.SinonStubbedInstance<SuomiFiRestClient>;

  beforeEach(() => {
    mockClient = createMockRestClient();
    sinon.stub(clientModule, "createRestClient").returns(mockClient);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("haeAsiakas", () => {
    it("palauttaa Tila 300 kun postilaatikko on aktiivinen", async () => {
      mockClient.postMailboxesActive.resolves({ endUsersWithActiveMailbox: [{ id: "123456-789A" }] });
      const client = await getSuomiFiClient(defaultOptions);

      const result = await client.haeAsiakas("123456-789A", "SSN");

      assert(result.HaeAsiakkaitaResult?.TilaKoodi);
      expect(result.HaeAsiakkaitaResult.TilaKoodi.TilaKoodi).to.equal(0);
      const asiakas = result.HaeAsiakkaitaResult.Asiakkaat?.Asiakas?.[0];
      assert(asiakas);
      expect(asiakas.Tila).to.equal(300);
      expect(asiakas.attributes.AsiakasTunnus).to.equal("123456-789A");
      expect(asiakas.attributes.TunnusTyyppi).to.equal("SSN");
    });

    it("palauttaa Tila 310 kun postilaatikko ei ole aktiivinen", async () => {
      mockClient.postMailboxesActive.resolves({ endUsersWithActiveMailbox: [] });
      const client = await getSuomiFiClient(defaultOptions);

      const result = await client.haeAsiakas("123456-789A", "SSN");

      const asiakas = result.HaeAsiakkaitaResult?.Asiakkaat?.Asiakas?.[0];
      assert(asiakas);
      expect(asiakas.Tila).to.equal(310);
    });

    it("toimii CRN-tunnustyypillä", async () => {
      mockClient.postMailboxesActive.resolves({ endUsersWithActiveMailbox: [{ id: "1234567-8" }] });
      const client = await getSuomiFiClient(defaultOptions);

      const result = await client.haeAsiakas("1234567-8", "CRN");

      const asiakas = result.HaeAsiakkaitaResult?.Asiakkaat?.Asiakas?.[0];
      assert(asiakas);
      expect(asiakas.attributes.TunnusTyyppi).to.equal("CRN");
      expect(asiakas.Tila).to.equal(300);
    });
  });

  describe("lahetaInfoViesti", () => {
    it("lähettää sähköisen viestin hetulla", async () => {
      mockClient.postElectronicMessage.resolves({ messageId: 1 });
      const client = await getSuomiFiClient(defaultOptions);
      const viesti: Viesti = { hetu: "123456-789A", otsikko: "Otsikko", sisalto: "Sisältö" };

      const result = await client.lahetaInfoViesti(viesti);

      assert(result.LisaaKohteitaResult?.TilaKoodi);
      expect(result.LisaaKohteitaResult.TilaKoodi.TilaKoodi).to.equal(0);
      const kohdeAsiakas = result.LisaaKohteitaResult.Kohteet?.Kohde?.[0]?.Asiakas?.[0];
      assert(kohdeAsiakas);
      expect(kohdeAsiakas.KohteenTila).to.equal(200);
      expect(kohdeAsiakas.attributes.TunnusTyyppi).to.equal("SSN");

      const sentMessage = mockClient.postElectronicMessage.firstCall.args[0];
      expect(sentMessage.recipient.id).to.equal("123456-789A");
      expect(sentMessage.electronic.title).to.equal("Otsikko");
    });

    it("lähettää sähköisen viestin y-tunnuksella", async () => {
      mockClient.postElectronicMessage.resolves({ messageId: 1 });
      const client = await getSuomiFiClient(defaultOptions);
      const viesti: Viesti = { ytunnus: "1234567-8", otsikko: "Otsikko", sisalto: "Sisältö" };

      const result = await client.lahetaInfoViesti(viesti);

      const kohdeAsiakas = result.LisaaKohteitaResult?.Kohteet?.Kohde?.[0]?.Asiakas?.[0];
      assert(kohdeAsiakas);
      expect(kohdeAsiakas.attributes.TunnusTyyppi).to.equal("CRN");
      expect(mockClient.postElectronicMessage.firstCall.args[0].recipient.id).to.equal("1234567-8");
    });

    it("heittää virheen jos hetu ja y-tunnus puuttuvat", async () => {
      const client = await getSuomiFiClient(defaultOptions);
      const viesti: Viesti = { otsikko: "Otsikko", sisalto: "Sisältö" };

      try {
        await client.lahetaInfoViesti(viesti);
        expect.fail("Pitäisi heittää virhe");
      } catch (e) {
        expect((e as Error).message).to.equal("Hetu tai y-tunnus pakollinen");
      }
    });

    it("palauttaa virhestatuksen kun lähetys epäonnistuu", async () => {
      mockClient.postElectronicMessage.rejects(new Error("API error"));
      const client = await getSuomiFiClient(defaultOptions);
      const viesti: Viesti = { hetu: "123456-789A", otsikko: "Otsikko", sisalto: "Sisältö" };

      const result = await client.lahetaInfoViesti(viesti);

      assert(result.LisaaKohteitaResult?.TilaKoodi);
      expect(result.LisaaKohteitaResult.TilaKoodi.TilaKoodi).to.equal(-1);
      const kohdeAsiakas = result.LisaaKohteitaResult.Kohteet?.Kohde?.[0]?.Asiakas?.[0];
      assert(kohdeAsiakas);
      expect(kohdeAsiakas.KohteenTila).to.equal(500);
    });
  });

  describe("lahetaViesti", () => {
    it("lähettää multichannel-viestin kun tunnus on annettu", async () => {
      mockClient.uploadAttachment.resolves({ attachmentId: "att-123" });
      mockClient.postMessage.resolves({ messageId: 42 });
      const client = await getSuomiFiClient(defaultOptions);

      const result = await client.lahetaViesti(createPdfViesti({ hetu: "123456-789A" }));

      assert(result.LahetaViestiResult?.TilaKoodi);
      expect(result.LahetaViestiResult.TilaKoodi.TilaKoodi).to.equal(202);
      expect(mockClient.postMessage.calledOnce).to.be.true;
      expect(mockClient.postPaperMailMessage.called).to.be.false;

      const sentMessage = mockClient.postMessage.firstCall.args[0];
      expect(sentMessage.recipient.id).to.equal("123456-789A");
      expect(sentMessage.electronic.attachments[0].attachmentId).to.equal("att-123");
      expect(sentMessage.paperMail.attachments[0].attachmentId).to.equal("att-123");
    });

    it("lähettää pelkän paperikirjeen kun tunnus puuttuu", async () => {
      mockClient.uploadAttachment.resolves({ attachmentId: "att-456" });
      mockClient.postPaperMailMessage.resolves({ messageId: 43 });
      const client = await getSuomiFiClient(defaultOptions);

      const result = await client.lahetaViesti(createPdfViesti());

      assert(result.LahetaViestiResult?.TilaKoodi);
      expect(result.LahetaViestiResult.TilaKoodi.TilaKoodi).to.equal(202);
      expect(mockClient.postPaperMailMessage.calledOnce).to.be.true;
      expect(mockClient.postMessage.called).to.be.false;
    });

    it("heittää virheen kun laskutustunniste puuttuu", async () => {
      mockClient.uploadAttachment.resolves({ attachmentId: "att-789" });
      const client = await getSuomiFiClient(defaultOptions);

      try {
        await client.lahetaViesti(createPdfViesti({ suunnittelustaVastaavaViranomainen: "TUNTEMATON" }));
        expect.fail("Pitäisi heittää virhe");
      } catch (e) {
        expect((e as Error).message).to.equal("Laskutustunniste puuttuu");
      }
    });

    it("palauttaa virhestatuksen kun lähetys epäonnistuu", async () => {
      mockClient.uploadAttachment.resolves({ attachmentId: "att-123" });
      mockClient.postMessage.rejects(new Error("Lähetys epäonnistui"));
      const client = await getSuomiFiClient(defaultOptions);

      const result = await client.lahetaViesti(createPdfViesti({ hetu: "123456-789A" }));

      assert(result.LahetaViestiResult?.TilaKoodi);
      expect(result.LahetaViestiResult.TilaKoodi.TilaKoodi).to.equal(-1);
      expect(result.LahetaViestiResult.TilaKoodi.TilaKoodiKuvaus).to.equal("Lähetys epäonnistui");
    });

    it("käsittelee Readable-streamin tiedostosisällön", async () => {
      mockClient.uploadAttachment.resolves({ attachmentId: "att-stream" });
      mockClient.postMessage.resolves({ messageId: 44 });
      const client = await getSuomiFiClient(defaultOptions);
      const stream = Readable.from(Buffer.from("stream-sisalto"));

      await client.lahetaViesti(
        createPdfViesti({ hetu: "123456-789A", tiedosto: { nimi: "test.pdf", kuvaus: "Kuvaus", sisalto: stream } })
      );

      const uploadedBuffer = mockClient.uploadAttachment.firstCall.args[0];
      expect(Buffer.isBuffer(uploadedBuffer)).to.be.true;
      expect(uploadedBuffer.toString()).to.equal("stream-sisalto");
    });

    it("asettaa paperMail-rakenteen oikein", async () => {
      mockClient.uploadAttachment.resolves({ attachmentId: "att-paper" });
      mockClient.postMessage.resolves({ messageId: 45 });
      const client = await getSuomiFiClient(defaultOptions);

      await client.lahetaViesti(createPdfViesti({ hetu: "123456-789A" }));

      const sentMessage = mockClient.postMessage.firstCall.args[0];
      expect(sentMessage.paperMail.recipient.address.name).to.equal("Testi Teppo");
      expect(sentMessage.paperMail.recipient.address.streetAddress).to.equal("Osoite 1");
      expect(sentMessage.paperMail.recipient.address.zipCode).to.equal("00100");
      expect(sentMessage.paperMail.sender.address.name).to.equal("Väylävirasto");
      expect(sentMessage.paperMail.printingAndEnvelopingService.postiMessaging.username).to.equal("tunniste1");
      expect(sentMessage.paperMail.printingAndEnvelopingService.postiMessaging.password).to.equal("salasana1");
      expect(sentMessage.paperMail.colorPrinting).to.be.true;
    });
  });

  describe("rajapinnanTila", () => {
    it("palauttaa onnistuneen vastauksen", async () => {
      const client = await getSuomiFiClient(defaultOptions);

      const result = await client.rajapinnanTila();

      assert(result.HaeTilaTietoResult?.TilaKoodi);
      expect(result.HaeTilaTietoResult.TilaKoodi.TilaKoodi).to.equal(0);
    });
  });
});
