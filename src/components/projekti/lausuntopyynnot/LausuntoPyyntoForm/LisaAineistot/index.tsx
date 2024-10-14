import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import Button from "@components/button/Button";
import LisaAineistotTable from "./Table";
import React, { useRef } from "react";
import { LausuntoPyynnotFormValues } from "../../types";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { allowedFileTypes } from "hassu-common/fileValidationSettings";
import useHandleUploadedFiles, { mapUploadedFileToLadattuTiedostoInputWithTuotu } from "src/hooks/useHandleUploadedFiles";

export default function LisaAineistot({ index, projekti }: Readonly<{ index: number; projekti: ProjektiLisatiedolla }>) {
  const useFormReturn = useFormContext<LausuntoPyynnotFormValues>();

  const lausuntoPyynto = useFormReturn.watch(`lausuntoPyynnot.${index}`);

  const key: `lausuntoPyynnot.${number}.lisaAineistot` = `lausuntoPyynnot.${index}.lisaAineistot`;

  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  const handleUploadedFiles = useHandleUploadedFiles(useFormReturn, key, mapUploadedFileToLadattuTiedostoInputWithTuotu);

  return (
    <SectionContent className="mt-16">
      <h4 className="vayla-small-title">Liitettävät lisäaineistot</h4>
      <p>
        Voit liittää nähtäville asetettujen aineistojen lisäksi lausuntopyyntöön lisäaineistoa. Lausuntopyyntöön liitettävää lisäaineistoa
        ei julkaista palvelun kansalaispuolelle. Liitettyjen lisäaineistojen sisältö näkyy automaattisesti linkin takana, kun aineistot on
        tuotu tälle sivulle ja muutokset on tallennettu. Esikatselu-toiminnolla voit nähdä tallentamattomat lisäaineistomuutokset.
      </p>
      {!!lausuntoPyynto?.lisaAineistot?.length && (
        <LisaAineistotTable
          joTallennetutLisaAineistot={projekti.lausuntoPyynnot?.[index]?.lisaAineistot ?? []}
          lausuntoPyyntoIndex={index}
        />
      )}
      <input
        type="file"
        multiple
        accept={allowedFileTypes.join(", ")}
        style={{ display: "none" }}
        id={`lisa-aineistot-${index}-input`}
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      <label htmlFor={`lisa-aineistot-${index}-input`}>
        <Button className="mt-4" type="button" id={`tuo_lisa-aineistoja_${index}_button`} onClick={onButtonClick}>
          Hae tiedostot
        </Button>
      </label>
    </SectionContent>
  );
}
