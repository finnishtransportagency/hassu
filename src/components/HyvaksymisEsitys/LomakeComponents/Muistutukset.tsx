import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import { H5, H6 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { allowedFileTypes } from "common/fileValidationSettings";
import { kuntametadata } from "common/kuntametadata";
import { ReactElement, useRef } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import useHandleUploadedFiles from "src/hooks/useHandleUploadedFiles";

export default function Muistutukset({ kunnat }: Readonly<{ kunnat: number[] | null | undefined }>): ReactElement {
  return (
    <SectionContent>
      <H5 variant="h4">Muistutukset</H5>
      {kunnat?.length ? kunnat.map((kunta) => <KunnanMuistutukset key={kunta} kunta={kunta} />) : "Kunnat puuttuu"}
    </SectionContent>
  );
}

function KunnanMuistutukset({ kunta }: Readonly<{ kunta: number }>): ReactElement {
  const hiddenInputRef = useRef<HTMLInputElement | null>();
  const { control } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const { remove, fields } = useFieldArray({ name: "muokattavaHyvaksymisEsitys.muistutukset", control });
  const kunnanMuistutukset = fields?.filter((m) => m.kunta == kunta);

  const handleUploadedFiles = useHandleUploadedFiles("muokattavaHyvaksymisEsitys.muistutukset", { kunta });

  const onButtonClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };

  return (
    <SectionContent>
      <H6>{kuntametadata.nameForKuntaId(kunta, "fi")}</H6>
      {!!kunnanMuistutukset?.length &&
        kunnanMuistutukset.map((aineisto) => (
          <div key={aineisto.id}>
            {aineisto.nimi}
            <IconButton
              type="button"
              onClick={() => {
                remove(fields.indexOf(aineisto));
              }}
              icon="trash"
            />
          </div>
        ))}
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
