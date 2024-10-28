import { ReactElement, useCallback, useRef } from "react";
import { allowedFileTypes } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles, { mapUploadedFileToLadattuTiedostoNew } from "src/hooks/useHandleUploadedFiles";
import { LadattuTiedostoNew } from "@services/api";
import { useFieldArray, useFormContext } from "react-hook-form";
import { H4 } from "@components/Headings";
import TiedostoInputNewTable from "./TiedostoInputNewTable";
import { EnnakkoneuvotteluForm, HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";

export default function Lausunnot({
  tiedostot,
  ennakkoneuvottelu,
}: Readonly<{ tiedostot?: LadattuTiedostoNew[] | null; ennakkoneuvottelu?: boolean }>): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const vaihe = ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys";
  const useFormReturn = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const { control, register } = useFormReturn;
  const { fields, remove, move } = useFieldArray({ name: `${vaihe}.lausunnot`, control });
  const handleUploadedFiles = useHandleUploadedFiles(useFormReturn, `${vaihe}.lausunnot`, mapUploadedFileToLadattuTiedostoNew);

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  const registerNimi = useCallback(
    (index: number) => {
      return register(`${vaihe}.lausunnot.${index}.nimi`);
    },
    [register, vaihe]
  );

  return (
    <>
      <H4>Lausunnot</H4>
      {!!fields?.length && (
        <TiedostoInputNewTable
          id="lausunnot_files_table"
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
        accept={allowedFileTypes.join(", ")}
        style={{ display: "none" }}
        id="lausunnot-input"
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      <label htmlFor="lausunnot-input">
        <Button className="mt-4" type="button" id="tuo_lausunnot_button" onClick={onButtonClick}>
          Tuo tiedostot
        </Button>
      </label>
    </>
  );
}
