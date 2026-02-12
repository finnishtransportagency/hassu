type ExtraKeys<T, Shape> = Exclude<keyof T, keyof Shape>;
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
