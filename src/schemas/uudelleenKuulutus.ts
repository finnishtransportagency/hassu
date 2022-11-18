import { UudelleenKuulutus, UudelleenkuulutusTila } from "@services/api";
import * as Yup from "yup";
import { lokalisoituTeksti } from "./lokalisoituTeksti";

interface UudelleenKuulutusSchemaProps {
  requiredText?: string;
  uudelleenKuulutusKey: string;
}

export const uudelleenKuulutus = ({ requiredText, uudelleenKuulutusKey }: UudelleenKuulutusSchemaProps) =>
  Yup.object()
    .shape({
      selosteLahetekirjeeseen: lokalisoituTeksti({ requiredText }),
      selosteKuulutukselle: lokalisoituTeksti({ requiredText })
        .when(uudelleenKuulutusKey, {
          is: (uudelleenKuulutus: UudelleenKuulutus | null | undefined) => {
            return uudelleenKuulutus?.tila === UudelleenkuulutusTila.JULKAISTU_PERUUTETTU;
          },
          then: (schema) => schema.required(requiredText),
          otherwise: (schema) => schema.optional(),
        })
        .default(undefined)
        .optional(),
    })
    .when(uudelleenKuulutusKey, {
      is: (uudelleenKuulutus: UudelleenKuulutus | null | undefined) => !!uudelleenKuulutus,
      then: (schema) => schema.required(),
    })
    .default(undefined)
    .optional();
