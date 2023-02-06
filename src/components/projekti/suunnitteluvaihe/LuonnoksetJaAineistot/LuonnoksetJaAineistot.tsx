import { VuorovaikutusKierros } from "@services/api";
import Julkinen from "./Julkinen";
import EiJulkinen from "./EiJulkinen";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";

interface Props {
  projekti: ProjektiLisatiedolla | null | undefined;
  vuorovaikutus: VuorovaikutusKierros;
  muokkaustila: boolean;
  setMuokkaustila: React.Dispatch<React.SetStateAction<boolean>>;
  saveForm: (e?: React.BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>;
  julkinen: boolean;
}

export default function LuonnoksetJaAineistot({ projekti, saveForm, vuorovaikutus, muokkaustila, setMuokkaustila, julkinen }: Props) {
  if (julkinen) {
    return (
      <Julkinen
        muokkaustila={muokkaustila}
        setMuokkaustila={setMuokkaustila}
        saveForm={saveForm}
        vuorovaikutus={vuorovaikutus}
        projekti={projekti}
      />
    );
  }

  return <EiJulkinen vuorovaikutus={vuorovaikutus} />;
}
