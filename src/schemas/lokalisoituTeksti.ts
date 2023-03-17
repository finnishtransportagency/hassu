import { Kieli, Kielitiedot } from "@services/api";
import * as Yup from "yup";
import { ObjectShape } from "yup/lib/object";

interface LokalisoituTekstiSchemaProps {
  requiredText?: string;
  additionalStringValidations?: (schema: Yup.StringSchema) => Yup.StringSchema;
}

type LocalisoituTekstiSchema = (props: LokalisoituTekstiSchemaProps) => Yup.ObjectSchema<ObjectShape>;

export const lokalisoituTeksti: LocalisoituTekstiSchema = ({
  requiredText = "Tieto on annettava",
  additionalStringValidations: schemaWithValidations = (schema) => schema,
}) =>
  Yup.object().shape({
    SUOMI: schemaWithValidations(Yup.string().required(requiredText)),
    RUOTSI: Yup.string().when("$projekti.kielitiedot", {
      is: (kielitiedot: Kielitiedot | null | undefined) =>
        [kielitiedot?.ensisijainenKieli, kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI),
      then: (schema) => schemaWithValidations(schema.required(requiredText)),
      otherwise: (schema) => schema.optional(),
    }),
  });

export const lokalisoituTekstiEiPakollinen: LocalisoituTekstiSchema = ({
  additionalStringValidations: schemaWithValidations = (schema) => schema,
}) =>
  Yup.object().shape({
    SUOMI: schemaWithValidations(
      Yup.string().test({
        message: "Tieto suomeksi on pakollinen, jos tieto on annettu muulla kielellä",
        test: (suomi, context) => {
          const parentCopy = { ...context.parent };
          delete parentCopy.SUOMI;
          delete parentCopy.__typename;
          if (Object.values(parentCopy).filter((value) => value).length && !suomi) return false;
          return true;
        },
      })
    ),
    RUOTSI: Yup.string().when("$projekti.kielitiedot", {
      is: (kielitiedot: Kielitiedot | null | undefined) =>
        [kielitiedot?.ensisijainenKieli, kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI),
      then: (schema) =>
        schemaWithValidations(
          schema.test({
            message: "Tieto ruotsiksi on pakollinen, jos tieto on annettu muilla kielillä",
            test: (ruotsi, context) => {
              const parentCopy = { ...context.parent };
              delete parentCopy.RUOTSI;
              delete parentCopy.__typename;
              if (Object.values(parentCopy).filter((value) => value).length && !ruotsi) return false;
              return true;
            },
          })
        ),
      otherwise: (schema) => schema.optional(),
    }),
  });
