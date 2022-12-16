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
    SAAME: Yup.string().when("$projekti.kielitiedot", {
      is: (kielitiedot: Kielitiedot | null | undefined) =>
        [kielitiedot?.ensisijainenKieli, kielitiedot?.toissijainenKieli].includes(Kieli.SAAME),
      then: (schema) => schemaWithValidations(schema.required(requiredText)),
      otherwise: (schema) => schema.optional(),
    }),
  });
