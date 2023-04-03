export type PartiallyRequiredAndNonNullable<T, K extends keyof T> = Omit<T, K> &
  Required<{
    [P in K]: NonNullable<T[P]>;
  }>;
