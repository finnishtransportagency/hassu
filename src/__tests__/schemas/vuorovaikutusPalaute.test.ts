// Contains code generated or recommended by Amazon Q
import { palauteSchema } from "../../schemas/vuorovaikutus";

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
});
