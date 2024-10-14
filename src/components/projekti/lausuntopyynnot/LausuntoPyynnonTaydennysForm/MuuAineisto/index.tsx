import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import Button from "@components/button/Button";
import MuuAineistoTable from "./Table";
import { useRef } from "react";
import { LausuntoPyynnonTaydennysFormValues, LausuntoPyynnonTaydennysLisakentilla } from "../../types";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { H3 } from "../../../../Headings";
import useHandleUploadedFiles, { mapUploadedFileToLadattuTiedostoInputWithTuotu } from "src/hooks/useHandleUploadedFiles";

export default function MuuAineisto({ index, projekti }: Readonly<{ index: number; projekti: ProjektiLisatiedolla }>) {
  const useFormReturn = useFormContext<LausuntoPyynnonTaydennysFormValues>();

  const lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennysLisakentilla | undefined = useFormReturn.watch(
    `lausuntoPyynnonTaydennykset.${index}`
  );
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  const handleUploadedFiles = useHandleUploadedFiles(
    useFormReturn,
    `lausuntoPyynnonTaydennykset.${index}.muuAineisto`,
    mapUploadedFileToLadattuTiedostoInputWithTuotu
  );

  return (
    <SectionContent className="mt-16">
      <H3>Muu aineisto</H3>
      <p>
        Voit halutessasi liittää omalta koneelta lausuntopyynnön täydennyksen yhteydessä muuta lisäaineistoa, esimerkiksi
        lyhennelmätiedoston.
      </p>
      {!!lausuntoPyynnonTaydennys?.muuAineisto?.length && (
        <MuuAineistoTable lptIndex={index} joTallennetutMuuAineisto={projekti.lausuntoPyynnonTaydennykset?.[index]?.muuAineisto ?? []} />
      )}
      <input
        type="file"
        multiple
        accept="*/*"
        style={{ display: "none" }}
        id={`muu-aineisto-${index}-input`}
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      <label htmlFor={`muu-aineisto-${index}-input`}>
        <Button className="mt-4" type="button" id={`tuo_muu_aineisto_${index}_button`} onClick={onButtonClick}>
          Hae tiedostot
        </Button>
      </label>
    </SectionContent>
  );
}
