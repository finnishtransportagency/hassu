import pickBy from "lodash/pickBy";
import identity from "lodash/identity";

export function removeUndefinedFields<T extends object>(object: T): Partial<T> {
  return pickBy(object, identity);
}
