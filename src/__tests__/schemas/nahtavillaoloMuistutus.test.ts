// Contains code generated or recommended by Amazon Q
import { muistutusSchema } from "../../schemas/nahtavillaoloMuistutus";
import { maxEmailAttachmentsTotalSize } from "common/fileValidationSettings";

const validLiite = { nimi: "testi.pdf", tiedosto: new File([], "testi.pdf"), tyyppi: "application/pdf", koko: 1000 };

const validBase = {
  etunimi: "Matti",
  sukunimi: "Meikäläinen",
  katuosoite: "Testikatu 1",
  postinumero: "00100",
  postitoimipaikka: "Helsinki",
  maa: "FI",
  muistutus: "Tämä on muistutukseni.",
};

describe("muistutusSchema", () => {
  it("hyväksyy validin muistutuksen", async () => {
    await expect(muistutusSchema.validate(validBase)).resolves.toBeDefined();
  });

  it("hylkää kun muistutus puuttuu", async () => {
    const { muistutus: _, ...rest } = validBase;
    await expect(muistutusSchema.validate(rest)).rejects.toThrow("muistutus_on_pakollinen");
  });

  it("hyväksyy liitteet kun yhteiskoko on alle rajan", async () => {
    await expect(
      muistutusSchema.validate({ ...validBase, liitteet: [validLiite, { ...validLiite, koko: maxEmailAttachmentsTotalSize - 1000 }] })
    ).resolves.toBeDefined();
  });

  it("hylkää liitteet kun yhteiskoko ylittää rajan", async () => {
    const liitteet = [
      { ...validLiite, koko: maxEmailAttachmentsTotalSize / 2 + 1 },
      { ...validLiite, koko: maxEmailAttachmentsTotalSize / 2 + 1 },
    ];
    await expect(
      muistutusSchema.validate({ ...validBase, liitteet }, { abortEarly: true })
    ).rejects.toThrow("liitteet_yhteiskoko_liian_suuri");
  });

  it("hyväksyy kun liitteet on tyhjä lista", async () => {
    await expect(muistutusSchema.validate({ ...validBase, liitteet: [] })).resolves.toBeDefined();
  });
});
