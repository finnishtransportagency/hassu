import log from "loglevel";
import useLoadingSpinner from "./useLoadingSpinner";
import useSnackbars from "./useSnackbars";

/**
 *
 * @param func asynktroninen funktio, joka ajetaan spinnerin kanssa, ja jonka jälkeen tulee annettu successMessage, jos ei tule virhetilannetta
 * @param successMessage Viesti, joka näytetään funktion onnistuneen suorituksen jälkeen
 * @param errorText Viesti, joka tulee virheen eteen logitukseen. Oletuksena "Error".
 * @returns asynkroninen funktio, joka ajaa annetun funktion spinnerillä varustettuna ja näyttää onnistumisviestin suorituksen päätteeksi
 */
export default function useSpinnerAndSuccessMessage(func: (...props: any) => Promise<any>, successMessage: string, errorText?: string) {
  const { withLoadingSpinner } = useLoadingSpinner();
  const { showSuccessMessage } = useSnackbars();
  return (...props: any) =>
    withLoadingSpinner(
      (async () => {
        try {
          await func(...props);
          showSuccessMessage(successMessage);
        } catch (e) {
          log.error(errorText ?? "Error", e);
        }
      })()
    );
}
