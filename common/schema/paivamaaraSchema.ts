import { is2100Century, isInFuture, isInPast, isValidDate } from "hassu-common/util/dateUtils";
import * as Yup from "yup";
import { AnyObject } from "yup/lib/types";

interface PaivamaaraProps {
  preventPast?: boolean | string;
  preventFuture?: boolean | string;
}

const checkValidDate: (date: string | null | undefined) => boolean = (date) => !date || (isValidDate(date) && is2100Century(date));

export const paivamaara = (props?: PaivamaaraProps) => {
  const preventPastMessage = typeof props?.preventPast === "string" ? props.preventPast : "Päivämäärää ei voida asettaa menneisyyteen";
  const preventFutureMessage =
    typeof props?.preventFuture === "string" ? props.preventFuture : "Päivämäärää ei voida asettaa tulevaisuuteen";

  let schema = Yup.string().nullable().test("is-valid-date", "Virheellinen päivämäärä", checkValidDate);

  if (props?.preventPast) {
    schema = schema.test("not-in-past", preventPastMessage, notInPastCheck);
  }
  if (props?.preventFuture) {
    schema = schema.test("not-in-future", preventFutureMessage, notInFutureCheck);
  }
  return schema;
};

export const notInPastCheck: Yup.TestFunction<string | null | undefined, AnyObject> = (dateString: string | null | undefined) => {
  // This test doesn't throw errors if date is not set.
  if (!checkValidDate(dateString)) {
    return true;
  }
  return !isInPast(dateString, "day");
};

export const notInFutureCheck: Yup.TestFunction<string | null | undefined, AnyObject> = (dateString: string | null | undefined) => {
  // This test doesn't throw errors if date is not set.
  if (!checkValidDate(dateString)) {
    return true;
  }
  return !isInFuture(dateString, "day");
};
