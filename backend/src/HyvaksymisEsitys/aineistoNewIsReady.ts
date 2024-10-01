import dayjs from "dayjs";
import { AineistoNew } from "../database/model/common";

export function aineistoNewIsReady(aineisto: AineistoNew, aineistoHandledAt: string | undefined | null): boolean {
  return !!aineistoHandledAt && !!aineisto.lisatty && !dayjs(aineisto.lisatty).isAfter(dayjs(aineistoHandledAt));
}
