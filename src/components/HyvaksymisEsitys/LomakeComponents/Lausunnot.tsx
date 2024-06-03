import { ReactElement, useRef } from "react";
import { allowedFileTypes } from "hassu-common/fileValidationSettings";
import Button from "@components/button/Button";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { useFieldArray, useFormContext } from "react-hook-form";
import IconButton from "@components/button/IconButton";
import { H4 } from "@components/Headings";

export default function Lausunnot(): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const { fields, remove } = useFieldArray({ name: "muokattavaHyvaksymisEsitys.lausunnot", control });
  const handleUploadedFiles = useHandleUploadedFiles("muokattavaHyvaksymisEsitys.lausunnot");

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  return (
    <>
      <H4>Lausunnot</H4>
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
