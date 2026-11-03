// Contains code generated or recommended by Amazon Q
import { palauteSchema } from "../../schemas/vuorovaikutus";
import { maxEmailAttachmentsTotalSize } from "common/fileValidationSettings";

const validLiite = { nimi: "testi.pdf", tiedosto: new File([], "testi.pdf"), tyyppi: "application/pdf", koko: 1000 };

describe("palauteSchema", () => {
  it("hyväksyy kun vain kysymysTaiPalaute annettu", async () => {
    await expect(palauteSchema.validate({ kysymysTaiPalaute: "Tämä on palautteeni." })).resolves.toBeDefined();
  });

  it("hylkää kun kysymysTaiPalaute puuttuu", async () => {
    await expect(palauteSchema.validate({})).rejects.toThrow("palaute_on_pakollinen");
  });

  it("hylkää kun kysymysTaiPalaute on tyhjä merkkijono", async () => {
    await expect(palauteSchema.validate({ kysymysTaiPalaute: "" })).rejects.toThrow("palaute_on_pakollinen");
  });

  it("hylkää liian pitkän palautteen", async () => {
    await expect(palauteSchema.validate({ kysymysTaiPalaute: "a".repeat(2001) })).rejects.toThrow();
  });

  it("hyväksyy validin sähköpostin ilman yhteydenottotapa-flagia", async () => {
    await expect(
      palauteSchema.validate({ kysymysTaiPalaute: "Palaute", sahkoposti: "testi@example.com" })
    ).resolves.toBeDefined();
  });

  it("hylkää virheellisen sähköpostin", async () => {
    await expect(
      palauteSchema.validate({ kysymysTaiPalaute: "Palaute", sahkoposti: "ei-validi" }, { abortEarly: true })
    ).rejects.toThrow("sahkoposti_ei_kelpaa");
  });

  it("hyväksyy puhelinnumeron ilman yhteydenottotapa-flagia", async () => {
    await expect(
      palauteSchema.validate({ kysymysTaiPalaute: "Palaute", puhelinnumero: "0401234567" })
    ).resolves.toBeDefined();
  });

  it("hyväksyy kaikki valinnaiset kentät täytettynä", async () => {
    await expect(
      palauteSchema.validate({
        kysymysTaiPalaute: "Palaute",
        etunimi: "Matti",
        sukunimi: "Meikäläinen",
        sahkoposti: "matti@example.com",
        puhelinnumero: "0401234567",
      })
    ).resolves.toBeDefined();
  });

  it("hyväksyy liitteet kun yhteiskoko on alle rajan", async () => {
    await expect(
      palauteSchema.validate({ kysymysTaiPalaute: "Palaute", liitteet: [validLiite, { ...validLiite, koko: maxEmailAttachmentsTotalSize - 1000 }] })
    ).resolves.toBeDefined();
  });

  it("hylkää liitteet kun yhteiskoko ylittää rajan", async () => {
    const liitteet = [
      { ...validLiite, koko: maxEmailAttachmentsTotalSize / 2 + 1 },
      { ...validLiite, koko: maxEmailAttachmentsTotalSize / 2 + 1 },
    ];
    await expect(
      palauteSchema.validate({ kysymysTaiPalaute: "Palaute", liitteet }, { abortEarly: true })
    ).rejects.toThrow("liitteet_yhteiskoko_liian_suuri");
  });

  it("hylkää yli viisi liitettä", async () => {
    const liitteet = Array(6).fill(validLiite);
    await expect(
      palauteSchema.validate({ kysymysTaiPalaute: "Palaute", liitteet }, { abortEarly: true })
    ).rejects.toThrow("tiedostoja_liikaa");
  });
});
