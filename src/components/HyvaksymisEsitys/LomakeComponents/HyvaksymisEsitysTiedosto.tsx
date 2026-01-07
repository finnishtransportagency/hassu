import { ReactElement, useCallback, useRef } from "react";
import { allowedFileTypesVirkamiehille } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { LadattuTiedostoNew } from "@services/api";
import { useController, useFieldArray, useFormContext } from "react-hook-form";
import { H4 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";
import TiedostoInputNewTable from "./TiedostoInputNewTable";
import { EnnakkoneuvotteluForm, HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";

export default function HyvaksymisEsitysTiedosto({
  tiedostot,
  ennakkoneuvottelu,
}: Readonly<{ tiedostot?: LadattuTiedostoNew[] | null; ennakkoneuvottelu?: boolean }>): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control, register } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();

  const fieldName = ennakkoneuvottelu ? "ennakkoNeuvottelu.hyvaksymisEsitys" : "muokattavaHyvaksymisEsitys.hyvaksymisEsitys";
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
      return register(`${fieldName}.${index}.nimi`);
    },
    [register]
  );

  return (
    <SectionContent>
      <H4 variant="h3">Hyväksymisesitys</H4>
      <p>
        {ennakkoneuvottelu
          ? "Tuo omalta koneelta suunnitelman hyväksymisesitys tai sen luonnos. Kohdan voi jättää tyhjäksi, jos esitystä ei ole vielä laadittu."
          : "Tuo omalta koneeltasi suunnitelman allekirjoitettu hyväksymisesitys."}
      </p>
      {!!fields?.length && (
        <TiedostoInputNewTable
          id="hyvaksymisesitys_files_table"
          tiedostot={tiedostot}
          remove={remove}
          fields={fields}
          move={move}
          registerNimi={registerNimi}
          ladattuTiedosto
          noHeaders
          showTuotu
        />
      )}
      <input
        type="file"
        multiple
        accept={allowedFileTypesVirkamiehille.join(", ")}
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
