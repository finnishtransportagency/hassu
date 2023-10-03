import { ValidationMode, ValidationModeState } from "@components/FormValidationModeProvider";
import { Kieli, Kielitiedot } from "@services/api";
import { isPohjoissaameSuunnitelma } from "src/util/isPohjoissaamiSuunnitelma";
import * as Yup from "yup";

export const kuulutusSaamePDFtInput = () =>
  Yup.object()
    .shape({
      [Kieli.POHJOISSAAME]: Yup.object()
        .shape({
          kuulutusPDFPath: Yup.mixed()
            .when(["$projekti.kielitiedot", "$validationMode"], {
              is: isSaameTiedostoRequired,
              then: (schema) => schema.required("Kuulutus on annettava"),
              otherwise: (schema) => schema.optional(),
            })
            .nullable(),
          kuulutusIlmoitusPDFPath: Yup.mixed()
            .when(["$projekti.kielitiedot", "$validationMode"], {
              is: isSaameTiedostoRequired,
              then: (schema) => schema.required("Ilmoitus on annettava"),
              otherwise: (schema) => schema.optional(),
            })
            .nullable(),
        })
        .when(["$projekti.kielitiedot", "$validationMode"], {
          // Kun muita saamenkieliä otetaan käyttöön, lisätään myös niiden tarkistus allaolevaan
          is: (kielitiedot: Kielitiedot | null | undefined, validationMode: ValidationModeState) =>
            isPohjoissaameSuunnitelma(kielitiedot) && validationMode?.current === ValidationMode.PUBLISH,
          then: (schema) => schema.required("Pohjoissaamenkieliset tiedostot on annettava"),
          otherwise: (schema) => schema.optional(),
        }),
    })
    .when(["$projekti.kielitiedot", "$validationMode"], {
      // Kun muita saamenkieliä otetaan käyttöön, lisätään myös niiden tarkistus allaolevaan
      is: isSaameTiedostoRequired,
      then: (schema) => schema.required("Saamenkieliset tiedostot on annettava"),
      otherwise: (schema) => schema.optional(),
    });

const isSaameTiedostoRequired = (kielitiedot: Kielitiedot | null | undefined, validationMode: ValidationModeState) =>
  isPohjoissaameSuunnitelma(kielitiedot) && validationMode?.current === ValidationMode.PUBLISH;
