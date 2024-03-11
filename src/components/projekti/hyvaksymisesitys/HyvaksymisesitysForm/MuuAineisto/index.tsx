import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import Button from "@components/button/Button";
import MuuAineistoTable from "./Table";
import { useCallback, useRef } from "react";
import { LadattuTiedostoInput, LadattuTiedostoTila, api } from "@services/api";
import { lataaTiedosto } from "src/util/fileUtil";
import { HyvaksymisesitysFormValues, HyvaksymisesitysLisakentilla } from "../../types";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { uuid } from "common/util/uuid";

export default function MuuAineisto({ index, projekti }: Readonly<{ index: number; projekti: ProjektiLisatiedolla }>) {
  const { watch, setValue } = useFormContext<HyvaksymisesitysFormValues>();
  const muuAineisto = watch(`hyvaksymisesitykset.${index}.muuAineistoLadattu`);
  const hyvaksymisesitys: HyvaksymisesitysLisakentilla | undefined = watch(`hyvaksymisesitykset.${index}`);
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
              Array.from(Array(files.length).keys()).map((key: number) => lataaTiedosto(api, files[key]))
            );
            const tiedostoInputs: LadattuTiedostoInput[] = uploadedFiles.map((filename, index) => ({
              nimi: files[index].name,
              tila: LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
              tiedosto: filename,
              uuid: uuid.v4(),
            }));
            setValue(`hyvaksymisesitykset.${index}.muuAineistoLadattu`, (muuAineisto ?? []).concat(tiedostoInputs), { shouldDirty: true });
          }
        })()
      ),
    [index, muuAineisto, setValue, withLoadingSpinner]
  );
  return (
    <SectionContent className="mt-16">
      <h2 className="vayla-subtitle">Muu aineisto</h2>
      <p>
        Voit halutessasi liittää omalta koneelta lausuntopyynnön täydennyksen yhteydessä muuta lisäaineistoa, esimerkiksi
        lyhennelmätiedoston.
      </p>
      {!!hyvaksymisesitys?.muuAineistoLadattu?.length && (
        <MuuAineistoTable hyvaksymisesitysIndex={index} joTallennetutMuuAineisto={projekti.hyvaksymisesitys?.[index]?.muuAineistoLadattu ?? []} />
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
