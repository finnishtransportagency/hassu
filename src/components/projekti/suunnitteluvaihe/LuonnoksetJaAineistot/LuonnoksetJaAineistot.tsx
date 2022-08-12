import { Vuorovaikutus } from "@services/api";
import Julkinen from "./Julkinen";
import EiJulkinen from "./EiJulkinen";

interface Props {
  vuorovaikutus: Vuorovaikutus | undefined;
  muokkaustila: boolean;
  setMuokkaustila: React.Dispatch<React.SetStateAction<boolean>>;
  saveForm: (e?: React.BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>;
  updateFormContext: () => void;
}

export default function LuonnoksetJaAineistot({
  saveForm,
  vuorovaikutus,
  updateFormContext,
  muokkaustila,
  setMuokkaustila,
}: Props) {
  const julkinen = vuorovaikutus?.julkinen;

  if (julkinen) {
    return (
      <Julkinen
        muokkaustila={muokkaustila}
        setMuokkaustila={setMuokkaustila}
        saveForm={saveForm}
        vuorovaikutus={vuorovaikutus}
        updateFormContext={updateFormContext}
      />
    );
  }

  return <EiJulkinen vuorovaikutus={vuorovaikutus} updateFormContext={updateFormContext} />;
}
