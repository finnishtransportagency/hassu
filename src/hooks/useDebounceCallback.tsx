import { debounce, DebounceSettings } from "lodash";
import { useEffect, useMemo } from "react";

export default function useDebounceCallback<T extends (...args: any) => any>(func: T, wait?: number, options?: DebounceSettings) {
  const debounceFunc = useMemo(() => debounce(func, wait, options), [func, options, wait]);
  useEffect(() => {
    return () => {
      debounceFunc.cancel();
    };
  }, [debounceFunc]);
  return debounceFunc;
}
