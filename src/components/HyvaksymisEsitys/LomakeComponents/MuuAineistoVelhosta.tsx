import { ReactElement, useCallback, useState } from "react";
import Button from "@components/button/Button";
import { AineistoNew, TallennaHyvaksymisEsitysInput } from "@services/api";
import { useFieldArray, useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { H5 } from "@components/Headings";
import { getNewAineistot } from "../../../util/hyvaksymisesitys/getNewAineistot";
import { adaptVelhoAineistoToAineistoInputNew } from "../../../util/hyvaksymisesitys/adaptVelhoAineistoToAineistoInputNew";
import AineistoNewInputTable from "./AineistoNewInputTable";

export default function MuuAineistoVelhosta({ aineisto }: { aineisto?: AineistoNew[] | null }): ReactElement {
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const { control, register } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const { fields, remove, prepend, move } = useFieldArray({ name: "muokattavaHyvaksymisEsitys.muuAineistoVelhosta", control });

  const registerDokumenttiOid = useCallback(
    (index: number) => {
      return register(`muokattavaHyvaksymisEsitys.muuAineistoVelhosta.${index}.dokumenttiOid`);
    },
    [register]
  );

  const registerNimi = useCallback(
    (index: number) => {
      return register(`muokattavaHyvaksymisEsitys.muuAineistoVelhosta.${index}.nimi`);
    },
    [register]
  );

  return (
    <SectionContent>
      <H5 variant="h4">Projektivelho</H5>
      <p>Voit halutessasi liittää hyväksymisesitykseen Projektivelhosta muuta lisäaineistoa, kuten kansiot D–E tai 500–600.</p>
      <AineistoNewInputTable
        tiedostot={aineisto}
        remove={remove}
        fields={fields}
        move={move}
        registerDokumenttiOid={registerDokumenttiOid}
        registerNimi={registerNimi}
      />
      <Button type="button" id="muu_aineisto_velhosta_import_button" onClick={() => setAineistoDialogOpen(true)}>
        Tuo aineistot
      </Button>
      <AineistojenValitseminenDialog
        open={aineistoDialogOpen}
        infoText="TODO aseta info text"
        onClose={() => setAineistoDialogOpen(false)}
        onSubmit={(valitutVelhoAineistot) => {
          const valitutAineistot = valitutVelhoAineistot.map(adaptVelhoAineistoToAineistoInputNew);
          const newAineisto = getNewAineistot(fields, valitutAineistot);
          prepend(newAineisto);
        }}
      />
    </SectionContent>
  );
}
