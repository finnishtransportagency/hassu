import { ReactElement, useRef } from "react";
import { allowedFileTypes } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { LadattavaTiedosto, TallennaHyvaksymisEsitysInput } from "@services/api";
import { useFieldArray, useFormContext } from "react-hook-form";
import IconButton from "@components/button/IconButton";
import { H4 } from "@components/Headings";
import LadattavaTiedostoComponent from "@components/LadattavatTiedostot/LadattavaTiedosto";

export default function KuulutuksetJaKutsu({ tuodut }: Readonly<{ tuodut?: LadattavaTiedosto[] | null }>): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const { fields, remove } = useFieldArray({ name: "muokattavaHyvaksymisEsitys.kuulutuksetJaKutsu", control });
  const handleUploadedFiles = useHandleUploadedFiles("muokattavaHyvaksymisEsitys.kuulutuksetJaKutsu");

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  return (
    <>
      <H4 variant="h3">Kuulutukset ja kutsu vuorovaikutukseen</H4>
      <p>
        Järjestelmä on tuonut alle automaattisesti kuulutukset ja kutsun vuorovaikutukseen. Voit halutessasi lisätä aineistoa omalta
        koneeltasi.
      </p>
      <ul style={{ listStyle: "none" }} className="mt-4">
        {!!tuodut?.length &&
          tuodut.map((tiedosto) => (
            <li key={tiedosto.nimi}>
              <LadattavaTiedostoComponent tiedosto={tiedosto} />
            </li>
          ))}
      </ul>
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
