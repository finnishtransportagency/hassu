import dayjs, { Dayjs } from "dayjs";
import { Aineisto } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";

export function adaptAineistot(aineistot?: Aineisto[] | null, julkaisuPaiva?: Dayjs): API.Aineisto[] | undefined {
  if (julkaisuPaiva && julkaisuPaiva.isAfter(dayjs())) {
    return undefined;
  }
  if (aineistot && aineistot.length > 0) {
    return aineistot
      .filter((aineisto) => aineisto.tila != API.AineistoTila.ODOTTAA_POISTOA)
      .map((aineisto) => ({
        __typename: "Aineisto",
        ...aineisto,
        dokumenttiOid: aineisto.dokumenttiOid,
      }));
  }
  return undefined;
}
