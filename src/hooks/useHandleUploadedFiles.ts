import { LataaTiedostoResult, lataaTiedostot } from "../util/fileUtil";
import { FieldArrayPath, FieldArrayPathValue, FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form";
import useApi from "src/hooks/useApi";
import useSnackbars from "src/hooks/useSnackbars";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { useCallback } from "react";
import { FileSizeExceededLimitError, FileTypeNotAllowedError } from "common/error";
import { ShowMessage } from "@components/HassuSnackbarProvider";
import { API } from "@services/api/commonApi";
import { KunnallinenLadattuTiedostoInput, LadattuTiedostoNew, LadattuTiedostoTila } from "@services/api";
import { uuid } from "common/util/uuid";
import { LadattuTiedostoInputWithTuotu } from "@components/projekti/lausuntopyynnot/types";

export const mapUploadedFileToKunnallinenLadattuTiedostoInput =
  (kunta: number) =>
  (file: LataaTiedostoResult): KunnallinenLadattuTiedostoInput => ({
    kunta,
    nimi: file.name,
    uuid: uuid.v4(),
    tiedosto: file.path,
  });

export const mapUploadedFileToLadattuTiedostoInputNew = (file: LataaTiedostoResult): LadattuTiedostoNew => ({
  nimi: file.name,
  uuid: uuid.v4(),
  tiedosto: file.path,
  koko: file.size,
  __typename: "LadattuTiedostoNew",
});

export const mapUploadedFileToLadattuTiedostoInputWithTuotu = (file: LataaTiedostoResult): LadattuTiedostoInputWithTuotu => ({
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
  mapUploadedFileToFormValue: (jotain: LataaTiedostoResult) => TFieldArray,
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

async function tryFilelistUpload(api: API, files: FileList, showErrorMessage: ShowMessage): Promise<LataaTiedostoResult[] | undefined> {
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
