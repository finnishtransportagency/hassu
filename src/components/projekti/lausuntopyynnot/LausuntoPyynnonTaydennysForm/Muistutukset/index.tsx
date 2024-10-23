import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import Button from "@components/button/Button";
import MuistutuksetTable from "./Table";
import { useRef } from "react";
import { LausuntoPyynnonTaydennysFormValues, LausuntoPyynnonTaydennysLisakentilla } from "../../types";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { H3 } from "../../../../Headings";
import useHandleUploadedFiles, { mapUploadedFileToLadattuTiedostoInputWithTuotu } from "src/hooks/useHandleUploadedFiles";

export default function MuuAineisto({ index, projekti }: Readonly<{ index: number; projekti: ProjektiLisatiedolla }>) {
  const useFormReturn = useFormContext<LausuntoPyynnonTaydennysFormValues>();
  const key: `lausuntoPyynnonTaydennykset.${number}.muistutukset` = `lausuntoPyynnonTaydennykset.${index}.muistutukset`;
  const lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennysLisakentilla | undefined = useFormReturn.watch(
    `lausuntoPyynnonTaydennykset.${index}`
  );
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  const handleUploadedFiles = useHandleUploadedFiles(useFormReturn, key, mapUploadedFileToLadattuTiedostoInputWithTuotu);

  return (
    <SectionContent className="mt-16">
      <H3>Muistutukset</H3>
      <p>Tuo kuntaa koskevat muistutukset omalta koneeltasi.</p>
      {!!lausuntoPyynnonTaydennys?.muistutukset?.length && (
        <MuistutuksetTable lptIndex={index} joTallennetutMuistutukset={projekti.lausuntoPyynnonTaydennykset?.[index]?.muistutukset ?? []} />
      )}
      <input
        type="file"
        multiple
        accept="*/*"
        style={{ display: "none" }}
        id={`muistutukset-${index}-input`}
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      <label htmlFor={`muistutukset-${index}-input`}>
        <Button className="mt-4" type="button" id={`tuo_muistutukset_${index}_button`} onClick={onButtonClick}>
          Tuo muistutuksia
        </Button>
      </label>
    </SectionContent>
  );
}
