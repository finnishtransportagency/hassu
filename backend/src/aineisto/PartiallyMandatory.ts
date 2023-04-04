export type PartiallyMandatory<T, K extends keyof T> = Omit<T, K> &
  Required<{
    [P in K]: NonNullable<T[P]>;
  }>;
