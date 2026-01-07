import { allowedFileTypesVirkamiehille } from "common/fileValidationSettings";
import { lataaTiedosto } from "../util/fileUtil";
import { KunnallinenLadattuTiedostoInput, LadattuTiedostoInputNew } from "@services/api";
import { uuid } from "common/util/uuid";
import { FieldValues, Path, PathValue, useFormContext } from "react-hook-form";
import useApi from "src/hooks/useApi";
import useSnackbars from "src/hooks/useSnackbars";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { useCallback } from "react";

/**
 * @param keyToLadatutTiedostot avain FielValueseissa, jonka takana on LadattuTiedostoNew[]-tyyppistä dataa
 *
 * @param settings sisältää valinnaiset asetukset:
 * - allowOnlyOne: jos tiedostovalitsimessa voidaan valita vain yksi tiedosto
 * - kunta: muistutuksia varten lisätty asetus, jolla tiedostolle lisätään kuntatieto
 *
 * @returns funktio, jonka voi antaa monivalinta-tiedosto-inputin onChange-kohtaan
 */
export default function useHandleUploadedFiles<F extends FieldValues>(
  keyToLadatutTiedostot: Path<F>,
  settings?: { allowOnlyOne?: boolean; kunta?: number }
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
              if (allowedFileTypesVirkamiehille.find((type) => type === files[key].type)) {
                uploadedFileNamesPromises.push(lataaTiedosto(api, files[key], true));
                allowedTypeFiles.push(files[key]);
              } else {
                nonAllowedTypeFiles.push(files[key]);
              }
            });

            const uploadedFileNames: string[] = await Promise.all(uploadedFileNamesPromises);

            const tiedostoInputs = uploadedFileNames.map((filename, index) => {
              let input: KunnallinenLadattuTiedostoInput | LadattuTiedostoInputNew;

              input = settings?.kunta
                ? {
                    nimi: allowedTypeFiles[index].name,
                    tiedosto: filename,
                    uuid: uuid.v4(),
                    kunta: settings.kunta,
                  }
                : {
                    nimi: allowedTypeFiles[index].name,
                    tiedosto: filename,
                    uuid: uuid.v4(),
                  };
              return input;
            });

            const oldFiles = (ladatutTiedostot ?? []) as LadattuTiedostoInputNew[];
            const newValue = settings?.allowOnlyOne ? tiedostoInputs : oldFiles.concat(tiedostoInputs);
            setValue(keyToLadatutTiedostot, newValue as PathValue<F, Path<F>>, {
              shouldDirty: true,
            });

            if (nonAllowedTypeFiles.length) {
              const nonAllowedTypeFileNames = nonAllowedTypeFiles.map((f) => f.name);
              showErrorMessage("Väärä tiedostotyyppi: " + nonAllowedTypeFileNames + ". Sallitut tyypit JPG, PNG, PDF ja MS Word.");
            }
            // Clear input value so onchange will trigger for the same file
            event.target.value = "";
          }
        })()
      ),
    [api, keyToLadatutTiedostot, ladatutTiedostot, setValue, showErrorMessage, withLoadingSpinner, settings]
  );
}
