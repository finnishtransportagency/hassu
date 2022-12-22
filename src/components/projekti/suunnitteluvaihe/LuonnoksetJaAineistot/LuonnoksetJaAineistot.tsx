import { Vuorovaikutus } from "@services/api";
import Julkinen from "./Julkinen";
import EiJulkinen from "./EiJulkinen";

interface Props {
  vuorovaikutus: Vuorovaikutus | undefined;
  muokkaustila: boolean;
  setMuokkaustila: React.Dispatch<React.SetStateAction<boolean>>;
  saveForm: (e?: React.BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>;
}

export default function LuonnoksetJaAineistot({ saveForm, vuorovaikutus, muokkaustila, setMuokkaustila }: Props) {
  const julkinen = vuorovaikutus?.julkinen;

  if (julkinen) {
    return <Julkinen muokkaustila={muokkaustila} setMuokkaustila={setMuokkaustila} saveForm={saveForm} vuorovaikutus={vuorovaikutus} />;
  }

  return <EiJulkinen vuorovaikutus={vuorovaikutus} />;
}
