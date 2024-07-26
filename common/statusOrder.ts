import { Status } from "./graphql/apiModel";

type StatusComparisonFunc = (status: Status | null | undefined, minimumStatus: Status) => boolean;

export const isStatusGreaterOrEqualTo: StatusComparisonFunc = (status, minimumStatus) =>
  !!status && statusOrder[status] >= statusOrder[minimumStatus];

export const isStatusLessOrEqualTo: StatusComparisonFunc = (status, maximumStatus) =>
  !!status && statusOrder[status] <= statusOrder[maximumStatus];

export const statusOrder: Record<Status, number> = {
  EI_JULKAISTU_PROJEKTIN_HENKILOT: 0,
  EI_JULKAISTU: 1,
  ALOITUSKUULUTUS: 2,
  SUUNNITTELU: 3,
  NAHTAVILLAOLO_AINEISTOT: 4,
  NAHTAVILLAOLO: 5,
  HYVAKSYMISMENETTELYSSA_AINEISTOT: 6,
  HYVAKSYMISMENETTELYSSA: 7,
  HYVAKSYTTY: 8,
  EPAAKTIIVINEN_1: 9,
  JATKOPAATOS_1_AINEISTOT: 10,
  JATKOPAATOS_1: 11,
  EPAAKTIIVINEN_2: 12,
  JATKOPAATOS_2_AINEISTOT: 13,
  JATKOPAATOS_2: 14,
  EPAAKTIIVINEN_3: 15,
};
