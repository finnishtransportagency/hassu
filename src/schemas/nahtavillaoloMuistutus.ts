import { allowedUploadFileTypes } from "common/allowedUploadFileTypes";
import * as Yup from "yup";

// 25MB
const MAX_LIITE_FILE_SIZE = 25 * 1024 * 1024;

export const muistutusSchema = Yup.object().shape({
  katuosoite: Yup.string().required("katuosoite_on_pakollinen").max(100, "katuosoite_max_100"),
  postinumero: Yup.string().required("postinumero_on_pakollinen").max(30, "postinumero_max_30"),
  postitoimipaikka: Yup.string().required("postitoimipaikka_on_pakollinen").max(30, "postitoimipaikka_max_30"),
  maa: Yup.string().required("maa_on_pakollinen").nullable(),
  sahkoposti: Yup.string().notRequired().email("sahkoposti_ei_kelpaa").nullable(),
  muistutus: Yup.string().required("muistutus_on_pakollinen").max(2000),
  liitteet: Yup.array().of(
    Yup.object().shape({
      koko: Yup.number().required("tiedosto_on_liian_suuri").max(MAX_LIITE_FILE_SIZE, "tiedosto_on_liian_suuri"),
      tyyppi: Yup.string().required("tiedostotyyppi_ei_tuettu").oneOf(allowedUploadFileTypes, "tiedostotyyppi_ei_tuettu"),
    })
  ),
});
