import { useRouter } from "next/router";
import { useEffect, useRef } from "react";

export const useLeaveConfirm = (shouldWarn: boolean) => {
  const router = useRouter();
  const message =
    "Olet tehnyt sivulle muutoksia, joita ei ole tallennettu. Tehdyt muutokset menetetään, jos poistut sivulta. \n\nHaluatko poistua tallentamatta?";

  const lastHistoryState = useRef(global.history?.state);
  useEffect(() => {
    const storeLastHistoryState = () => {
      lastHistoryState.current = history.state;
    };
    router.events.on("routeChangeComplete", storeLastHistoryState);
    return () => {
      router.events.off("routeChangeComplete", storeLastHistoryState);
    };
  }, [router.events]);

  useEffect(() => {
    let isWarned = false;

    const routeChangeStart = (url: string) => {
      if (router.asPath !== url && shouldWarn && !isWarned) {
        isWarned = true;
        if (window.confirm(message)) {
          router.push(url);
        } else {
          isWarned = false;
          router.events.emit("routeChangeError");

          // HACK
          const state = lastHistoryState.current;
          if (state != null && history.state != null && state.idx !== history.state.idx) {
            history.go(state.idx < history.state.idx ? -1 : 1);
          }

          // eslint-disable-next-line no-throw-literal
          throw "Abort route change. Please ignore this error.";
        }
      }
    };

    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldWarn && !isWarned) {
        const event = e || window.event;
        event.returnValue = message;
        return message;
      }
      return null;
    };

    router.events.on("routeChangeStart", routeChangeStart);
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      router.events.off("routeChangeStart", routeChangeStart);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [router, message, shouldWarn]);
};

export default useLeaveConfirm;
