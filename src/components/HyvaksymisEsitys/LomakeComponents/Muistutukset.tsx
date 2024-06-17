import Button from "@components/button/Button";
import { H5, H6 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";
import { allowedFileTypes } from "common/fileValidationSettings";
import { kuntametadata } from "common/kuntametadata";
import { ReactElement, useCallback, useRef } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";
import { FormMuistutukset, HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";
import TiedostoInputNewTable from "./TiedostoInputNewTable";
import { KunnallinenLadattuTiedostoInput } from "@services/api";

/**
 * Käytetään hyväksy defaultValuesia laskettaessa syntynyttä muistutukset-arvoa, jossa
 * muistutukset on jaettu kunnittain.
 */
export default function Muistutukset({
  kunnat,
  muistutuksetSorted,
}: Readonly<{ kunnat: number[] | null | undefined; muistutuksetSorted: FormMuistutukset }>): ReactElement {
  return (
    <SectionContent>
      <H5 variant="h4">Muistutukset</H5>
      {kunnat?.length
        ? kunnat.map((kunta) => <KunnanMuistutukset key={kunta} kunta={kunta} tiedostot={muistutuksetSorted[kunta]} />)
        : "Kunnat puuttuu"}
    </SectionContent>
  );
}

/**
 * Käytetään hyväksy defaultValuesia laskettaessa syntynyttä muistutukset-arvoa, jossa
 * muistutukset on jaettu kunnittain. Kunta-avaimen alla olevat arvot injektoidaan tälle komponentille.
 */
function KunnanMuistutukset({
  kunta,
  tiedostot,
}: Readonly<{ kunta: number; tiedostot?: KunnallinenLadattuTiedostoInput[] | null }>): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control, register } = useFormContext<HyvaksymisEsitysForm>();
  const { remove, fields, move } = useFieldArray({ name: `muokattavaHyvaksymisEsitys.muistutukset.${kunta}`, control });

  const handleUploadedFiles = useHandleUploadedFiles(`muokattavaHyvaksymisEsitys.muistutukset.${kunta}`, { kunta });

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  const registerNimi = useCallback(
    (index: number) => {
      return register(`muokattavaHyvaksymisEsitys.muistutukset.${kunta}.${index}.nimi`);
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
      <label htmlFor={`kunnan-${kunta}-muistutukset-input`}>
        <Button className="mt-4" type="button" id={`tuo_kunnan_${kunta}_muistutukset_button`} onClick={onButtonClick}>
          Tuo tiedostot
        </Button>
      </label>
    </SectionContent>
  );
}
