import { Key, ReactElement, useState } from "react";
import Button from "@components/button/Button";
import { useFormContext } from "react-hook-form";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { H3, H4 } from "@components/Headings";
import { HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";
import { AineistoKategoriat, getNestedAineistoMaaraForCategory, kategorisoimattomatId } from "common/aineistoKategoriat";
import HassuAccordion from "@components/HassuAccordion";
import { findKategoriaForVelhoAineistoNew, FormAineistoNew, getInitialExpandedAineisto } from "@components/projekti/common/Aineistot/util";
import { AccordionToggleButton } from "@components/projekti/common/Aineistot/AccordionToggleButton";
import useTranslation from "next-translate/useTranslation";
import SectionContent from "@components/layout/SectionContent";
import { SuunnitelmaAineistoPaakategoriaContent } from "@components/projekti/common/Aineistot/AineistoNewTable";
import find from "lodash/find";
import remove from "lodash/remove";
import { EnnakkoneuvotteluForm } from "@pages/yllapito/projekti/[oid]/ennakkoneuvottelu";

type Props = {
  aineistoKategoriat: AineistoKategoriat;
  ennakkoneuvottelu?: boolean;
};

export default function Suunnitelma({ aineistoKategoriat, ennakkoneuvottelu }: Readonly<Props>): ReactElement {
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const { watch, setValue } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const suunnitelma = watch(ennakkoneuvottelu ? "ennakkoNeuvottelu.suunnitelma" : "muokattavaHyvaksymisEsitys.suunnitelma");
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
      <AccordionToggleButton
        aineistoKategoriaIds={aineistoKategoriat.listKategoriaIds()}
        expandedAineisto={expandedAineisto}
        setExpandedAineisto={setExpandedAineisto}
      />
      <HassuAccordion
        expandedstate={[expandedAineisto, setExpandedAineisto]}
        items={aineistoKategoriat.listKategoriat().map((paakategoria) => ({
          title: (
            <H3 className="mb-0">{`${t(`aineisto-kategoria-nimi.${paakategoria.id}`)} (${getNestedAineistoMaaraForCategory(
              suunnitelmaFlat,
              paakategoria
            )})`}</H3>
          ),
          content: (
            <SectionContent largeGaps>
              <SuunnitelmaAineistoPaakategoriaContent
                aineistoKategoriat={aineistoKategoriat}
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
          const newAineisto = findKategoriaForVelhoAineistoNew(valitutVelhoAineistot, aineistoKategoriat);
          const uusiAineistoNahtavilla = combineOldAndNewAineistoWithCategories({
            oldAineisto: suunnitelma,
            newAineisto,
          });
          setValue(
            ennakkoneuvottelu ? "ennakkoNeuvottelu.suunnitelma" : "muokattavaHyvaksymisEsitys.suunnitelma",
            uusiAineistoNahtavilla.aineisto
          );
          uusiAineistoNahtavilla.kategoriasWithChanges.forEach((kategoria) => {
            setValue(
              `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.suunnitelma.${kategoria}`,
              uusiAineistoNahtavilla.aineisto[kategoria]
            );
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
    [kategoriaId: string]: FormAineistoNew[];
  };
  newAineisto: FormAineistoNew[];
}) =>
  newAineisto.reduce<{
    aineisto: {
      [kategoriaId: string]: FormAineistoNew[];
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
