import Section from "@components/layout/Section2";
import { ReactElement, useRef } from "react";
import { allowedFileTypes } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { useFieldArray, useFormContext } from "react-hook-form";
import IconButton from "@components/button/IconButton";

export default function HyvaksymisEsitysTiedosto(): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const handleUploadedFiles = useHandleUploadedFiles(`muokattavaHyvaksymisEsitys.hyvaksymisEsitys`);
  const { fields, remove } = useFieldArray({ name: `muokattavaHyvaksymisEsitys.hyvaksymisEsitys`, control });

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  return (
    <Section>
      <h3 className="vayla-subtitle">Hyväksymisesitys</h3>
      <p>Tuo omalta koneeltasi...</p>
      {fields.map((aineisto) => (
        <div key={aineisto.id}>
          {aineisto.nimi}
          <IconButton
            type="button"
            onClick={() => {
              remove(fields.indexOf(aineisto));
            }}
            icon="trash"
          />
        </div>
      ))}
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
