import Button from "@components/button/Button";
import SectionContent from "@components/layout/SectionContent";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { allowedFileTypes } from "common/fileValidationSettings";
import { kuntametadata } from "common/kuntametadata";
import { ReactElement, useRef } from "react";
import { useFormContext } from "react-hook-form";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";

export default function Muistutukset({ kunnat }: Readonly<{ kunnat: number[] }>): ReactElement {
  return (
    <SectionContent>
      {kunnat.map((kunta) => (
        <KunnanMuistutukset key={kunta} kunta={kunta} />
      ))}
    </SectionContent>
  );
}

function KunnanMuistutukset({ kunta }: Readonly<{ kunta: number }>): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { watch } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const muistutukset = watch(`muokattavaHyvaksymisEsitys.muistutukset`);
  const kunnanMuistutukset = muistutukset?.filter((m) => m.kunta == kunta);

  const handleUploadedFiles = useHandleUploadedFiles(`muokattavaHyvaksymisEsitys.muistutukset`, { kunta });

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  return (
    <SectionContent>
      <h5 className="vayla-smallest-title">{kuntametadata.nameForKuntaId(kunta, "fi")}</h5>
      {!!kunnanMuistutukset?.length && kunnanMuistutukset.map((aineisto) => <div key={aineisto.nimi}>{aineisto.nimi}</div>)}
      <input
        type="file"
        multiple
        accept={allowedFileTypes.join(", ")}
        style={{ display: "none" }}
        id={`kunnan-${kunta}-muistutukset-input`}
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      <label htmlFor={`kunnan-${kunta}-muistutukset-input`}>
        <Button className="mt-4" type="button" id={`tuo_kunnan_${kunta}_muistutukset_button`} onClick={onButtonClick}>
          Tuo tiedostot
        </Button>
      </label>
    </SectionContent>
  );
}
