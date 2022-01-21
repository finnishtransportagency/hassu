import pickBy from "lodash/pickBy";

export function removeUndefinedFields<T extends object>(object: T): Partial<T> {
  return pickBy(object, (value) => value !== undefined);
}
