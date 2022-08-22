import * as Yup from "yup";
import { phoneNumberRegex } from "./puhelinNumero";

export const muistutusSchema = Yup.object().shape({
    etunimi: Yup.string().notRequired().max(100, "etunimi_max_100").nullable(),
    sukunimi: Yup.string().notRequired().max(100, "sukunimi_max_100").nullable(),
    katuosoite: Yup.string().notRequired().max(100, "katuosoite_max_100").nullable(),
    postinumeroJaPostitoimipaikka: Yup.string().notRequired().max(30, "postinumero_ja_paikka_max_30"),
    sahkoposti: Yup.string()
      .notRequired()
      .email("sahkoposti_ei_kelpaa")
      .nullable(),
    puhelinnumero: Yup.string()
      .notRequired()
      .matches(new RegExp(phoneNumberRegex), "puh_vain_numerot")
      .max(20, "puh_max_20")
      .nullable(),
    muistutus: Yup.string().required("muistutus_on_jatettava").max(2000),
    liite: Yup.string()
      .notRequired()
      .nullable()
      .test({
        message: "vain_kuva_tai_pdf",
        test: (file, context) => {
          const isValid = !file || /.*\.[(jpg)|(jpeg)|(png)|(pdf)]/.test(file);
          if (!isValid) context?.createError();
          return isValid;
        },
      }),
  });