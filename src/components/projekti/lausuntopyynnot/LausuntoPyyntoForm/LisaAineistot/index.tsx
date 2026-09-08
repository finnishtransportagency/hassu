// Contains code generated or recommended by Amazon Q
import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import Button from "@components/button/Button";
import LisaAineistotTable from "./Table";
import React, { useCallback, useRef } from "react";
import { lataaTiedosto } from "src/util/fileUtil";
import { LadattuTiedostoInput, LadattuTiedostoTila, api } from "@services/api";
import { LausuntoPyynnotFormValues } from "../../types";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { uuid } from "common/util/uuid";
import { allowedFileTypesVirkamiehille, maxFileSize } from "hassu-common/fileValidationSettings";
import useSnackbars from "../../../../../hooks/useSnackbars";

export default function LisaAineistot({ index, projekti }: Readonly<{ index: number; projekti: ProjektiLisatiedolla }>) {
  const { watch, setValue } = useFormContext<LausuntoPyynnotFormValues>();

  const lausuntoPyynto = watch(`lausuntoPyynnot.${index}`);
  const lisaAineistot = watch(`lausuntoPyynnot.${index}.lisaAineistot`);

  const { withLoadingSpinner } = useLoadingSpinner();

  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  const { showErrorMessage } = useSnackbars();

  const handleUploadedFiles = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      withLoadingSpinner(
        (async () => {
          const files: FileList | null = event.target.files;

          if (files?.length) {
            const nonAllowedTypeFiles: File[] = [];
            const tooLargeFiles: File[] = [];
            const allowedTypeFiles: File[] = [];
            const uploadedFileNamesPromises: Promise<string>[] = [];

            Array.from(Array(files.length).keys()).forEach((key: number) => {
              const file = files[key];
              if (file.size > maxFileSize) {
                tooLargeFiles.push(file);
              } else if (allowedFileTypesVirkamiehille.find((type) => type === file.type)) {
                uploadedFileNamesPromises.push(lataaTiedosto(api, file, true));
                allowedTypeFiles.push(file);
              } else {
                nonAllowedTypeFiles.push(file);
              }
            });

            const uploadedFileNames: string[] = await Promise.all(uploadedFileNamesPromises);

            const tiedostoInputs: LadattuTiedostoInput[] = uploadedFileNames.map((filename, index) => ({
              nimi: allowedTypeFiles[index].name,
              tila: LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
              tiedosto: filename,
              uuid: uuid.v4(),
            }));

            setValue(`lausuntoPyynnot.${index}.lisaAineistot`, (lisaAineistot ?? []).concat(tiedostoInputs), { shouldDirty: true });

            if (tooLargeFiles.length) {
              const maxSizeMB = Math.round(maxFileSize / 1000000);
              showErrorMessage(
                `Tiedosto on liian suuri: ${tooLargeFiles.map((f) => f.name).join(", ")}. Suurin sallittu koko on ${maxSizeMB} Mt.`
              );
            }
            if (nonAllowedTypeFiles.length) {
              const nonAllowedTypeFileNames = nonAllowedTypeFiles.map((f) => f.name);
              showErrorMessage("Väärä tiedostotyyppi: " + nonAllowedTypeFileNames + ". Sallitut tyypit JPG, PNG, PDF ja MS Word.");
            }
            event.target.value = "";
          }
        })()
      ),
    [index, lisaAineistot, setValue, showErrorMessage, withLoadingSpinner]
  );

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
        accept={allowedFileTypesVirkamiehille.join(", ")}
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
