export type StrictPropertyCheck<T, TExpected, TError> = Exclude<keyof T, keyof TExpected> extends never ? Record<string, unknown> : TError;
