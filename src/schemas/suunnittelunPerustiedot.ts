import { Kieli, Kielitiedot } from "@services/api";
import * as Yup from "yup";
import { ObjectShape } from "yup/lib/object";
import { lokalisoituTekstiEiPakollinen } from "./lokalisoituTeksti";
import { paivamaara } from "./paivamaaraSchema";
import { getAineistotSchema } from "./common";

const maxLenght = 2000;

const getLinkkiSchema = (schema: Yup.ObjectSchema<ObjectShape>) =>
  schema.shape({
    nimi: Yup.string(),
    url: Yup.string().url("URL ei kelpaa").notRequired(),
  });

interface LokalisoituObjektiSchemaProps {
  kieli: Kieli;
  additionalObjectValidations?: (schema: Yup.ObjectSchema<ObjectShape>) => Yup.ObjectSchema<ObjectShape>;
}

function lokalisoituEiPakollinenObjektiSchema({
  kieli,
  additionalObjectValidations: schemaWithValidations = (schema) => schema,
}: LokalisoituObjektiSchemaProps) {
  return schemaWithValidations(
    Yup.object().when("$projekti.kielitiedot", {
      is: (kielitiedot: Kielitiedot | null | undefined) => [kielitiedot?.ensisijainenKieli, kielitiedot?.toissijainenKieli].includes(kieli),
      then: Yup.object().test({
        message: "Tieto on pakollinen, jos tieto on annettu muilla kielillä",
        test: async function (sisalto, context) {
          const { __typename, [kieli]: _nykyisenKielenKentat, ...tarkistettavatKielet } = context.parent || {};

          const incorrectEntries = Object.values(tarkistettavatKielet)
            .reduce<[string, any][]>((kentat, tarkistettavaKieli: any) => {
              kentat.push(...Object.entries(tarkistettavaKieli));
              return kentat;
            }, [])
            .filter(([key, value]) => !sisalto[key] && !!value);

          const errors = incorrectEntries.map(([key]) => {
            return new Yup.ValidationError(
              "Tieto on pakollinen, jos tieto on annettu muilla kielillä",
              sisalto[key],
              context.path + "." + key
            );
          });

          return errors.length ? new Yup.ValidationError(errors) : true;
        },
      }),
      otherwise: (schema) => schema.optional(),
    })
  );
}

const getLinkkiNimiPakollinenSchema = (schema: Yup.ObjectSchema<ObjectShape>) =>
  schema.shape({
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
  });

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
          SUOMI: lokalisoituEiPakollinenObjektiSchema({ kieli: Kieli.SUOMI, additionalObjectValidations: getLinkkiSchema }),
          RUOTSI: lokalisoituEiPakollinenObjektiSchema({ kieli: Kieli.RUOTSI, additionalObjectValidations: getLinkkiSchema }),
        })
      )
      .compact(function (linkki) {
        return !linkki.SUOMI;
      }),
    suunnittelumateriaali: Yup.array()
      .notRequired()
      .of(
        Yup.object()
          .notRequired()
          .shape({
            SUOMI: lokalisoituEiPakollinenObjektiSchema({
              kieli: Kieli.SUOMI,
              additionalObjectValidations: getLinkkiNimiPakollinenSchema,
            }),
            RUOTSI: lokalisoituEiPakollinenObjektiSchema({
              kieli: Kieli.RUOTSI,
              additionalObjectValidations: getLinkkiNimiPakollinenSchema,
            }),
          })
      ),
    kysymyksetJaPalautteetViimeistaan: paivamaara({ preventPast: true }).required("Toivottu palautepäivämäärä täytyy antaa"),
  }),
});
