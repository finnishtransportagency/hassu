export const removeTypeName = (o: any | null | undefined) => {
  if (!o) {
    return o;
  }
  let result = { ...o };
  delete result["__typename"];
  return result;
};

export const removeTypeNamesFromArray = (array: (any | null | undefined)[] | null | undefined) => {
  if (!Array.isArray(array)) {
    return array;
  }
  return array.map((o) => removeTypeName(o));
};
