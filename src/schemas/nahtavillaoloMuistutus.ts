import * as Yup from "yup";

export const muistutusSchema = Yup.object().shape({
  katuosoite: Yup.string().required("katuosoite_on_pakollinen").max(100, "katuosoite_max_100"),
  postinumero: Yup.string().required("postinumero_on_pakollinen").max(30, "postinumero_max_30"),
  postitoimipaikka: Yup.string().required("postitoimipaikka_on_pakollinen").max(30, "postitoimipaikka_max_30"),
  maa: Yup.string().required("maa_on_pakollinen").nullable(),
  sahkoposti: Yup.string().notRequired().email("sahkoposti_ei_kelpaa").nullable(),
  muistutus: Yup.string().required("muistutus_on_pakollinen").max(2000),
  liite: Yup.string()
    .notRequired()
    .nullable()
    .test({
      message: "vain_kuva_tai_pdf",
      test: (file, context) => {
        const isValid = !file || /.*\.[(jpg)|(jpeg)|(png)|(pdf)]/.test(file.toLowerCase());
        if (!isValid) context?.createError();
        return isValid;
      },
    }),
});
