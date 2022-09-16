import { omitBy } from "lodash";

const omitUnnecessaryFields = <T extends object>(data: T) =>
  omitBy(
    data,
    (value) => !value || (Array.isArray(value) && (value.length === 0 || (value.length === 1 && (value as string[]).includes(""))))
  );

export default omitUnnecessaryFields;
