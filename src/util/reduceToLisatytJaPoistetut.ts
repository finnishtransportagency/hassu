export function reduceToLisatytJaPoistetut<T extends Record<string, any>>({ onPoistettu }: { onPoistettu: (t: T) => boolean }) {
  const reducerFunction: (acc: { poistettu: T[]; lisatty: T[] }, obj: T) => { poistettu: T[]; lisatty: T[] } = (
    acc: { poistettu: T[]; lisatty: T[] },
    obj: T
  ) => {
    if (onPoistettu(obj)) {
      acc.poistettu.push(obj);
    } else {
      acc.lisatty.push(obj);
    }
    return acc;
  };
  return reducerFunction;
}
