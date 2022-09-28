import { IlmoitettavaViranomainen } from "@services/api";
import * as Yup from "yup";
import filter from "lodash/filter";
import { standardiYhteystiedot } from "./common";
import { paivamaara } from "./paivamaaraSchema";

const maxAloituskuulutusLength = 2000;

let hankkeenKuvaus = Yup.string()
  .max(maxAloituskuulutusLength, `Aloituskuulutukseen voidaan kirjoittaa maksimissaan ${maxAloituskuulutusLength} merkkiä`)
  .required("Hankkeen kuvaus ei voi olla tyhjä")
  .nullable();

export const aloituskuulutusSchema = Yup.object().shape({
  oid: Yup.string().required(),
  aloitusKuulutus: Yup.object().shape({
    kuulutusYhteystiedot: standardiYhteystiedot(),
    hankkeenKuvaus: Yup.object().shape({ SUOMI: hankkeenKuvaus }),
    kuulutusPaiva: paivamaara().required("Kuulutuspäivä ei voi olla tyhjä"),
    siirtyySuunnitteluVaiheeseen: paivamaara(),
    ilmoituksenVastaanottajat: Yup.object()
      .shape({
        kunnat: Yup.array()
          .of(
            Yup.object()
              .shape({
                nimi: Yup.string().required(),
                sahkoposti: Yup.string().email("Virheellinen sähköpostiosoite").required("Sähköpostiosoite on pakollinen"),
              })
              .required()
          )
          .notRequired(),
        viranomaiset: Yup.array()
          .of(
            Yup.object()
              .shape({
                nimi: Yup.mixed().oneOf(Object.values(IlmoitettavaViranomainen), "Viranomaistieto on pakollinen"),
                sahkoposti: Yup.string().email("Virheellinen sähköpostiosoite").required("Sähköpostiosoite on pakollinen"),
              })
              .test("unique", "Vastaanottaja on jo lisätty", (value, testContext) => {
                const duplikaatit = filter(testContext.parent, value);
                if (duplikaatit.length == 1) {
                  return true;
                }
                return testContext.createError({
                  path: `${testContext.path}.nimi`,
                  message: "Viranomainen on jo valittu",
                });
              })
              .required()
          )
          .test("length", "Vähintään yksi viranomainen valittava", (arr, testContext) => {
            if (arr && arr.length >= 1) {
              return true;
            }
            return testContext.createError({
              path: `${testContext.path}`,
              message: "Vähintään yksi viranomainen on valittava",
            });
          }),
      })
      .required(),
  }),
});
