import { Key, ReactElement, useState } from "react";
import Button from "@components/button/Button";
import { useFormContext } from "react-hook-form";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { H3, H4 } from "@components/Headings";
import { HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";
import { aineistoKategoriat, getNestedAineistoMaaraForCategory, kategorisoimattomatId } from "common/aineistoKategoriat";
import HassuAccordion from "@components/HassuAccordion";
import { findKategoriaForVelhoAineistoNew, getInitialExpandedAineisto } from "@components/projekti/common/Aineistot/util";
import { AccordionToggleButton } from "@components/projekti/common/Aineistot/AccordionToggleButton";
import useTranslation from "next-translate/useTranslation";
import SectionContent from "@components/layout/SectionContent";
import { SuunnitelmaAineistoPaakategoriaContent } from "@components/projekti/common/Aineistot/AineistoNewTable";
import { AineistoInputNew, AineistoNew } from "@services/api";
import find from "lodash/find";
import remove from "lodash/remove";

type Props = {
  aineisto: AineistoNew[] | null | undefined;
};

export default function Suunnitelma(props: Readonly<Props>): ReactElement {
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const { watch, setValue } = useFormContext<HyvaksymisEsitysForm>();
  const suunnitelma = watch("muokattavaHyvaksymisEsitys.suunnitelma");
  const { t } = useTranslation("aineisto");
  const suunnitelmaFlat = Object.values(suunnitelma).flat();

  const [expandedAineisto, setExpandedAineisto] = useState<Key[]>(getInitialExpandedAineisto(suunnitelma));

  return (
    <>
      <H4 variant="h3">Suunnitelma</H4>
      <p>
        Tuo Projektivelhosta suunnitelman kansiot A–C tai 100–300. Suunnitelma jaotellaan automaattisesti selostusosaan, pääpiirustuksiin ja
        informatiivisiin aineistoihin sekä näiden alikansioihin. Aineistoja on mahdollista järjestellä, siirtää alikansioista toiseen tai
        poistaa.
      </p>
      <AccordionToggleButton expandedAineisto={expandedAineisto} setExpandedAineisto={setExpandedAineisto} />
      <HassuAccordion
        expandedstate={[expandedAineisto, setExpandedAineisto]}
        items={aineistoKategoriat.listKategoriat(true).map((paakategoria) => ({
          title: (
            <H3 className="mb-0">{`${t(`aineisto-kategoria-nimi.${paakategoria.id}`)} (${getNestedAineistoMaaraForCategory(
              suunnitelmaFlat,
              paakategoria
            )})`}</H3>
          ),
          content: (
            <SectionContent largeGaps>
              <SuunnitelmaAineistoPaakategoriaContent
                aineisto={props.aineisto}
                paakategoria={paakategoria}
                expandedAineistoState={[expandedAineisto, setExpandedAineisto]}
              />
            </SectionContent>
          ),
          id: paakategoria.id,
        }))}
      />
      <Button type="button" id="muu_aineisto_velhosta_import_button" onClick={() => setAineistoDialogOpen(true)}>
        Tuo aineistot
      </Button>
      <AineistojenValitseminenDialog
        open={aineistoDialogOpen}
        onClose={() => setAineistoDialogOpen(false)}
        onSubmit={(valitutVelhoAineistot) => {
          const newAineisto = findKategoriaForVelhoAineistoNew(valitutVelhoAineistot);
          const uusiAineistoNahtavilla = combineOldAndNewAineistoWithCategories({
            oldAineisto: suunnitelma,
            newAineisto,
          });
          setValue("muokattavaHyvaksymisEsitys.suunnitelma", uusiAineistoNahtavilla.aineisto);
          uusiAineistoNahtavilla.kategoriasWithChanges.forEach((kategoria) => {
            setValue(`muokattavaHyvaksymisEsitys.suunnitelma.${kategoria}`, uusiAineistoNahtavilla.aineisto[kategoria]);
          });
        }}
      />
    </>
  );
}

export const combineOldAndNewAineistoWithCategories = ({
  oldAineisto,
  newAineisto,
}: {
  oldAineisto: {
    [kategoriaId: string]: AineistoInputNew[];
  };
  newAineisto: AineistoInputNew[];
}) =>
  newAineisto.reduce<{
    aineisto: {
      [kategoriaId: string]: AineistoInputNew[];
    };
    kategoriasWithChanges: string[];
  }>(
    (acc, velhoAineisto) => {
      const existingAineisto = find(Object.values(acc.aineisto).flat(), { dokumenttiOid: velhoAineisto.dokumenttiOid });
      const kategoriaId = (existingAineisto ? existingAineisto.kategoriaId : velhoAineisto.kategoriaId) ?? kategorisoimattomatId;
      if (!acc.kategoriasWithChanges.includes(kategoriaId)) {
        acc.kategoriasWithChanges.push(kategoriaId);
      }
      if (existingAineisto?.kategoriaId) {
        remove(acc.aineisto[existingAineisto.kategoriaId], { dokumenttiOid: velhoAineisto.dokumenttiOid });
      }
      acc.aineisto[kategoriaId].push(velhoAineisto);
      return acc;
    },
    { aineisto: oldAineisto, kategoriasWithChanges: [] }
  );
