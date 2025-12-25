import { Key, ReactElement, useCallback, useState } from "react";
import Button from "@components/button/Button";
import { useFormContext } from "react-hook-form";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { H3, H5 } from "@components/Headings";
import { EnnakkoneuvotteluForm, HyvaksymisEsitysForm } from "../hyvaksymisEsitysFormUtil";
import { AineistoKategoriat, getNestedAineistoMaaraForCategory, kategorisoimattomatId } from "common/aineistoKategoriat";
import HassuAccordion from "@components/HassuAccordion";
import { findKategoriaForVelhoAineistoNew, FormAineistoNew, getInitialExpandedAineisto } from "@components/projekti/common/Aineistot/util";
import { AccordionToggleButton } from "@components/projekti/common/Aineistot/AccordionToggleButton";
import useTranslation from "next-translate/useTranslation";
import SectionContent from "@components/layout/SectionContent";
import { SuunnitelmaAineistoPaakategoriaContent } from "@components/projekti/common/Aineistot/AineistoNewTable";
import find from "lodash/find";
import remove from "lodash/remove";
import AineistojenPoistoDialog from "@components/projekti/common/AineistojenPoistoDialog";
import { Stack } from "@mui/system";

type Props = {
  aineistoKategoriat: AineistoKategoriat;
  ennakkoneuvottelu?: boolean;
};

export default function LinkitetynProjektinAineisto({ aineistoKategoriat, ennakkoneuvottelu }: Readonly<Props>): ReactElement {
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const [aineistojenPoistoDialogOpen, setAineistojenPoistoDialogOpen] = useState(false);
  const { watch, setValue, getValues } = useFormContext<HyvaksymisEsitysForm & EnnakkoneuvotteluForm>();
  const linkitetynProjektinAineisto = watch(
    ennakkoneuvottelu ? "ennakkoNeuvottelu.linkitetynProjektinAineisto" : "muokattavaHyvaksymisEsitys.linkitetynProjektinAineisto"
  );
  const { t } = useTranslation("aineisto");
  const linkitetynProjektinAineistoFlat = Object.values(linkitetynProjektinAineisto).flat();

  const aineistojaOn = linkitetynProjektinAineistoFlat.length > 0;

  const [expandedAineisto, setExpandedAineisto] = useState<Key[]>(getInitialExpandedAineisto(linkitetynProjektinAineisto));

  const poistaAineistot = useCallback(() => {
    const linkitetynProjektinAineistoPath = ennakkoneuvottelu
      ? "ennakkoNeuvottelu.linkitetynProjektinAineisto"
      : "muokattavaHyvaksymisEsitys.linkitetynProjektinAineisto";
    const nykyisetAineistot = getValues(linkitetynProjektinAineistoPath);

    const tyhjaRakenne = Object.keys(nykyisetAineistot).reduce((acc, kategoriaId) => {
      acc[kategoriaId] = [];
      return acc;
    }, {} as { [kategoriaId: string]: FormAineistoNew[] });

    setValue(linkitetynProjektinAineistoPath, tyhjaRakenne, { shouldDirty: true });
    setAineistojenPoistoDialogOpen(false);
    setExpandedAineisto([]);
  }, [getValues, setValue, setAineistojenPoistoDialogOpen, setExpandedAineisto, ennakkoneuvottelu]);

  return (
    <>
      <H5 variant="h4">Liittyvän suunnitelman aineistot</H5>
      <p>
        Voit halutessasi tuoda aineistoa myös liittyvästä suunnitelmasta. Aineistot jaotellaan automaattisesti selostusosaan,
        pääpiirustuksiin ja informatiivisiin aineistoihin sekä näiden alikansioihin. Aineistoja on mahdollista järjestellä, siirtää
        alikansioista toiseen tai poistaa.
      </p>
      {aineistojaOn && (
        <>
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
                  linkitetynProjektinAineistoFlat,
                  paakategoria
                )})`}</H3>
              ),
              content: (
                <SectionContent largeGaps>
                  <SuunnitelmaAineistoPaakategoriaContent
                    aineistoKategoriat={aineistoKategoriat}
                    paakategoria={paakategoria}
                    expandedAineistoState={[expandedAineisto, setExpandedAineisto]}
                    ennakkoneuvottelu={ennakkoneuvottelu}
                    linkitetynProjektinAineisto={true}
                  />
                </SectionContent>
              ),
              id: paakategoria.id,
            }))}
          />
        </>
      )}
      <Stack justifyContent={{ md: "flex-start" }} direction={{ xs: "column", md: "row" }}>
        <Button type="button" id="muu_aineisto_velhosta_import_button" onClick={() => setAineistoDialogOpen(true)}>
          Tuo aineistot
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
        onClose={() => setAineistoDialogOpen(false)}
        linkitetynProjektinAineisto={true}
        onSubmit={(valitutVelhoAineistot) => {
          const newAineisto = findKategoriaForVelhoAineistoNew(valitutVelhoAineistot, aineistoKategoriat);
          const uusiAineistoNahtavilla = combineOldAndNewAineistoWithCategories({
            oldAineisto: linkitetynProjektinAineisto,
            newAineisto,
          });
          setValue(
            ennakkoneuvottelu ? "ennakkoNeuvottelu.linkitetynProjektinAineisto" : "muokattavaHyvaksymisEsitys.linkitetynProjektinAineisto",
            uusiAineistoNahtavilla.aineisto
          );
          uusiAineistoNahtavilla.kategoriasWithChanges.forEach((kategoria) => {
            setValue(
              `${ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"}.linkitetynProjektinAineisto.${kategoria}`,
              uusiAineistoNahtavilla.aineisto[kategoria]
            );
          });
        }}
      />
      <AineistojenPoistoDialog
        dialogiOnAuki={aineistojenPoistoDialogOpen}
        onClose={() => setAineistojenPoistoDialogOpen(false)}
        onAccept={poistaAineistot}
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
