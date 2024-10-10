import { ReactElement, useCallback, useState } from "react";
import Button from "@components/button/Button";
import { AineistoNew } from "@services/api";
import { useFieldArray, useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { H5 } from "@components/Headings";
import { getNewAineistot } from "../../../util/hyvaksymisesitys/getNewAineistot";
import { adaptVelhoAineistoToAineistoInputNew } from "../../../util/hyvaksymisesitys/adaptVelhoAineistoToAineistoInputNew";
import TiedostoInputNewTable from "./TiedostoInputNewTable";
import { HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";

export default function MuuAineistoVelhosta({ aineisto, ennakkoneuvottelu }: { aineisto?: AineistoNew[] | null, ennakkoneuvottelu?: boolean }): ReactElement {
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const { control, register } = useFormContext<HyvaksymisEsitysForm>();
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
      <p>Voit halutessasi liittää { ennakkoneuvottelu ? "enakkoneuvotteluun" : "hyväksymisesitykseen" } Projektivelhosta muuta lisäaineistoa, kuten kansiot D–E tai 500–600.</p>
      {!!fields?.length && (
        <TiedostoInputNewTable
          id="muu_aineisto_velhosta_table"
          tiedostot={aineisto}
          remove={remove}
          fields={fields}
          move={move}
          registerDokumenttiOid={registerDokumenttiOid}
          registerNimi={registerNimi}
          showTuotu
        />
      )}
      <Button type="button" id="muu_aineisto_velhosta_import_button" onClick={() => setAineistoDialogOpen(true)}>
        Tuo aineistot
      </Button>
      <AineistojenValitseminenDialog
        open={aineistoDialogOpen}
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
