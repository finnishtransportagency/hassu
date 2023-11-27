import { useFieldArray, useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import Button from "@components/button/Button";
import MuistutuksetTable from "./Table";
import { useCallback, useRef } from "react";
import { LadattuTiedostoInput, LadattuTiedostoTila, api } from "@services/api";
import { lataaTiedosto } from "src/util/fileUtil";
import { LausuntoPyynnonTaydennysFormValues, LausuntoPyynnonTaydennysLisakentilla } from "../../types";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { combineOldAndNewLadattuTiedosto } from "../../util";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";

export default function MuuAineisto({ index, projekti }: Readonly<{ index: number; projekti: ProjektiLisatiedolla }>) {
  const { watch, control, setValue } = useFormContext<LausuntoPyynnonTaydennysFormValues>();
  const { replace: replacePoistetutMuistutukset } = useFieldArray({
    control,
    name: `lausuntoPyynnonTaydennykset.${index}.poistetutMuuAineisto`,
  });
  const muistutukset = watch(`lausuntoPyynnonTaydennykset.${index}.muistutukset`);
  const poistetutMuistutukset = watch(`lausuntoPyynnonTaydennykset.${index}.poistetutMuistutukset`);
  const lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennysLisakentilla | undefined = watch(`lausuntoPyynnonTaydennykset.${index}`);
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
            }));
            const { poistetut, lisatyt } = combineOldAndNewLadattuTiedosto({
              oldTiedostot: muistutukset,
              oldPoistetut: poistetutMuistutukset,
              newTiedostot: tiedostoInputs,
            });
            replacePoistetutMuistutukset(poistetut);
            setValue(`lausuntoPyynnonTaydennykset.${index}.muistutukset`, lisatyt, { shouldDirty: true });
          }
        })()
      ),
    [index, muistutukset, poistetutMuistutukset, replacePoistetutMuistutukset, setValue, withLoadingSpinner]
  );
  return (
    <SectionContent className="mt-16">
      <h2 className="vayla-subtitle">Muistutukset</h2>
      <p>Tuo kuntaa koskevat muistutukset omalta koneeltasi.</p>
      {!!lausuntoPyynnonTaydennys?.muistutukset?.length && (
        <MuistutuksetTable lptIndex={index} joTallennetutMuistutukset={projekti.lausuntoPyynnonTaydennykset?.[index]?.muistutukset ?? []} />
      )}
      <input
        type="file"
        multiple
        accept="*/*"
        style={{ display: "none" }}
        id={`muistutukset-${index}-input`}
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      <label htmlFor={`muistutukset-${index}-input`}>
        <Button className="mt-4" type="button" id={`tuo_muistutukset_${index}_button`} onClick={onButtonClick}>
          Tuo muistutuksia
        </Button>
      </label>
    </SectionContent>
  );
}
