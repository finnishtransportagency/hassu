import { Status } from "./graphql/apiModel";

type StatusComparisonFunc = (status: Status | null | undefined, minimumStatus: Status) => boolean;

export const isStatusGreaterOrEqualTo: StatusComparisonFunc = (status, minimumStatus) =>
  !!status && statusOrder(status) >= statusOrder(minimumStatus);

export const isStatusLessOrEqualTo: StatusComparisonFunc = (status, maximumStatus) =>
  !!status && statusOrder(status) <= statusOrder(maximumStatus);

export const statusOrder: (status: Status) => number = (status: Status) => Object.values(Status).findIndex((s) => s === status);
