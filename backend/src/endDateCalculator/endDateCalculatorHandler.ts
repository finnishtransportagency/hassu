import { LaskePaattymisPaivaQueryVariables } from "../../../common/graphql/apiModel";
import dayjs, { Dayjs } from "dayjs";

dayjs.extend(require("dayjs/plugin/customParseFormat"));

export async function calculateEndDate({ alkupaiva }: LaskePaattymisPaivaQueryVariables) {
  const dateFormat = "YYYY-MM-DD";
  const start = dayjs(alkupaiva, dateFormat, true);
  if (start.isValid()) {
    const endDate: Dayjs = start.add(7, "day");
    return endDate.format(dateFormat);
  } else {
    throw new Error("Alkupäivän pitää olla muotoa YYYY-MM-DD");
  }
}
