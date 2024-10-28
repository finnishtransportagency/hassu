import { ReactElement, useCallback, useRef } from "react";
import { allowedFileTypes } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { LadattavaTiedosto, LadattuTiedostoNew } from "@services/api";
import { useFieldArray, useFormContext } from "react-hook-form";
import { H4 } from "@components/Headings";
import TiedostoInputNewTable from "./TiedostoInputNewTable";
import LadattavaTiedostoComponent from "@components/LadattavatTiedostot/LadattavaTiedosto";
import { EnnakkoneuvotteluForm, HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";

export default function KuulutuksetJaKutsu({
  tuodut,
  tiedostot,
  ennakkoneuvottelu,
}: Readonly<{ tuodut?: LadattavaTiedosto[] | null; tiedostot?: LadattuTiedostoNew[] | null; ennakkoneuvottelu?: boolean }>): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control, register } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const { fields, remove, move } = useFieldArray({
    name: `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.kuulutuksetJaKutsu`,
    control,
  });
  const handleUploadedFiles = useHandleUploadedFiles(
    `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.kuulutuksetJaKutsu`
  );

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  const registerNimi = useCallback(
    (index: number) => {
      return register(`${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.kuulutuksetJaKutsu.${index}.nimi`);
    },
    [register]
  );

  return (
    <>
      <H4 variant="h3">Kuulutukset ja kutsu vuorovaikutukseen</H4>
      <p>
        Järjestelmä on tuonut alle automaattisesti kuulutukset ja kutsun vuorovaikutukseen. Voit halutessasi lisätä aineistoa omalta
        koneeltasi.
      </p>
      <ul style={{ listStyle: "none" }} className="mt-4">
        {!!tuodut?.length &&
          tuodut.map((tiedosto, i) => (
            <li key={tiedosto.nimi + i}>
              <LadattavaTiedostoComponent tiedosto={tiedosto} />
            </li>
          ))}
      </ul>
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
        accept={allowedFileTypes.join(", ")}
        style={{ display: "none" }}
        id="kuulutuksetJaKutsu-input"
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      <label htmlFor="kuulutuksetJaKutsu-input">
        <Button className="mt-4" type="button" id="tuo_kuulutuksetJaKutsu_button" onClick={onButtonClick}>
          Tuo tiedostot
        </Button>
      </label>
    </>
  );
}
