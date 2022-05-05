import * as _uuid from "uuid";

export const uuid = {
  v4: (): string => _uuid.v4(),
};
