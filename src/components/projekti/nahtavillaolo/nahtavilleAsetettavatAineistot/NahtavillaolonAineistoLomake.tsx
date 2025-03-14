import Button from "@components/button/Button";
import HassuAccordion from "@components/HassuAccordion";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { AineistoTila, NahtavillaoloVaihe } from "@services/api";
import { AineistoKategoriat, getNestedAineistoMaaraForCategory, kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import React, { Key, useCallback, useMemo, useState } from "react";
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
import { H2, H3 } from "../../../Headings";
import { Stack } from "@mui/system";
import AineistojenPoistoDialog from "@components/projekti/common/AineistojenPoistoDialog";

export interface SuunnitelmatJaAineistotProps {
  vaihe: NahtavillaoloVaihe | null | undefined;
  aineistoKategoriat: AineistoKategoriat;
}

export default function SuunnitelmatJaAineistot({ vaihe, aineistoKategoriat }: Readonly<SuunnitelmatJaAineistotProps>) {
  const { watch, setValue, getValues } = useFormContext<NahtavilleAsetettavatAineistotFormValues>();

  const aineistoNahtavilla = watch("aineistoNahtavilla");
  const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla || {}).flat();
  const [expandedAineisto, setExpandedAineisto] = useState<Key[]>(getInitialExpandedAineisto(aineistoNahtavilla));

  const { t } = useTranslation("aineisto");

  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const [aineistojenPoistoDialogOpen, setAineistojenPoistoDialogOpen] = useState(false);

  const { kategoriat, kategoriaIdt } = useMemo(
    () => ({
      kategoriaIdt: aineistoKategoriat.listKategoriaIds(),
      kategoriat: aineistoKategoriat.listKategoriat(),
    }),
    [aineistoKategoriat]
  );

  const aineistojaOn = aineistoNahtavillaFlat.length > 0;

  const poistaAineistot = useCallback(() => {
    const nykyisetAineistot = getValues("aineistoNahtavilla");
    const nykyisetPoistetut = getValues("poistetutAineistoNahtavilla") || [];
    const kaikkiAineistot = Object.entries(nykyisetAineistot).flatMap(([kategoriaId, aineistot]) =>
      aineistot.map((aineisto) => ({
        ...aineisto,
        kategoriaId,
        tila: AineistoTila.ODOTTAA_POISTOA,
        jarjestys: aineisto.jarjestys || 0,
      }))
    );
    setValue("poistetutAineistoNahtavilla", [...nykyisetPoistetut, ...kaikkiAineistot], { shouldDirty: true });
    setValue("aineistoNahtavilla", {}, { shouldDirty: true });
    setAineistojenPoistoDialogOpen(false);
    setExpandedAineisto([]);
  }, [getValues, setValue, setAineistojenPoistoDialogOpen, setExpandedAineisto]);

  return (
    <Section>
      <H2>Nähtäville asetettava aineisto</H2>
      <p>
        Nähtäville asetettava aineisto sekä lausuntopyyntöön liitettävä aineisto tuodaan Projektivelhosta. Nähtäville asetettu aineisto
        siirtyy automaation avulla alakategorioihin ja käyttäjän on mahdollista järjestellä aineistoja, siirtää aineistoja alakategoriasta
        toiseen tai poistaa tuotuja aineistoja. Nähtäville asetettu aineisto julkaistaan palvelun julkisella puolella kuulutuksen
        julkaisupäivänä.
      </p>
      <AineistotSaavutettavuusOhje />
      {aineistojaOn && (
        <>
          <AccordionToggleButton
            expandedAineisto={expandedAineisto}
            setExpandedAineisto={setExpandedAineisto}
            aineistoKategoriaIds={kategoriaIdt}
          />
          <HassuAccordion
            expandedstate={[expandedAineisto, setExpandedAineisto]}
            items={kategoriat.map((paakategoria) => ({
              title: (
                <H3 className="mb-0">
                  {t(`aineisto-kategoria-nimi.${paakategoria.id}`)} (
                  {getNestedAineistoMaaraForCategory(aineistoNahtavillaFlat, paakategoria)})
                </H3>
              ),
              content: (
                <SectionContent largeGaps>
                  <SuunnitelmaAineistoPaakategoriaContent
                    aineisto={vaihe?.aineistoNahtavilla}
                    paakategoria={paakategoria}
                    kaikkiKategoriat={kategoriat}
                    expandedAineistoState={[expandedAineisto, setExpandedAineisto]}
                  />
                </SectionContent>
              ),
              id: paakategoria.id,
            }))}
          />
        </>
      )}
      <Stack justifyContent={{ md: "flex-start" }} direction={{ xs: "column", md: "row" }}>
        <Button type="button" id={"aineisto_nahtavilla_import_button"} onClick={() => setAineistoDialogOpen(true)}>
          Tuo Aineistot
        </Button>
        {aineistojaOn && (
          <Button
            type="button"
            id={"poista_kaikki_aineistot_button"}
            className="pl-12 pr-12 pt-1 pb-1"
            style={{ color: "orangered", borderColor: "orangered" }}
            onClick={() => setAineistojenPoistoDialogOpen(true)}
          >
            Poista kaikki
          </Button>
        )}
      </Stack>
      <AineistojenValitseminenDialog
        open={aineistoDialogOpen}
        infoText={"Valitse tiedostot, jotka haluat tuoda nähtäville."}
        onClose={() => setAineistoDialogOpen(false)}
        onSubmit={(valitutVelhoAineistot) => {
          const newAineisto = findKategoriaForVelhoAineisto(valitutVelhoAineistot, aineistoKategoriat);
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
      <AineistojenPoistoDialog
        dialogiOnAuki={aineistojenPoistoDialogOpen}
        onClose={() => setAineistojenPoistoDialogOpen(false)}
        onAccept={poistaAineistot}
      />
    </Section>
  );
}
