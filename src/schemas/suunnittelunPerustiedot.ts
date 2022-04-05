import { IlmoitettavaViranomainen, Projekti } from "@services/api";
import * as Yup from "yup";
import { kayttoOikeudetSchema } from "./kayttoOikeudet";

export const maxAloituskuulutusLength = 2000;

let hankkeenKuvaus = Yup.string()
  .max(
    maxAloituskuulutusLength,
    `Aloituskuulutukseen voidaan kirjoittaa maksimissaan ${maxAloituskuulutusLength} merkkiä`
  )
  .required("Hankkeen kuvaus ei voi olla tyhjä")
  .nullable();

export const suunnittelunPerustiedotSchema = Yup.object().shape({
  oid: Yup.string().required(),
  kayttoOikeudet: kayttoOikeudetSchema,
  suunnitteluVaihe: Yup.object().shape({
    hankkeenKuvaus: Yup.object().shape({ SUOMI: hankkeenKuvaus }),
    arvioSeuraavanVaiheenAlkamisesta: Yup.string()
      .required("Kuulutuspäivä ei voi olla tyhjä")
      .nullable(),
  }),
});
