import { ReactElement, useRef } from "react";
import { allowedFileTypes } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { useController, useFieldArray, useFormContext } from "react-hook-form";
import IconButton from "@components/button/IconButton";
import { H4 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";

export default function HyvaksymisEsitysTiedosto(): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control } = useFormContext<TallennaHyvaksymisEsitysInput>();

  const fieldName = "muokattavaHyvaksymisEsitys.hyvaksymisEsitys";
  const {
    field: { ref: refForError },
    fieldState: { error },
  } = useController({ name: fieldName, control });

  const { fields, remove } = useFieldArray({ name: fieldName, control });
  const handleUploadedFiles = useHandleUploadedFiles(fieldName);

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  return (
    <SectionContent>
      <H4 variant="h3">Hyväksymisesitys</H4>
      <p>Tuo omalta koneeltasi suunnitelman allekirjoitettu hyväksymisesitys.</p>
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
        id="hyvaksymisesitys-input"
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      {error?.message && <p className="text-red">{error.message}</p>}
      <label htmlFor="hyvaksymisesitys-input">
        <Button className="mt-4" type="button" id="tuo_hyvaksymisesitys_button" ref={refForError} onClick={onButtonClick}>
          Tuo tiedosto
        </Button>
      </label>
    </SectionContent>
  );
}
