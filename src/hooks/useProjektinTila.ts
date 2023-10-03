import { useInterval } from "./useInterval";

import { useEffect, useState } from "react";
import useApi from "./useApi";
import { useProjekti } from "./useProjekti";

export default function useIsProjektiReadyForTilaChange() {
  const [isReady, setIsReady] = useState(false);

  const api = useApi();

  const { data: projekti } = useProjekti();

  useEffect(() => {
    setIsReady(false);
  }, [projekti]);

  useInterval(
    async () => {
      let tila = projekti?.oid ? await api.lataaProjektinTila(projekti.oid) : undefined;
      if (tila?.aineistotValmiit) {
        setIsReady(true);
        return false;
      } else {
        setIsReady(false);
        return true;
      }
    },
    2000,
    120,
    [projekti]
  );

  return isReady;
}
