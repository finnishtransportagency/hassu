import { KuulutusJulkaisuTila } from "@services/api";
import { GenericApiKuulutusJulkaisu } from "backend/src/projekti/projektiUtil";
import { nyt } from "backend/src/util/dateUtil";
import dayjs from "dayjs";

export function isKuulutusPublic(julkaisu: GenericApiKuulutusJulkaisu | null | undefined) {
  const isHyvaksytty = julkaisu?.tila === KuulutusJulkaisuTila.HYVAKSYTTY;
  const isInPast = julkaisu?.kuulutusPaiva && nyt().isBefore(dayjs(julkaisu.kuulutusPaiva), "day");
  return isHyvaksytty && isInPast;
}
