import { VuorovaikutusKierros } from "@services/api";
import Julkinen from "./Julkinen";
import EiJulkinen from "./EiJulkinen";

interface Props {
  vuorovaikutus: VuorovaikutusKierros;
  muokkaustila: boolean;
  setMuokkaustila: React.Dispatch<React.SetStateAction<boolean>>;
  saveForm: (e?: React.BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>;
  julkinen: boolean;
}

export default function LuonnoksetJaAineistot({ saveForm, vuorovaikutus, muokkaustila, setMuokkaustila, julkinen }: Props) {
  if (julkinen) {
    return <Julkinen muokkaustila={muokkaustila} setMuokkaustila={setMuokkaustila} saveForm={saveForm} vuorovaikutus={vuorovaikutus} />;
  }

  return <EiJulkinen vuorovaikutus={vuorovaikutus} />;
}
