import React, { ReactNode, useCallback, useState } from "react";
import Button from "@components/button/Button";
import Section, { SectionProps } from "@components/layout/Section2";
import {
  HyvaksymisPaatosVaiheJulkaisu,
  KuulutusJulkaisuTila,
  NahtavillaoloVaiheJulkaisu,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
} from "@services/api";
import useApi from "src/hooks/useApi";
import { DialogActions, DialogContent } from "@mui/material";
import HassuDialog from "@components/HassuDialog";
import { styled } from "@mui/system";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { isDateTimeInThePast } from "backend/src/util/dateUtil";

type Props = {
  children: ReactNode;
  tyyppi: TilasiirtymaTyyppi;
  projekti: ProjektiLisatiedolla;
  julkaisu: NahtavillaoloVaiheJulkaisu | HyvaksymisPaatosVaiheJulkaisu;
} & SectionProps;

export const AineistoMuokkausSection = styled(({ tyyppi, projekti, children, julkaisu, ...sectionProps }: Props) => {
  const api = useApi();
  const { withLoadingSpinner } = useLoadingSpinner();
  const { mutate: reloadProjekti } = useProjekti();
  const { showSuccessMessage } = useSnackbars();
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const aktivoiAineistoMuokkaus = useCallback(() => {
    const siirraTila = async () => {
      try {
        await api.siirraTila({ oid: projekti.oid, tyyppi, toiminto: TilasiirtymaToiminto.AVAA_AINEISTOMUOKKAUS });
        showSuccessMessage("Aineistot avattu muokattavaksi");
        await reloadProjekti();
        close();
      } catch {}
    };
    withLoadingSpinner(siirraTila());
  }, [withLoadingSpinner, api, close, projekti.oid, reloadProjekti, showSuccessMessage, tyyppi]);

  const kuulutusHyvaksyttyOdottaaJulkaisua =
    !!julkaisu.kuulutusPaiva &&
    !isDateTimeInThePast(julkaisu.kuulutusPaiva, "start-of-day") &&
    julkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY &&
    projekti.nykyinenKayttaja.omaaMuokkausOikeuden;

  return (
    <Section {...sectionProps}>
      {kuulutusHyvaksyttyOdottaaJulkaisua && (
        <Button id="avaa_aineiston_muokkaus" type="button" onClick={open} className="lg:absolute lg:top-0 lg:right-0 ml-auto lg:ml-0">
          Muokkaa
        </Button>
      )}
      {children}
      <HassuDialog title="Avaa aineistot muokattavaksi" open={isOpen} maxWidth="sm" onClose={close}>
        <DialogContent>
          <p>Aineiston muokkaaminen edellyttää niiden lähettämistä projektipäällikon hyväksyttäväksi.</p>
          <p>Projektipäällikkö saa tiedon muokatuista aineistoista.</p>
        </DialogContent>
        <DialogActions>
          <Button id="jatka_aineiston_muokkaus" type="button" primary onClick={aktivoiAineistoMuokkaus}>
            Jatka
          </Button>
          <Button id="peruuta_aineiston_muokkaus" type="button" onClick={close}>
            Peruuta
          </Button>
        </DialogActions>
      </HassuDialog>
    </Section>
  );
})({ position: "relative" });
