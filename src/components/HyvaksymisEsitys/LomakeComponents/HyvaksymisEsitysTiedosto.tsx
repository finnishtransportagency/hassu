import { ReactElement, useCallback, useRef } from "react";
import { allowedFileTypes } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { LadattuTiedostoInputNew, TallennaHyvaksymisEsitysInput } from "@services/api";
import { useController, useFieldArray, useFormContext } from "react-hook-form";
import { H4 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";
import TiedostoInputNewTable from "./TiedostoInputNewTable";

export default function HyvaksymisEsitysTiedosto({ tiedostot }: { tiedostot?: LadattuTiedostoInputNew[] | null }): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control, register } = useFormContext<TallennaHyvaksymisEsitysInput>();

  const fieldName = "muokattavaHyvaksymisEsitys.hyvaksymisEsitys";
  const {
    field: { ref: refForError },
    fieldState: { error },
  } = useController({ name: fieldName, control });

  const { fields, remove, move } = useFieldArray({ name: fieldName, control });
  const handleUploadedFiles = useHandleUploadedFiles(fieldName);

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  const registerNimi = useCallback(
    (index: number) => {
      return register(`muokattavaHyvaksymisEsitys.hyvaksymisEsitys.${index}.nimi`);
    },
    [register]
  );

  return (
    <SectionContent>
      <H4 variant="h3">Hyväksymisesitys</H4>
      <p>Tuo omalta koneeltasi suunnitelman allekirjoitettu hyväksymisesitys.</p>
      {!!tiedostot?.length && (
        <TiedostoInputNewTable
          id="hyvaksymis_esitys_files_table"
          tiedostot={tiedostot}
          remove={remove}
          fields={fields}
          move={move}
          registerNimi={registerNimi}
          ladattuTiedosto
        />
      )}
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
