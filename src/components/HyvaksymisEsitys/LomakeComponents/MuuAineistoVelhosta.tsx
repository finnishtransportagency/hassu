import { ReactElement, useState } from "react";
import Button from "@components/button/Button";
import { AineistoInputNew, TallennaHyvaksymisEsitysInput, VelhoAineisto } from "@services/api";
import { useFieldArray, useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { uuid } from "common/util/uuid";
import IconButton from "@components/button/IconButton";
import { H5 } from "@components/Headings";

export default function MuuAineistoVelhosta(): ReactElement {
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const { control } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const { fields, remove, prepend } = useFieldArray({ name: "muokattavaHyvaksymisEsitys.muuAineistoVelhosta", control });

  return (
    <SectionContent>
      <H5 variant="h4">Projektivelho</H5>
      <p>Voit halutessasi liittää hyväksymisesitykseen Projektivelhosta muuta lisäaineistoa, kuten kansiot D-E tai 500-600.</p>
      {fields.map((aineisto) => (
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

/**
 *
 * @param oldAineisto aineistot, jotka oli valittu jo ennestään
 * @param valitutAineistot juuri äskettäin valitut aineistot
 * @returns valitutAineistot, mutta poistettu ne, jotka oli jo valittu
 */
function getNewAineistot(
  oldAineisto: AineistoInputNew[] | undefined | null,
  valitutAineistot: AineistoInputNew[] | undefined | null
): AineistoInputNew[] {
  const dokumenttiOids = (oldAineisto ?? []).map((aineisto) => aineisto.dokumenttiOid);
  return (valitutAineistot ?? []).filter((aineisto) => !dokumenttiOids.includes(aineisto.dokumenttiOid));
}

function adaptVelhoAineistoToAineistoInputNew(velhoAineisto: VelhoAineisto): AineistoInputNew {
  const { oid, tiedosto } = velhoAineisto;
  return {
    dokumenttiOid: oid,
    nimi: tiedosto,
    uuid: uuid.v4(),
  };
}
