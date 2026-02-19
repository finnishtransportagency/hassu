export type DeepReadonly<T> = T extends (infer R)[] ? DeepReadonlyArray<R> : T extends object ? DeepReadonlyObject<T> : T;

interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

type ExtraKeys<T, Shape> = Exclude<keyof T, keyof Shape>;
/** Utility type to check that no extra keys are in an object */
export type Exact<T, Shape> = T extends Shape
  ? ExtraKeys<T, Shape> extends never
    ? T
    : {
        ERROR: "Object contains extra properties";
        EXTRA_KEYS: ExtraKeys<T, Shape>;
      }
  : {
      ERROR: "Object does not match required shape";
    };
