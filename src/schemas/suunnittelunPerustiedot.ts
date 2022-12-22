import * as Yup from "yup";

export const maxHankkeenkuvausLength = 2000;

let hankkeenKuvaus = Yup.string()
  .max(
    maxHankkeenkuvausLength,
    `Aloituskuulutukseen voidaan kirjoittaa maksimissaan ${maxHankkeenkuvausLength} merkkiä`
  )
  .required("Hankkeen kuvaus ei voi olla tyhjä")
  .nullable();

export const suunnittelunPerustiedotSchema = Yup.object().shape({
  oid: Yup.string().required(),
  suunnitteluVaihe: Yup.object().shape({
    hankkeenKuvaus: Yup.object().shape({ SUOMI: hankkeenKuvaus }),
    arvioSeuraavanVaiheenAlkamisesta: Yup.string().required("Arvio ei voi olla tyhjä").nullable(),
    suunnittelunEteneminenJaKesto: Yup.string().nullable(),
  }),
});
