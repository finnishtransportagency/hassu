import isArray from "lodash/isArray";
import { MergeWithCustomizer } from "lodash";

export const preventArrayMergingCustomizer: MergeWithCustomizer = (objValue, srcValue) => {
  if (isArray(objValue) && isArray(srcValue)) {
    return srcValue;
  }
};
