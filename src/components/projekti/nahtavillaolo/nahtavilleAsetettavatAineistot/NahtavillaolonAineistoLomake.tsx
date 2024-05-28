import Button from "@components/button/Button";
import HassuAccordion from "@components/HassuAccordion";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { NahtavillaoloVaihe } from "@services/api";
import { aineistoKategoriat, getNestedAineistoMaaraForCategory, kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import React, { Key, useState } from "react";
import { useFormContext } from "react-hook-form";
import { SuunnitelmaAineistoPaakategoriaContent } from "@components/projekti/common/Aineistot/AineistoTable";
import {
  combineOldAndNewAineistoWithCategories,
  findKategoriaForVelhoAineisto,
  getInitialExpandedAineisto,
} from "@components/projekti/common/Aineistot/util";
import { NahtavilleAsetettavatAineistotFormValues } from "./Muokkausnakyma";
import { AineistotSaavutettavuusOhje } from "@components/projekti/common/AineistotSaavutettavuusOhje";
import { AccordionToggleButton } from "../../common/Aineistot/AccordionToggleButton";

export interface SuunnitelmatJaAineistotProps {
  vaihe: NahtavillaoloVaihe | null | undefined;
}

export default function SuunnitelmatJaAineistot({ vaihe }: SuunnitelmatJaAineistotProps) {
  const { watch, setValue, getValues } = useFormContext<NahtavilleAsetettavatAineistotFormValues>();

  const aineistoNahtavilla = watch("aineistoNahtavilla");
  const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla || {}).flat();
  const [expandedAineisto, setExpandedAineisto] = useState<Key[]>(getInitialExpandedAineisto(aineistoNahtavilla));

  const { t } = useTranslation("aineisto");

  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);

  return (
    <Section>
      <h4 className="vayla-subtitle">Nähtäville asetettava aineisto</h4>
      <p>
        Nähtäville asetettava aineisto sekä lausuntopyyntöön liitettävä aineisto tuodaan Projektivelhosta. Nähtäville asetettu aineisto
        siirtyy automaation avulla alakategorioihin ja käyttäjän on mahdollista järjestellä aineistoja, siirtää aineistoja alakategoriasta
        toiseen tai poistaa tuotuja aineistoja. Nähtäville asetettu aineisto julkaistaan palvelun julkisella puolella kuulutuksen
        julkaisupäivänä.
      </p>
      <AineistotSaavutettavuusOhje />
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
                dialogInfoText={"Valitse tiedostot, jotka haluat tuoda nähtäville."}
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
        infoText={"Valitse tiedostot, jotka haluat tuoda nähtäville."}
        onClose={() => setAineistoDialogOpen(false)}
        onSubmit={(valitutVelhoAineistot) => {
          const newAineisto = findKategoriaForVelhoAineisto(valitutVelhoAineistot);
          const uusiAineistoNahtavilla = combineOldAndNewAineistoWithCategories({
            oldAineisto: aineistoNahtavilla,
            newAineisto,
          });
          setValue("aineistoNahtavilla", uusiAineistoNahtavilla, { shouldDirty: true });

          const kategorisoimattomat = getValues(`aineistoNahtavilla.${kategorisoimattomatId}`);

          if (kategorisoimattomat?.length && !expandedAineisto.includes(kategorisoimattomatId)) {
            setExpandedAineisto([...expandedAineisto, kategorisoimattomatId]);
          }
        }}
      />
    </Section>
  );
}
