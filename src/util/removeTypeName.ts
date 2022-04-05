export const removeTypeName = (o: any | null | undefined) => {
  if (!o) {
    return o;
  }
  let result = { ...o };
  delete result["__typename"];
  return result;
};
