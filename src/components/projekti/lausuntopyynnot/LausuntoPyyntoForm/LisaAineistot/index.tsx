import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import Button from "@components/button/Button";
import LisaAineistotTable from "./Table";
import { useCallback, useRef } from "react";
import { lataaTiedosto } from "src/util/fileUtil";
import { LadattuTiedostoInput, LadattuTiedostoTila, api } from "@services/api";
import { LausuntoPyynnotFormValues } from "../../types";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { uuid } from "common/util/uuid";

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
  const handleUploadedFiles = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      withLoadingSpinner(
        (async () => {
          const files: FileList | null = event.target.files;
          if (files?.length) {
            const uploadedFiles: string[] = await Promise.all(
              Array.from(Array(files.length).keys()).map((key: number) => lataaTiedosto(api, files[key]))
            );
            const tiedostoInputs: LadattuTiedostoInput[] = uploadedFiles.map((filename, index) => ({
              nimi: files[index].name,
              tila: LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
              tiedosto: filename,
              uuid: uuid.v4(),
            }));
            setValue(`lausuntoPyynnot.${index}.lisaAineistot`, (lisaAineistot ?? []).concat(tiedostoInputs), { shouldDirty: true });
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
        accept="*/*"
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
