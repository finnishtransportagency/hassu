import { allowedFileTypesKansalaisille, maxFileSize } from "common/fileValidationSettings";
import * as Yup from "yup";
import { phoneNumberRegex } from "hassu-common/schema/puhelinNumero";

export const muistutusSchema = Yup.object().shape({
  etunimi: Yup.string().required("etunimi_on_pakollinen").max(100, "etunimi_max_100"),
  sukunimi: Yup.string().required("sukunimi_on_pakollinen").max(100, "sukunimi_max_100"),
  katuosoite: Yup.string().required("katuosoite_on_pakollinen").max(100, "katuosoite_max_100"),
  postinumero: Yup.string().required("postinumero_on_pakollinen").max(30, "postinumero_max_30"),
  postitoimipaikka: Yup.string().required("postitoimipaikka_on_pakollinen").max(30, "postitoimipaikka_max_30"),
  maa: Yup.string().required("maa_on_pakollinen").nullable(),
  sahkoposti: Yup.string().notRequired().email("sahkoposti_ei_kelpaa").nullable(),
  muistutus: Yup.string().required("muistutus_on_pakollinen").max(2000),
  liitteet: Yup.array().of(
    Yup.object().shape({
      koko: Yup.number().required("tiedosto_on_liian_suuri").max(maxFileSize, "tiedosto_on_liian_suuri"),
      tyyppi: Yup.string().required("tiedostotyyppi_ei_tuettu").oneOf(allowedFileTypesKansalaisille, "tiedostotyyppi_ei_tuettu"),
    })
  ),
  puhelinnumero: Yup.string().notRequired().matches(new RegExp(phoneNumberRegex), "puh_vain_numerot").max(20, "puh_max_20").nullable(),
});
