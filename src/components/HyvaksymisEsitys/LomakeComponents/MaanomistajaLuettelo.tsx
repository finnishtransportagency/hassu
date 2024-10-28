import { ReactElement, useCallback, useRef } from "react";
import { allowedFileTypes } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { LadattavaTiedosto, LadattuTiedostoNew } from "@services/api";
import { useFieldArray, useFormContext } from "react-hook-form";
import { H4 } from "@components/Headings";
import LadattavaTiedostoComponent from "@components/LadattavatTiedostot/LadattavaTiedosto";
import TiedostoInputNewTable from "./TiedostoInputNewTable";
import { EnnakkoneuvotteluForm, HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";

export default function Maanomistajaluettelo({
  tuodut,
  tiedostot,
  ennakkoneuvottelu,
}: Readonly<{ tuodut?: LadattavaTiedosto[] | null; tiedostot?: LadattuTiedostoNew[] | null; ennakkoneuvottelu?: boolean }>): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control, register } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const { fields, remove, move } = useFieldArray({
    name: `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.maanomistajaluettelo`,
    control,
  });
  const handleUploadedFiles = useHandleUploadedFiles(
    `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.maanomistajaluettelo`
  );

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  const registerNimi = useCallback(
    (index: number) => {
      return register(`${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.maanomistajaluettelo.${index}.nimi`);
    },
    [register]
  );

  return (
    <>
      <H4 variant="h3">Maanomistajaluettelo</H4>
      <p>Järjestelmä on tuonut alle automaattisesti maanomistajaluettelon. Voit halutessasi lisätä aineistoa omalta koneeltasi.</p>
      <ul style={{ listStyle: "none" }} className="mt-4">
        {!!tuodut?.length &&
          tuodut.map((tiedosto) => (
            <li key={tiedosto.nimi}>
              <LadattavaTiedostoComponent tiedosto={tiedosto} />
            </li>
          ))}
      </ul>
      {!!fields?.length && (
        <TiedostoInputNewTable
          id="maanomistajaluettelo_files_table"
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
        id="maanomistajaluettelo-input"
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      <label htmlFor="maanomistajaluettelo-input">
        <Button className="mt-4" type="button" id="tuo_maanomistajaluettelo_button" onClick={onButtonClick}>
          Tuo tiedostot
        </Button>
      </label>
    </>
  );
}
