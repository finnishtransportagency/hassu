import { is2100Century, isInFuture, isInPast, isValidDate } from "src/util/dateUtils";
import * as Yup from "yup";

interface PaivamaaraProps {
  preventPast?: boolean | string;
  preventFuture?: boolean | string;
}

const checkValidDate: (date: string | null | undefined) => boolean = (date) => !date || (isValidDate(date) && is2100Century(date));

export const paivamaara = (props?: PaivamaaraProps) => {
  const preventPastMessage = typeof props?.preventPast === "string" ? props.preventPast : "Päivämäärää ei voida asettaa menneisyyteen";
  const preventFutureMessage =
    typeof props?.preventFuture === "string" ? props.preventFuture : "Päivämäärää ei voida asettaa tulevaisuuteen";
  return Yup.string()
    .nullable()
    .test("is-valid-date", "Virheellinen päivämäärä", checkValidDate)
    .test("not-in-past", preventPastMessage, (dateString) => {
      // This test doesn't throw errors if date is not set.
      if (!checkValidDate(dateString) || !props?.preventPast) {
        return true;
      }
      return !isInPast(dateString, "day");
    })
    .test("not-in-future", preventFutureMessage, (dateString) => {
      // This test doesn't throw errors if date is not set.
      if (!checkValidDate(dateString) || !props?.preventFuture) {
        return true;
      }
      return !isInFuture(dateString, "day");
    });
};
