// Contains code generated or recommended by Amazon Q
import { allowedFileTypesKansalaisille, maxFileSize } from "common/fileValidationSettings";
import * as Yup from "yup";
import { phoneNumberRegex } from "hassu-common/schema/puhelinNumero";

export const mielipideSchema = Yup.object().shape({
  mielipide: Yup.string().required("mielipide_on_pakollinen").max(2000),
  etunimi: Yup.string().notRequired().max(100, "etunimi_max_100").nullable(),
  sukunimi: Yup.string().notRequired().max(100, "sukunimi_max_100").nullable(),
  lahiosoite: Yup.string().notRequired().max(100, "lahiosoite_max_100").nullable(),
  postinumero: Yup.string().notRequired().max(30, "postinumero_max_30").nullable(),
  postitoimipaikka: Yup.string().notRequired().max(30, "postitoimipaikka_max_30").nullable(),
  sahkoposti: Yup.string().notRequired().email("sahkoposti_ei_kelpaa").nullable(),
  puhelinnumero: Yup.string().notRequired().matches(new RegExp(phoneNumberRegex), "puh_vain_numerot").max(20, "puh_max_20").nullable(),
  liitteet: Yup.array().of(
    Yup.object().shape({
      koko: Yup.number().required("tiedosto_on_liian_suuri").max(maxFileSize, "tiedosto_on_liian_suuri"),
      tyyppi: Yup.string().required("tiedostotyyppi_ei_tuettu").oneOf(allowedFileTypesKansalaisille, "tiedostotyyppi_ei_tuettu"),
    })
  ),
});
