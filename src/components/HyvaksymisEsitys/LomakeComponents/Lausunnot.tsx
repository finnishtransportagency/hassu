import { ReactElement, useCallback, useRef } from "react";
import { allowedFileTypesVirkamiehille } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
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
  const { control, register } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const { fields, remove, move } = useFieldArray({
    name: `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.lausunnot`,
    control,
  });
  const handleUploadedFiles = useHandleUploadedFiles(`${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.lausunnot`);

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  const registerNimi = useCallback(
    (index: number) => {
      return register(`${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.lausunnot.${index}.nimi`);
    },
    [register]
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
        accept={allowedFileTypesVirkamiehille.join(", ")}
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
