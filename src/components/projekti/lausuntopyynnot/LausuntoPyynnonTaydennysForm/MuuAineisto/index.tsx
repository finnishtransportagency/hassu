import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import Button from "@components/button/Button";
import MuuAineistoTable from "./Table";
import { useCallback, useRef } from "react";
import { LadattuTiedostoInput, LadattuTiedostoTila, api } from "@services/api";
import { lataaTiedosto } from "src/util/fileUtil";
import { LausuntoPyynnonTaydennysFormValues, LausuntoPyynnonTaydennysLisakentilla } from "../../types";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { uuid } from "common/util/uuid";
import { H3 } from "../../../../Headings";

export default function MuuAineisto({ index, projekti }: Readonly<{ index: number; projekti: ProjektiLisatiedolla }>) {
  const { watch, setValue } = useFormContext<LausuntoPyynnonTaydennysFormValues>();
  const muuAineisto = watch(`lausuntoPyynnonTaydennykset.${index}.muuAineisto`);
  const lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennysLisakentilla | undefined = watch(`lausuntoPyynnonTaydennykset.${index}`);
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };
  const { withLoadingSpinner } = useLoadingSpinner();

  const handleUploadedFiles = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) =>
      withLoadingSpinner(
        (async () => {
          const files: FileList | null = event.target.files;
          if (files?.length) {
            const uploadedFiles: string[] = await Promise.all(
              Array.from(Array(files.length).keys()).map((key: number) => lataaTiedosto(api, files[key], true))
            );
            const tiedostoInputs: LadattuTiedostoInput[] = uploadedFiles.map((filename, index) => ({
              nimi: files[index].name,
              tila: LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
              tiedosto: filename,
              uuid: uuid.v4(),
            }));
            setValue(`lausuntoPyynnonTaydennykset.${index}.muuAineisto`, (muuAineisto ?? []).concat(tiedostoInputs), { shouldDirty: true });
            event.target.value = "";
          }
        })()
      ),
    [index, muuAineisto, setValue, withLoadingSpinner]
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
