import Button from "@components/button/Button";
import HassuAccordion from "@components/HassuAccordion";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { AineistoTila, HyvaksymisPaatosVaihe, VelhoAineisto } from "@services/api";
import { AineistoKategoriat, getNestedAineistoMaaraForCategory, kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import useTranslation from "next-translate/useTranslation";
import React, { Key, useCallback, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  combineOldAndNewAineistoWithCategories,
  findKategoriaForVelhoAineisto,
  getInitialExpandedAineisto,
} from "@components/projekti/common/Aineistot/util";
import { SuunnitelmaAineistoPaakategoriaContent } from "@components/projekti/common/Aineistot/AineistoTable";
import { AccordionToggleButton } from "@components/projekti/common/Aineistot/AccordionToggleButton";
import { HyvaksymisPaatosVaiheAineistotFormValues } from ".";
import { H4 } from "../../../../Headings";
import { Stack } from "@mui/system";
import AineistojenPoistoDialog from "@components/projekti/common/AineistojenPoistoDialog";

export interface AineistoLomakeProps {
  dialogInfoText: string;
  sectionSubtitle?: string;
  vaihe: HyvaksymisPaatosVaihe | null | undefined;
  aineistoKategoriat: AineistoKategoriat;
}

export default function AineistoLomake({ dialogInfoText, sectionSubtitle, vaihe, aineistoKategoriat }: Readonly<AineistoLomakeProps>) {
  const { watch, setValue, getValues } = useFormContext<HyvaksymisPaatosVaiheAineistotFormValues>();
  const aineistoNahtavilla = watch("aineistoNahtavilla");
  const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla || {}).flat();
  const [expandedAineisto, setExpandedAineisto] = useState<Key[]>(getInitialExpandedAineisto(aineistoNahtavilla));

  const { t } = useTranslation("aineisto");

  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const [aineistojenPoistoDialogOpen, setAineistojenPoistoDialogOpen] = useState(false);

  const { kategoriaIds, kategoriat } = useMemo(
    () => ({
      kategoriat: aineistoKategoriat.listKategoriat(),
      kategoriaIds: aineistoKategoriat.listKategoriaIds(),
    }),
    [aineistoKategoriat]
  );

  const onSubmit = useCallback(
    (valitutVelhoAineistot: VelhoAineisto[]): void => {
      const newAineisto = findKategoriaForVelhoAineisto(valitutVelhoAineistot, aineistoKategoriat);
      const newAineistoNahtavilla = combineOldAndNewAineistoWithCategories({
        oldAineisto: aineistoNahtavilla,
        newAineisto,
      });
      setValue("aineistoNahtavilla", newAineistoNahtavilla, { shouldDirty: true });

      const kategorisoimattomat = getValues(`aineistoNahtavilla.${kategorisoimattomatId}`);

      if (kategorisoimattomat?.length && !expandedAineisto.includes(kategorisoimattomatId)) {
        setExpandedAineisto([...expandedAineisto, kategorisoimattomatId]);
      }
    },
    [aineistoNahtavilla, expandedAineisto, aineistoKategoriat, getValues, setValue]
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
      {sectionSubtitle && <h4 className="vayla-small-title mt-10">{sectionSubtitle}</h4>}
      {aineistojaOn && (
        <>
          <AccordionToggleButton
            expandedAineisto={expandedAineisto}
            setExpandedAineisto={setExpandedAineisto}
            aineistoKategoriaIds={kategoriaIds}
          />
          <HassuAccordion
            expandedstate={[expandedAineisto, setExpandedAineisto]}
            items={kategoriat.map((paakategoria) => ({
              title: (
                <H4 className="vayla-small-title mb-0">{`${t(
                  `aineisto-kategoria-nimi.${paakategoria.id}`
                )} (${getNestedAineistoMaaraForCategory(aineistoNahtavillaFlat, paakategoria)})`}</H4>
              ),
              content: (
                <SectionContent largeGaps>
                  <SuunnitelmaAineistoPaakategoriaContent
                    aineisto={vaihe?.aineistoNahtavilla}
                    paakategoria={paakategoria}
                    expandedAineistoState={[expandedAineisto, setExpandedAineisto]}
                    kaikkiKategoriat={kategoriat}
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
        infoText={dialogInfoText}
        onClose={() => setAineistoDialogOpen(false)}
        onSubmit={onSubmit}
      />
      <AineistojenPoistoDialog
        dialogiOnAuki={aineistojenPoistoDialogOpen}
        onClose={() => setAineistojenPoistoDialogOpen(false)}
        onAccept={poistaAineistot}
      />
    </Section>
  );
}
