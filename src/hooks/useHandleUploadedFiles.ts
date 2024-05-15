import { allowedFileTypes } from "common/fileValidationSettings";
import { lataaTiedosto } from "../util/fileUtil";
import { LadattuTiedostoInputNew } from "@services/api";
import { uuid } from "common/util/uuid";
import { FieldValues, Path, PathValue, UnpackNestedValue, useFormContext } from "react-hook-form";
import useApi from "src/hooks/useApi";
import useSnackbars from "src/hooks/useSnackbars";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { useCallback } from "react";

/**
 *
 * @param keyToLadatutTiedostot avain FielValueseissa, jonka takana on LadattuTiedostoNew[]-tyyppistä dataa
 * @returns funktio, jonka voi antaa monivalinta-tiedosto-inputin onChange-kohtaan
 */
export default function useHandleUploadedFiles<F extends FieldValues>(
  keyToLadatutTiedostot: Path<F>,
  settings?: { allowOnlyOne: boolean }
) {
  const { setValue, watch } = useFormContext<F>();
  const ladatutTiedostot = watch(keyToLadatutTiedostot);

  const { withLoadingSpinner } = useLoadingSpinner();
  const { showErrorMessage } = useSnackbars();
  const api = useApi();

  return useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      withLoadingSpinner(
        (async () => {
          const files: FileList | null = event.target.files;

          if (files?.length) {
            const nonAllowedTypeFiles: File[] = [];
            const allowedTypeFiles: File[] = [];
            const uploadedFileNamesPromises: Promise<string>[] = [];

            Array.from(Array(files.length).keys()).forEach((key: number) => {
              if (allowedFileTypes.find((type) => type === files[key].type)) {
                uploadedFileNamesPromises.push(lataaTiedosto(api, files[key]));
                allowedTypeFiles.push(files[key]);
              } else {
                nonAllowedTypeFiles.push(files[key]);
              }
            });

            const uploadedFileNames: string[] = await Promise.all(uploadedFileNamesPromises);

            const tiedostoInputs: LadattuTiedostoInputNew[] = uploadedFileNames.map((filename, index) => ({
              nimi: allowedTypeFiles[index].name,
              tiedosto: filename,
              uuid: uuid.v4(),
            }));

            const oldFiles = (ladatutTiedostot ?? []) as LadattuTiedostoInputNew[];
            const newValue = settings?.allowOnlyOne ? tiedostoInputs : oldFiles.concat(tiedostoInputs);
            setValue(keyToLadatutTiedostot, newValue as UnpackNestedValue<PathValue<F, Path<F>>>, {
              shouldDirty: true,
            });

            if (nonAllowedTypeFiles.length) {
              const nonAllowedTypeFileNames = nonAllowedTypeFiles.map((f) => f.name);
              showErrorMessage("Väärä tiedostotyyppi: " + nonAllowedTypeFileNames + ". Sallitut tyypit JPG, PNG, PDF ja MS Word.");
            }
          }
        })()
      ),
    [api, keyToLadatutTiedostot, ladatutTiedostot, setValue, showErrorMessage, withLoadingSpinner, settings]
  );
}
