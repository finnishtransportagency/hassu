// Contains code generated or recommended by Amazon Q
import { mielipideSchema } from "../../schemas/nahtavillaoloMielipide";
import { maxEmailAttachmentsTotalSize } from "common/fileValidationSettings";

const validLiite = { nimi: "testi.pdf", tiedosto: new File([], "testi.pdf"), tyyppi: "application/pdf", koko: 1000 };

describe("mielipideSchema", () => {
  it("hyväksyy kun vain mielipide annettu", async () => {
    await expect(mielipideSchema.validate({ mielipide: "Tämä on mielipiteeni." })).resolves.toBeDefined();
  });

  it("hylkää kun mielipide puuttuu", async () => {
    await expect(mielipideSchema.validate({})).rejects.toThrow("mielipide_on_pakollinen");
  });

  it("hylkää kun mielipide on tyhjä merkkijono", async () => {
    await expect(mielipideSchema.validate({ mielipide: "" })).rejects.toThrow("mielipide_on_pakollinen");
  });

  it("hylkää virheellisen sähköpostin", async () => {
    await expect(
      mielipideSchema.validate({ mielipide: "Mielipide", sahkoposti: "ei-validi" }, { abortEarly: true })
    ).rejects.toThrow("sahkoposti_ei_kelpaa");
  });

  it("hyväksyy validin sähköpostin", async () => {
    await expect(
      mielipideSchema.validate({ mielipide: "Mielipide", sahkoposti: "testi@example.com" })
    ).resolves.toBeDefined();
  });

  it("hylkää liian pitkän mielipiteen", async () => {
    await expect(
      mielipideSchema.validate({ mielipide: "a".repeat(2001) })
    ).rejects.toThrow();
  });

  it("hyväksyy kaikki valinnaiset kentät täytettynä", async () => {
    await expect(
      mielipideSchema.validate({
        mielipide: "Mielipide",
        etunimi: "Matti",
        sukunimi: "Meikäläinen",
        lahiosoite: "Testikatu 1",
        postinumero: "00100",
        postitoimipaikka: "Helsinki",
        sahkoposti: "matti@example.com",
        puhelinnumero: "0401234567",
      })
    ).resolves.toBeDefined();
  });

  it("hyväksyy liitteet kun yhteiskoko on alle rajan", async () => {
    await expect(
      mielipideSchema.validate({ mielipide: "Mielipide", liitteet: [validLiite, { ...validLiite, koko: maxEmailAttachmentsTotalSize - 1000 }] })
    ).resolves.toBeDefined();
  });

  it("hylkää liitteet kun yhteiskoko ylittää rajan", async () => {
    const liitteet = [
      { ...validLiite, koko: maxEmailAttachmentsTotalSize / 2 + 1 },
      { ...validLiite, koko: maxEmailAttachmentsTotalSize / 2 + 1 },
    ];
    await expect(
      mielipideSchema.validate({ mielipide: "Mielipide", liitteet }, { abortEarly: true })
    ).rejects.toThrow("liitteet_yhteiskoko_liian_suuri");
  });

  it("hyväksyy kun liitteet on tyhjä lista", async () => {
    await expect(mielipideSchema.validate({ mielipide: "Mielipide", liitteet: [] })).resolves.toBeDefined();
  });
});
