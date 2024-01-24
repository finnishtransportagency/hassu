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
import { allowedUploadFileTypes } from "hassu-common/allowedUploadFileTypes";
import { getLadatutTiedostotSchema } from "../../../../../schemas/common";
import { ValidationError } from "yup";
import { log } from "../../../../../../backend/src/logger";

export default function LisaAineistot({ index, projekti }: Readonly<{ index: number; projekti: ProjektiLisatiedolla }>) {
  const { watch, setValue, setError } = useFormContext<LausuntoPyynnotFormValues>();

  const lausuntoPyynto = watch(`lausuntoPyynnot.${index}`);
  const lisaAineistot = watch(`lausuntoPyynnot.${index}.lisaAineistot`);

  const { withLoadingSpinner } = useLoadingSpinner();

  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  const handleUploadedFiles = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      withLoadingSpinner(
        (async () => {
          const files: FileList | null = event.target.files;
          if (files?.length) {
            const uploadedFiles: string[] = await Promise.all(
              Array.from(Array(files.length).keys()).map(async (key: number) => {
                console.log("index " + index);
                console.log("key " + key);
                console.log(files[key].name);

                if (allowedUploadFileTypes.find((i) => i === files[key].type)) {
                  const a = await lataaTiedosto(api, files[key]);
                  console.log(files[key]);
                  return a;
                }
                console.log("setting errro to:" + key);
                setError(`lausuntoPyynnot.${index}.lisaAineistot.${key}`, { message: "EROEROEOROE" });
                return "HUONO";
              })
            );

            uploadedFiles.forEach((u) => console.log(u));
            const tiedostoInputs: LadattuTiedostoInput[] = uploadedFiles.map((filename, index) => ({
              nimi: files[index].name,
              tila: LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
              tiedosto: filename,
              uuid: uuid.v4(),
            }));

            console.log("uploadedFiles");
            console.log(uploadedFiles);

            console.log("lisaAineistot");
            console.log(lisaAineistot);

            console.log("tiedostoInputs");
            console.log(tiedostoInputs);
            try {
              getLadatutTiedostotSchema().validateSync(tiedostoInputs);
            } catch (e) {
              if (e instanceof ValidationError) {
                log.info("fggf puutteelliset", { e });
                return; // This is the final status
              } else {
                throw e;
              }
            }
            //getLadatutTiedostotSchema().validateSync(tiedostoInputs);
            //    setValue(`lausuntoPyynnot.${index}.lisaAineistot`, (lisaAineistot ?? []).concat(tiedostoInputs), { shouldDirty: true });
          }
        })()
      ),
    [index, lisaAineistot, setValue, withLoadingSpinner]
  );

  return (
    <SectionContent className="mt-16">
      <h4 className="vayla-small-title">Liitettävät lisäaineistot</h4>
      <p>
        Voit liittää asetettujen aineistojen lisäksi lausuntopyyntöön lisäaineistoa. Lausuntopyyntöön liitettävää lisäaineistoa ei julkaista
        palvelun kansalaispuolelle. Liitettyjen lisäaineistojen sisältö näkyy automaattisesti linkin takana, kun aineistot on tuotu tälle
        sivulle ja muutokset on tallennettu. Esikatselu-toiminnolla voit nähdä tallentamattomat lisäaineistomuutokset.
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
          Hae tiedostot
        </Button>
      </label>
    </SectionContent>
  );
}
