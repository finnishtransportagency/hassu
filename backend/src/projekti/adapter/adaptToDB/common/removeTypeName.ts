export type General<T> = { __typename: string } & T;

export function removeTypeName<Type>(o: General<Type> | null | undefined): Type | null | undefined {
  if (!o) {
    return o;
  }
  const result: Partial<General<Type>> = { ...o };
  delete result.__typename;
  return result as Type;
}
