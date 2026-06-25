import { allowedFileTypesVirkamiehille, maxFileSize } from "common/fileValidationSettings";
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
            // Clear input value so onchange will trigger for the same file
            event.target.value = "";
          }
        })()
      ),
    [api, keyToLadatutTiedostot, ladatutTiedostot, setValue, showErrorMessage, withLoadingSpinner, settings]
  );
}
