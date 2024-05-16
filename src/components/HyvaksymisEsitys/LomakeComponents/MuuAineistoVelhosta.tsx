import { ReactElement, useState } from "react";
import Button from "@components/button/Button";
import { AineistoInputNew, TallennaHyvaksymisEsitysInput, VelhoAineisto } from "@services/api";
import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { uuid } from "common/util/uuid";

export default function MuuAineistoVelhosta(): ReactElement {
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const { watch, setValue } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const muuAineistoVelhosta = watch(`muokattavaHyvaksymisEsitys.muuAineistoVelhosta`);

  return (
    <SectionContent>
      <h4 className="vayla-small-title">Projektivelho</h4>
      <p>Voit halutessasi liittää...</p>
      {!!muuAineistoVelhosta?.length && muuAineistoVelhosta.map((aineisto, index) => <div key={index}>{aineisto.nimi}</div>)}
      <Button type="button" id={"aineisto_nahtavilla_import_button"} onClick={() => setAineistoDialogOpen(true)}>
        Tuo aineistot
      </Button>
      <AineistojenValitseminenDialog
        open={aineistoDialogOpen}
        infoText={"TODO aseta info text"}
        onClose={() => setAineistoDialogOpen(false)}
        onSubmit={(valitutVelhoAineistot) => {
          const valitutAineistot = valitutVelhoAineistot.map(adaptVelhoAineistoToAineistoInputNew);
          const newAineisto = adaptAineistot(muuAineistoVelhosta, valitutAineistot);
          setValue("muokattavaHyvaksymisEsitys.muuAineistoVelhosta", newAineisto, { shouldDirty: true });
        }}
      />
    </SectionContent>
  );
}

/**
 *
 * @param oldAineisto aineistot, jotka oli valittu jo ennestään
 * @param valitutAineistot juuri äskettäin valitut aineistot
 * @returns Yhdistetty oldAineisto ja valitutAineistot siten, että jos ne jakoivat samoja dokumenttiOid:eja, vain uusi valittu aineisto otetaan mukaan
 */
function adaptAineistot(
  oldAineisto: AineistoInputNew[] | undefined | null,
  valitutAineistot: AineistoInputNew[] | undefined | null
): AineistoInputNew[] {
  const combinedWithDuplicates = [...(valitutAineistot ?? []), ...(oldAineisto ?? [])];
  const dokumenttiOids = combinedWithDuplicates.map((aineisto) => aineisto.dokumenttiOid);
  const combinedWithoutDuplicates = combinedWithDuplicates.filter(
    (aineisto, index) => dokumenttiOids.indexOf(aineisto.dokumenttiOid) == index
  );
  return combinedWithoutDuplicates;
}

function adaptVelhoAineistoToAineistoInputNew(velhoAineisto: VelhoAineisto): AineistoInputNew {
  const { oid, tiedosto } = velhoAineisto;
  return {
    dokumenttiOid: oid,
    nimi: tiedosto,
    uuid: uuid.v4(),
  };
}
