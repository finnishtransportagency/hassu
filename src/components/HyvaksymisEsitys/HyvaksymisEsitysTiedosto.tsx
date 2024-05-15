import Section from "@components/layout/Section2";
import { ReactElement, useRef } from "react";
import { allowedFileTypes } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { useFormContext } from "react-hook-form";

export default function HyvaksymisEsitysTiedosto(): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { watch } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const hyvaksymisEsitys = watch(`muokattavaHyvaksymisEsitys.hyvaksymisEsitys`);
  const handleUploadedFiles = useHandleUploadedFiles(`muokattavaHyvaksymisEsitys.hyvaksymisEsitys`);

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  return (
    <Section>
      <h3 className="vayla-subtitle">Hyväksymisesitys</h3>
      <p>Tuo omalta koneeltasi...</p>
      {!!hyvaksymisEsitys?.length && hyvaksymisEsitys.map((aineisto) => <div key={aineisto.nimi}>{aineisto.nimi}</div>)}
      <input
        type="file"
        multiple
        accept={allowedFileTypes.join(", ")}
        style={{ display: "none" }}
        id={`hyvaksymisesitys-input`}
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      <label htmlFor={`hyvaksymisesitys-input`}>
        <Button className="mt-4" type="button" id={`tuo_hyvaksymisesitys_button`} onClick={onButtonClick}>
          Tuo tiedosto
        </Button>
      </label>
    </Section>
  );
}
