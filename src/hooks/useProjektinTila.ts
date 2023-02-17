import { useInterval } from "./useInterval";

import { useState } from "react";
import useApi from "./useApi";
import { Projekti } from "../../common/graphql/apiModel";

export default function useIsProjektiReadyForTilaChange(projekti: Projekti) {
  const [isReady, setIsReady] = useState(false);

  const api = useApi();

  useInterval(
    async () => {
      let tila = projekti?.oid ? await api.lataaProjektinTila(projekti.oid) : undefined;
      if (tila?.aineistotValmiit) {
        console.log("Aineistot valmiit");
        setIsReady(true);
        return false;
      } else {
        console.log("Jatka pollaamista");
        setIsReady(false);
        return true;
      }
    },
    2000,
    60,
    [projekti]
  );

  return isReady;
}
