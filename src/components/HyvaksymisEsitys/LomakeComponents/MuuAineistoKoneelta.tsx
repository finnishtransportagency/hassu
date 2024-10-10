import { ReactElement, useCallback, useRef } from "react";
import { allowedFileTypes } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { LadattuTiedostoNew } from "@services/api";
import { useFieldArray, useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import { H5 } from "@components/Headings";
import TiedostoInputNewTable from "./TiedostoInputNewTable";
import { HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";
import { EnnakkoneuvotteluForm } from "@pages/yllapito/projekti/[oid]/ennakkoneuvottelu";

export default function MuuAineistoKoneelta({
  tiedostot,
  ennakkoneuvottelu,
}: {
  tiedostot?: LadattuTiedostoNew[] | null;
  ennakkoneuvottelu?: boolean;
}): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control, register } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const { fields, remove, move } = useFieldArray({
    name: `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.muuAineistoKoneelta`,
    control,
  });

  const handleUploadedFiles = useHandleUploadedFiles(
    `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.muuAineistoKoneelta`
  );

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  const registerNimi = useCallback(
    (index: number) => {
      return register(`${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.muuAineistoKoneelta.${index}.nimi`);
    },
    [register]
  );

  return (
    <SectionContent>
      <H5 variant="h4">Omalta koneelta</H5>
      <p>
        Voit halutessasi liittää omalta koneelta {ennakkoneuvottelu ? "ennakkoneuvotteluun" : "hyväksymisesitykseen"} toimitettavaan
        aineistoon myös muuta lisäaineistoa, kuten
        {ennakkoneuvottelu ? "ennakkoneuvottelun" : "hyväksymisesityksen"} luonnoksen tai muuta valitsemaasi materiaalia.
      </p>
      {!!fields?.length && (
        <TiedostoInputNewTable
          id="muu_aineisto_koneelta_files_table"
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
        id="muu-aineisto-koneelta-input"
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      <label htmlFor="muu-aineisto-koneelta-input">
        <Button className="mt-4" type="button" id="tuo_muu_aineisto_button" onClick={onButtonClick}>
          Tuo tiedostot
        </Button>
      </label>
    </SectionContent>
  );
}
