import omitBy from "lodash/omitBy";

const omitUnnecessaryFields = <T extends Record<string, unknown>>(data: T) =>
  omitBy(
    data,
    (value) => !value || (Array.isArray(value) && (value.length === 0 || (value.length === 1 && (value as string[]).includes(""))))
  ) as Partial<T>;

export default omitUnnecessaryFields;
