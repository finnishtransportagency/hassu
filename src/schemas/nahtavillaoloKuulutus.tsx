import * as Yup from "yup";
import { isDevEnvironment } from "@services/config";

function validateDate(dateString: string) {
  try {
    const dateString2 = new Date(dateString!).toISOString().split("T")[0];
    if (isDevEnvironment) {
      return dateString!.startsWith(dateString2);
    }
    return dateString2 === dateString;
  } catch {
    return false;
  }
}

export const nahtavillaoloKuulutusSchema = Yup.object().shape({
  oid: Yup.string().required(),
  nahtavillaoloVaihe: Yup.object()
    .required()
    .shape({
      kuulutusPaiva: Yup.string()
        .required("Kuulutuspäivä ei voi olla tyhjä")
        .nullable()
        .test("is-valid-date", "Virheellinen päivämäärä", (dateString) => {
          if (!dateString) {
            return false;
          }
          return validateDate(dateString);
        })
        .test("not-in-past", "Kuulutuspäivää ei voida asettaa menneisyyteen", (dateString) => {
          // Kuulutuspaiva is not required when saved as a draft.
          // This test doesn't throw errors if date is not set.
          if (!dateString) {
            return true;
          }
          const todayISODate = new Date().toISOString().split("T")[0];
          return dateString >= todayISODate;
        }),
      kuulutusVaihePaattyyPaiva: Yup.string().test("is-valid-date", "Virheellinen päivämäärä", (dateString) => {
        // kuulutusVaihePaattyyPaiva is not required when saved as a draft.
        // This test doesn't throw errors if date is not set.
        if (!dateString) {
          return true;
        }
        return validateDate(dateString);
      }),
      muistutusoikeusPaattyyPaiva: Yup.string().test("is-valid-date", "Virheellinen päivämäärä", (dateString) => {
        // muistutusoikeusPaattyy is not required when saved as a draft.
        // This test doesn't throw errors if date is not set.
        if (!dateString) {
          return true;
        }
        return validateDate(dateString);
      }),
    }),
});
