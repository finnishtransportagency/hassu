import { ReactElement, useRef } from "react";
import { allowedFileTypes } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";

export default function MuuAineistoKoneelta(): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { watch } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const muuAineistoKoneelta = watch(`muokattavaHyvaksymisEsitys.muuAineistoKoneelta`);
  const handleUploadedFiles = useHandleUploadedFiles(`muokattavaHyvaksymisEsitys.muuAineistoKoneelta`);

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  return (
    <SectionContent>
      <h4 className="vayla-small-title">Omalta koneelta</h4>
      <p>Voit halutessasi liittää...</p>
      {!!muuAineistoKoneelta?.length && muuAineistoKoneelta.map((aineisto, index) => <div key={index}>{aineisto.nimi}</div>)}
      <input
        type="file"
        multiple
        accept={allowedFileTypes.join(", ")}
        style={{ display: "none" }}
        id={`muu-aineisto-koneelta-input`}
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      <label htmlFor={`muu-aineisto-koneelta-input`}>
        <Button className="mt-4" type="button" id={`tuo_muu_aineisto_button`} onClick={onButtonClick}>
          Tuo tiedostot
        </Button>
      </label>
    </SectionContent>
  );
}
