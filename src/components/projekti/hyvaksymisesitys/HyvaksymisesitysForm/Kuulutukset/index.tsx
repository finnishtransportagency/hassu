import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import Button from "@components/button/Button";
import LisaAineistotTable from "./Table";
import React, { useCallback, useRef } from "react";
import { lataaTiedosto } from "src/util/fileUtil";
import { LadattuTiedostoInput, LadattuTiedostoTila, api } from "@services/api";
import { HyvaksymisesitysFormValues } from "../../types";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { uuid } from "common/util/uuid";
import { allowedUploadFileTypes } from "hassu-common/allowedUploadFileTypes";
import useSnackbars from "../../../../../hooks/useSnackbars";

export default function LisaAineistot({ index, projekti }: Readonly<{ index: number; projekti: ProjektiLisatiedolla }>) {
  const { watch, setValue } = useFormContext<HyvaksymisesitysFormValues>();

  const hyvaksymisesitys = watch(`hyvaksymisesitykset.${index}`);
  const kuulutukset = watch(`hyvaksymisesitykset.${index}.kuulutuksetJaKutsu`);

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
            const allowedTypeFiles: File[] = [];
            const uploadedFileNamesPromises: Promise<string>[] = [];

            Array.from(Array(files.length).keys()).forEach((key: number) => {
              if (allowedUploadFileTypes.find((type) => type === files[key].type)) {
                uploadedFileNamesPromises.push(lataaTiedosto(api, files[key]));
                allowedTypeFiles.push(files[key]);
              } else {
                nonAllowedTypeFiles.push(files[key]);
              }
            });

            const uploadedFileNames: string[] = await Promise.all(uploadedFileNamesPromises);

            const tiedostoInputs: LadattuTiedostoInput[] = uploadedFileNames.map((filename, index) => ({
              nimi: allowedTypeFiles[index].name,
              tila: LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
              tiedosto: filename,
              uuid: uuid.v4(),
            }));

            setValue(`hyvaksymisesitykset.${index}.kuulutuksetJaKutsu`, (kuulutukset ?? []).concat(tiedostoInputs), { shouldDirty: true });

            if (nonAllowedTypeFiles.length) {
              const nonAllowedTypeFileNames = nonAllowedTypeFiles.map((f) => f.name);
              showErrorMessage("Väärä tiedostotyyppi: " + nonAllowedTypeFileNames + ". Sallitut tyypit JPG, PNG, PDF ja MS Word.");
            }
          }
        })()
      ),
    [index, kuulutukset, setValue, showErrorMessage, withLoadingSpinner]
  );

  return (
    <SectionContent className="mt-16">
      <h4 className="vayla-small-title">Kuulutukset ja kutsu vuorovaikutukseen</h4>
      <p>Järjestelmä on tuonut alle automaattisesti kuulutukset ja kutsun vuorovaikutukseen.</p>
      {!!hyvaksymisesitys?.kuulutuksetJaKutsu?.length && (
        <LisaAineistotTable
          joTallennetutKuulutukset={projekti.hyvaksymisEsitys?.kuulutuksetJaKutsu ?? []}
          hyvaksymisesitysIndex={index}
        />
      )}
      <input
        type="file"
        multiple
        accept={allowedUploadFileTypes.join(", ")}
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
          Tuo tiedostot
        </Button>
      </label>
    </SectionContent>
  );
}
