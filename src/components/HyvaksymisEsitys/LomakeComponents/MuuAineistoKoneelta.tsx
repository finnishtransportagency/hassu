import { ReactElement, useRef } from "react";
import { allowedFileTypes } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { useFieldArray, useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import IconButton from "@components/button/IconButton";
import { H4, H5 } from "@components/Headings";

export default function MuuAineistoKoneelta(): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const { fields, remove } = useFieldArray({ name: `muokattavaHyvaksymisEsitys.muuAineistoKoneelta`, control });

  const handleUploadedFiles = useHandleUploadedFiles(`muokattavaHyvaksymisEsitys.muuAineistoKoneelta`);

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  return (
    <SectionContent>
      <H5 variant="h4">Omalta koneelta</H5>
      <p>
        Voit halutessasi liittää omalta koneelta hyväksymisesitykseen toimitettavaan aineistoon myös muuta lisäaineistoa, kuten
        hyväksymisesityksen luonnoksen tai muuta valitsemaasi materiaalia.
      </p>
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
        id={`muu-aineisto-koneelta-input`}
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      <label htmlFor={`muu-aineisto-koneelta-input`}>
        <Button className="mt-4" type="button" id={`tuo_muu_aineisto_button`} onClick={onButtonClick}>
          Tuo tiedostot
        </Button>
      </label>
    </SectionContent>
  );
}
