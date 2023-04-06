import { Kieli, Kielitiedot } from "@services/api";
import { isPohjoissaameSuunnitelma } from "src/util/isPohjoissaamiSuunnitelma";
import * as Yup from "yup";

export const kutsuSaamePDFInput = () =>
  Yup.object()
    .shape({
      [Kieli.POHJOISSAAME]: Yup.object()
        .shape({
          POHJOISSAAME: Yup.mixed()
            .when(["$projekti.kielitiedot", "$applyLahetaHyvaksyttavaksiChecks"], {
              is: isSaameTiedostoRequired,
              then: (schema) => schema.required("Kuulutus on annettava"),
              otherwise: (schema) => schema.optional(),
            })
            .nullable(),
        })
        .when(["$projekti.kielitiedot", "$applyLahetaHyvaksyttavaksiChecks"], {
          // Kun muita saamenkieliä otetaan käyttöön, lisätään myös niiden tarkistus allaolevaan
          is: (kielitiedot: Kielitiedot | null | undefined, applyLahetaHyvaksyttavaksiChecks: boolean) =>
            isPohjoissaameSuunnitelma(kielitiedot) && applyLahetaHyvaksyttavaksiChecks,
          then: (schema) => schema.required("Pohjoissaamenkieliset tiedostot on annettava"),
          otherwise: (schema) => schema.optional(),
        }),
    })
    .when(["$projekti.kielitiedot", "$applyLahetaHyvaksyttavaksiChecks"], {
      // Kun muita saamenkieliä otetaan käyttöön, lisätään myös niiden tarkistus allaolevaan
      is: isSaameTiedostoRequired,
      then: (schema) => schema.required("Saamenkieliset tiedostot on annettava"),
      otherwise: (schema) => schema.optional(),
    });

const isSaameTiedostoRequired = (kielitiedot: Kielitiedot | null | undefined, applyLahetaHyvaksyttavaksiChecks: boolean) =>
  isPohjoissaameSuunnitelma(kielitiedot) && applyLahetaHyvaksyttavaksiChecks;
