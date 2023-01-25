import { Kieli, Kielitiedot } from "@services/api";
import * as Yup from "yup";
import { ObjectShape } from "yup/lib/object";
import { lokalisoituTekstiEiPakollinen } from "./lokalisoituTeksti";
import { paivamaara } from "./paivamaaraSchema";

const getAineistoSchema = () =>
  Yup.object().shape({
    dokumenttiOid: Yup.string().required(),
    nimi: Yup.string().required(),
    jarjestys: Yup.number().integer().notRequired(),
  });
const getAineistotSchema = () => Yup.array().of(getAineistoSchema()).nullable();

const maxLenght = 2000;

const getLinkkiSchema = (schema: Yup.ObjectSchema<ObjectShape>) =>
  schema.shape({
    nimi: Yup.string(),
    url: Yup.string().url("URL ei kelpaa").notRequired(),
  });

interface LokalisoituObjektiSchemaProps {
  kieli: Kieli;
  additionalObjectValidations?: (schema: Yup.ObjectSchema<ObjectShape>) => Yup.ObjectSchema<ObjectShape>;
  avain: string;
}

function lokalisoituEiPakollinenObjektiSchema({
  kieli,
  additionalObjectValidations: schemaWithValidations = (schema) => schema,
  avain,
}: LokalisoituObjektiSchemaProps) {
  return schemaWithValidations(
    Yup.object().when("$projekti.kielitiedot", {
      is: (kielitiedot: Kielitiedot | null | undefined) => [kielitiedot?.ensisijainenKieli, kielitiedot?.toissijainenKieli].includes(kieli),
      then: Yup.object().test({
        message: "Tieto on pakollinen, jos tieto on annettu muilla kielillä",
        test: (sisalto, context) => {
          const parentCopy = { ...context.parent };
          delete parentCopy[kieli];
          delete parentCopy.__typename;
          const parentCopyValues = Object.values(parentCopy).filter((value) => value);

          if (parentCopyValues.length && !sisalto[avain]) {
            return false;
          }
          return true;
        },
      }),
      otherwise: (schema) => schema.optional(),
    })
  );
}

export const suunnittelunPerustiedotSchema = Yup.object().shape({
  oid: Yup.string().required(),
  vuorovaikutusKierros: Yup.object().shape({
    vuorovaikutusNumero: Yup.number().required(),
    arvioSeuraavanVaiheenAlkamisesta: lokalisoituTekstiEiPakollinen({
      additionalStringValidations: (schema) =>
        schema.max(maxLenght, `Arvioon seuraavan vaiheen alkamisesta voidaan kirjoittaa maksimissaan ${maxLenght} merkkiä`),
    }).nullable(),
    suunnittelunEteneminenJaKesto: lokalisoituTekstiEiPakollinen({
      additionalStringValidations: (schema) =>
        schema.max(maxLenght, `Suunnittelun etenemiseen ja kestoon voidaan kirjoittaa maksimissaan ${maxLenght} merkkiä`),
    }).nullable(),
    esittelyaineisto: getAineistotSchema(),
    suunnitelmaluonnokset: getAineistotSchema(),
    videot: Yup.array()
      .notRequired()
      .of(
        Yup.object().shape({
          SUOMI: lokalisoituEiPakollinenObjektiSchema({ avain: "url", kieli: Kieli.SUOMI, additionalObjectValidations: getLinkkiSchema }),
          RUOTSI: lokalisoituEiPakollinenObjektiSchema({ avain: "url", kieli: Kieli.RUOTSI, additionalObjectValidations: getLinkkiSchema }),
          SAAME: lokalisoituEiPakollinenObjektiSchema({ avain: "url", kieli: Kieli.SAAME, additionalObjectValidations: getLinkkiSchema }),
        })
      )
      .compact(function (linkki) {
        return !linkki.SUOMI;
      }),
    suunnittelumateriaali: Yup.object()
      .notRequired()
      .shape({
        nimi: Yup.string().test("nimi-puttuu", "Nimi puuttuu", (value, testContext) => {
          if (!value && testContext.parent.url) {
            return testContext.createError({
              path: `${testContext.path}`,
              message: "Nimi on annettava, jos osoite on annettu",
            });
          }
          return true;
        }),
        url: Yup.string()
          .url("URL ei kelpaa")
          .test("url-puttuu", "Url puuttuu", (value, testContext) => {
            if (!value && testContext.parent.nimi) {
              return testContext.createError({
                path: `${testContext.path}`,
                message: "Osoite on annettava, jos nimi on annettu",
              });
            }
            return true;
          }),
      }),
    kysymyksetJaPalautteetViimeistaan: paivamaara({ preventPast: true }).required("Toivottu palautepäivämäärä täytyy antaa"),
  }),
});
