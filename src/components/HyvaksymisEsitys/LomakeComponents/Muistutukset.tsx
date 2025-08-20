import Button from "@components/button/Button";
import { H5, H6 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";
import { allowedFileTypes } from "common/fileValidationSettings";
import { kuntametadata } from "common/kuntametadata";
import { ReactElement, useCallback, useRef } from "react";
import { FieldErrors, useFieldArray, useFormContext } from "react-hook-form";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { EnnakkoneuvotteluForm, HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";
import TiedostoInputNewTable from "./TiedostoInputNewTable";
import { KunnallinenLadattuTiedosto } from "@services/api";

export default function Muistutukset({
  kunnat,
  tiedostot,
  ennakkoneuvottelu,
  errors,
}: Readonly<{
  kunnat: number[] | null | undefined;
  tiedostot?: KunnallinenLadattuTiedosto[] | null;
  ennakkoneuvottelu?: boolean;
  errors?: FieldErrors<EnnakkoneuvotteluForm>;
}>): ReactElement {
  return (
    <SectionContent>
      <H5 variant="h4">Muistutukset</H5>
      {kunnat?.length
        ? kunnat.map((kunta) => (
            <KunnanMuistutukset key={kunta} kunta={kunta} tiedostot={tiedostot} ennakkoneuvottelu={ennakkoneuvottelu} errors={errors} />
          ))
        : "Kunnat puuttuu"}
    </SectionContent>
  );
}

function KunnanMuistutukset({
  kunta,
  tiedostot,
  ennakkoneuvottelu,
  errors,
}: Readonly<{
  kunta: number;
  tiedostot?: KunnallinenLadattuTiedosto[] | null;
  ennakkoneuvottelu?: boolean;
  errors?: FieldErrors<EnnakkoneuvotteluForm>;
}>): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control, register } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const { remove, fields, move } = useFieldArray({
    name: `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.muistutukset.${kunta}`,
    control,
  });

  const handleUploadedFiles = useHandleUploadedFiles(
    `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.muistutukset.${kunta}`,
    { kunta }
  );

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  const registerNimi = useCallback(
    (index: number) => {
      return register(`${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.muistutukset.${kunta}.${index}.nimi`);
    },
    [register, kunta]
  );

  return (
    <SectionContent>
      <H6>{kuntametadata.nameForKuntaId(kunta, "fi")}</H6>
      {!!fields?.length && (
        <TiedostoInputNewTable
          id="lausunnot_files_table"
          tiedostot={tiedostot}
          remove={remove}
          fields={fields}
          move={move}
          registerNimi={registerNimi}
          ladattuTiedosto
          noHeaders
          showTuotu
        />
      )}
      <input
        type="file"
        multiple
        accept={allowedFileTypes.join(", ")}
        style={{ display: "none" }}
        id={`kunnan-${kunta}-muistutukset-input`}
        onChange={handleUploadedFiles}
        ref={(e) => {
          if (hiddenInputRef) {
            hiddenInputRef.current = e;
          }
        }}
      />
      {errors?.ennakkoNeuvottelu?.muistutukset && errors?.ennakkoNeuvottelu?.muistutukset[kunta]?.message && (
        <p className="text-red">{errors?.ennakkoNeuvottelu?.muistutukset[kunta]?.message}</p>
      )}
      <label htmlFor={`kunnan-${kunta}-muistutukset-input`}>
        <Button className="mt-4" type="button" id={`tuo_kunnan_${kunta}_muistutukset_button`} onClick={onButtonClick}>
          Tuo tiedostot
        </Button>
      </label>
    </SectionContent>
  );
}
