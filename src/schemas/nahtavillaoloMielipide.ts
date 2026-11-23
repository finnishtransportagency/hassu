// Contains code generated or recommended by Amazon Q
import { allowedFileTypesKansalaisille, maxEmailAttachmentsTotalSize } from "common/fileValidationSettings";
import * as Yup from "yup";
import { phoneNumberRegex } from "hassu-common/schema/puhelinNumero";

export const mielipideSchema = Yup.object().shape({
  mielipide: Yup.string().required("mielipide_on_pakollinen").max(2000),
  etunimi: Yup.string().notRequired().max(100, "etunimi_max_100").nullable(),
  sukunimi: Yup.string().notRequired().max(100, "sukunimi_max_100").nullable(),
  lahiosoite: Yup.string().notRequired().max(100, "lahiosoite_max_100").nullable(),
  postinumero: Yup.string().notRequired().max(30, "postinumero_max_30").nullable(),
  postitoimipaikka: Yup.string().notRequired().max(30, "postitoimipaikka_max_30").nullable(),
  maa: Yup.string().notRequired().nullable(),
  sahkoposti: Yup.string().notRequired().email("sahkoposti_ei_kelpaa").nullable(),
  puhelinnumero: Yup.string().notRequired().matches(new RegExp(phoneNumberRegex), "puh_vain_numerot").max(20, "puh_max_20").nullable(),
  liitteet: Yup.array()
    .of(
      Yup.object().shape({
        tyyppi: Yup.string().required("tiedostotyyppi_ei_tuettu").oneOf(allowedFileTypesKansalaisille, "tiedostotyyppi_ei_tuettu"),
      })
    )
    .test("liitteet_yhteiskoko", "liitteet_yhteiskoko_liian_suuri", (liitteet) => {
      const total = liitteet?.reduce((sum, l) => sum + (l?.koko ?? 0), 0) ?? 0;
      return total <= maxEmailAttachmentsTotalSize;
    }),
});
