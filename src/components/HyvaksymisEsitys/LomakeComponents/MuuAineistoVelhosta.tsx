import { ReactElement, useCallback, useState } from "react";
import Button from "@components/button/Button";
import { AineistoNew } from "@services/api";
import { FieldErrors, useFieldArray, useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { H5 } from "@components/Headings";
import { getNewAineistot } from "../../../util/hyvaksymisesitys/getNewAineistot";
import { adaptVelhoAineistoToAineistoInputNew } from "../../../util/hyvaksymisesitys/adaptVelhoAineistoToAineistoInputNew";
import TiedostoInputNewTable from "./TiedostoInputNewTable";
import { EnnakkoneuvotteluForm, HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";

export default function MuuAineistoVelhosta({
  aineisto,
  errors,
  ennakkoneuvottelu,
}: Readonly<{
  aineisto?: AineistoNew[] | null;
  errors?: FieldErrors<EnnakkoneuvotteluForm>;
  ennakkoneuvottelu?: boolean;
}>): ReactElement {
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const { control, register } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const { fields, remove, prepend, move } = useFieldArray({
    name: `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.muuAineistoVelhosta`,
    control,
  });

  const registerDokumenttiOid = useCallback(
    (index: number) => {
      return register(
        `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.muuAineistoVelhosta.${index}.dokumenttiOid`
      );
    },
    [register]
  );

  const registerNimi = useCallback(
    (index: number) => {
      return register(`${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.muuAineistoVelhosta.${index}.nimi`);
    },
    [register]
  );

  return (
    <SectionContent>
      <H5 variant="h4">Projektivelho</H5>
      <p>
        Voit halutessasi {ennakkoneuvottelu ? "tuoda" : "liittää hyväksymisesitykseen"} Projektivelhosta muuta lisäaineistoa.
      </p>
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
      {errors?.ennakkoNeuvottelu?.muuAineistoVelhosta && <p className="text-red">{errors?.ennakkoNeuvottelu?.muuAineistoVelhosta.message}</p>}
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
