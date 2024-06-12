import Button from "@components/button/Button";
import HassuAccordion from "@components/HassuAccordion";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { HyvaksymisPaatosVaihe } from "@services/api";
import { aineistoKategoriat, getNestedAineistoMaaraForCategory, kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import React, { Key, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  combineOldAndNewAineistoWithCategories,
  findKategoriaForVelhoAineisto,
  getInitialExpandedAineisto,
} from "@components/projekti/common/Aineistot/util";
import { SuunnitelmaAineistoPaakategoriaContent } from "@components/projekti/common/Aineistot/AineistoTable";
import { AccordionToggleButton } from "@components/projekti/common/Aineistot/AccordionToggleButton";
import { HyvaksymisPaatosVaiheAineistotFormValues } from ".";

export interface AineistoLomakeProps {
  dialogInfoText: string;
  sectionSubtitle?: string;
  vaihe: HyvaksymisPaatosVaihe | null | undefined;
}

export default function AineistoLomake({ dialogInfoText, sectionSubtitle, vaihe }: AineistoLomakeProps) {
  const { watch, setValue, getValues } = useFormContext<HyvaksymisPaatosVaiheAineistotFormValues>();
  const aineistoNahtavilla = watch("aineistoNahtavilla");
  const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla || {}).flat();
  const [expandedAineisto, setExpandedAineisto] = useState<Key[]>(getInitialExpandedAineisto(aineistoNahtavilla));

  const { t } = useTranslation("aineisto");

  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);

  return (
    <Section>
      {sectionSubtitle && <h4 className="vayla-small-title">{sectionSubtitle}</h4>}
      <AccordionToggleButton expandedAineisto={expandedAineisto} setExpandedAineisto={setExpandedAineisto} />
      <HassuAccordion
        expandedstate={[expandedAineisto, setExpandedAineisto]}
        items={aineistoKategoriat.listKategoriat(true).map((paakategoria) => ({
          title: (
            <span className="vayla-small-title">{`${t(`aineisto-kategoria-nimi.${paakategoria.id}`)} (${getNestedAineistoMaaraForCategory(
              aineistoNahtavillaFlat,
              paakategoria
            )})`}</span>
          ),
          content: (
            <SectionContent largeGaps>
              <SuunnitelmaAineistoPaakategoriaContent
                aineisto={vaihe?.aineistoNahtavilla}
                paakategoria={paakategoria}
                expandedAineistoState={[expandedAineisto, setExpandedAineisto]}
                dialogInfoText={dialogInfoText}
              />
            </SectionContent>
          ),
          id: paakategoria.id,
        }))}
      />
      <Button type="button" id={"aineisto_nahtavilla_import_button"} onClick={() => setAineistoDialogOpen(true)}>
        Tuo Aineistot
      </Button>
      <AineistojenValitseminenDialog
        open={aineistoDialogOpen}
        infoText={dialogInfoText}
        onClose={() => setAineistoDialogOpen(false)}
        onSubmit={(valitutVelhoAineistot) => {
          const newAineisto = findKategoriaForVelhoAineisto(valitutVelhoAineistot);
          const newAineistoNahtavilla = combineOldAndNewAineistoWithCategories({
            oldAineisto: aineistoNahtavilla,
            newAineisto,
          });
          setValue("aineistoNahtavilla", newAineistoNahtavilla, { shouldDirty: true });

          const kategorisoimattomat = getValues(`aineistoNahtavilla.${kategorisoimattomatId}`);

          if (kategorisoimattomat?.length && !expandedAineisto.includes(kategorisoimattomatId)) {
            setExpandedAineisto([...expandedAineisto, kategorisoimattomatId]);
          }
        }}
      />
    </Section>
  );
}
