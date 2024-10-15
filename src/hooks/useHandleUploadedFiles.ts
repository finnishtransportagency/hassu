import { lataaTiedostot } from "../util/fileUtil";
import { FieldArrayPath, FieldArrayPathValue, FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form";
import useApi from "src/hooks/useApi";
import useSnackbars from "src/hooks/useSnackbars";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { useCallback } from "react";
import { FileSizeExceededLimitError, FileTypeNotAllowedError } from "common/error";
import { ShowMessage } from "@components/HassuSnackbarProvider";
import { API } from "@services/api/commonApi";
import { KunnallinenLadattuTiedostoInput, LadattuTiedostoInputNew, LadattuTiedostoTila } from "@services/api";
import { uuid } from "common/util/uuid";
import { LadattuTiedostoInputWithTuotu } from "@components/projekti/lausuntopyynnot/types";

export const mapUploadedFileToKunnallinenLadattuTiedostoInput =
  (kunta: number) =>
  (file: { path: string; name: string }): KunnallinenLadattuTiedostoInput => ({
    kunta,
    nimi: file.name,
    uuid: uuid.v4(),
    tiedosto: file.path,
  });

export const mapUploadedFileToLadattuTiedostoInputNew = (file: { path: string; name: string }): LadattuTiedostoInputNew => ({
  nimi: file.name,
  uuid: uuid.v4(),
  tiedosto: file.path,
});

export const mapUploadedFileToLadattuTiedostoInputWithTuotu = (file: { path: string; name: string }): LadattuTiedostoInputWithTuotu => ({
  nimi: file.name,
  uuid: uuid.v4(),
  tiedosto: file.path,
  tila: LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
});

export default function useHandleUploadedFiles<
  TFieldValues extends FieldValues = FieldValues,
  TFieldArrayName extends FieldArrayPath<TFieldValues> & Path<TFieldValues> = FieldArrayPath<TFieldValues> & Path<TFieldValues>,
  TFieldArray extends FieldArrayPathValue<TFieldValues, TFieldArrayName> extends ReadonlyArray<infer U> | null | undefined
    ? U
    : never = FieldArrayPathValue<TFieldValues, TFieldArrayName> extends ReadonlyArray<infer U> | null | undefined ? U : never
>(
  { watch, setValue }: UseFormReturn<TFieldValues>,
  keyToLadatutTiedostot: TFieldArrayName,
  mapUploadedFileToFormValue: (jotain: { name: string; path: string }) => TFieldArray,
  allowOnlyOne?: boolean
) {
  const ladatutTiedostot: TFieldArray[] = watch(keyToLadatutTiedostot);

  const { withLoadingSpinner } = useLoadingSpinner();
  const { showErrorMessage } = useSnackbars();
  const api = useApi();

  return useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): Promise<void> =>
      withLoadingSpinner(
        (async () => {
          const files: FileList | null = event.target.files;

          if (!files?.length) {
            return;
          }

          const uploadedFiles = await tryFilelistUpload(api, files, showErrorMessage);

          if (!uploadedFiles?.length) {
            return;
          }

          const tiedostoInputs = uploadedFiles.map(mapUploadedFileToFormValue);
          const oldFiles = ladatutTiedostot ?? [];
          const newValue = allowOnlyOne ? tiedostoInputs : oldFiles.concat(tiedostoInputs);
          setValue(keyToLadatutTiedostot, newValue as PathValue<TFieldValues, Path<TFieldValues>>, {
            shouldDirty: true,
          });
        })()
      ),
    [withLoadingSpinner, api, showErrorMessage, mapUploadedFileToFormValue, ladatutTiedostot, allowOnlyOne, setValue, keyToLadatutTiedostot]
  );
}

async function tryFilelistUpload(api: API, files: FileList, showErrorMessage: ShowMessage) {
  try {
    return await lataaTiedostot(api, files);
  } catch (e) {
    if (e instanceof FileSizeExceededLimitError) {
      const filename = e.file?.name;
      const oneOfFiles = filename ? "Tiedosto '" + filename + "'" : "Yksi tiedostoista";
      showErrorMessage(`${oneOfFiles} ylittää 25 Mt maksimikoon.`);
    } else if (e instanceof FileTypeNotAllowedError) {
      const filename = e.file?.name;
      const oneOfFiles = filename ? "Tiedosto '" + filename + "'" : "Yksi tiedostoista";
      showErrorMessage(`${oneOfFiles} on väärää tiedostotyyppiä. Sallitut tyypit: pdf, jpg, png, doc, docx ja txt.`);
    } else {
      throw e;
    }
  }
}
