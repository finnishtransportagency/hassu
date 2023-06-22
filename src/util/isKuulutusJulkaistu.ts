import { KuulutusJulkaisuTila } from "@services/api";
import { GenericApiKuulutusJulkaisu } from "backend/src/projekti/projektiUtil";
import { nyt } from "backend/src/util/dateUtil";
import dayjs from "dayjs";

export function isKuulutusPublic(julkaisu: GenericApiKuulutusJulkaisu | null | undefined) {
  const isHyvaksytty = julkaisu?.tila === KuulutusJulkaisuTila.HYVAKSYTTY;
  const isMigroitu = julkaisu?.tila === KuulutusJulkaisuTila.MIGROITU;

  const isInPast =
    julkaisu?.kuulutusPaiva && (dayjs(julkaisu.kuulutusPaiva).isBefore(nyt(), "day") || dayjs(julkaisu.kuulutusPaiva).isSame(nyt(), "day"));

  return (isHyvaksytty && isInPast) || isMigroitu;
}
