import isArray from "lodash/isArray";
import { MergeWithCustomizer } from "lodash";

export const preventArrayMergingCustomizer: MergeWithCustomizer = (_objValue, srcValue) => {
  if (isArray(srcValue)) {
    return srcValue;
  }
};
