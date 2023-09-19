import React, { ReactNode, useCallback, useState } from "react";
import Button from "@components/button/Button";
import Section, { SectionProps } from "@components/layout/Section2";
import { TilasiirtymaToiminto, TilasiirtymaTyyppi } from "@services/api";
import useApi from "src/hooks/useApi";
import { DialogActions, DialogContent } from "@mui/material";
import HassuDialog from "@components/HassuDialog";
import { styled } from "@mui/system";
import { useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

type Props = { children: ReactNode; tyyppi: TilasiirtymaTyyppi; oid: string } & SectionProps;

export const AineistoMuokkausSection = styled(({ tyyppi, oid, children, ...sectionProps }: Props) => {
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
        await api.siirraTila({ oid, tyyppi, toiminto: TilasiirtymaToiminto.AVAA_AINEISTOMUOKKAUS });
        showSuccessMessage("Aineistot avattu muokattavaksi");
        await reloadProjekti();
        close();
      } catch {}
    };
    withLoadingSpinner(siirraTila());
  }, [withLoadingSpinner, api, close, oid, reloadProjekti, showSuccessMessage, tyyppi]);

  return (
    <Section {...sectionProps}>
      <Button type="button" onClick={open} className="lg:absolute lg:top-0 lg:right-0 ml-auto lg:ml-0">
        Muokkaa
      </Button>
      {children}
      <HassuDialog title="Avaa aineistot muokattavaksi" open={isOpen} onClose={close}>
        <DialogContent>
          <p>Aineiston muokkaaminen edellyttää niiden lähettämistä projektipäällikon hyväksyttäväksi.</p>
          <p>Projektipäällikkö saa tiedon muokatuista aineistoista.</p>
        </DialogContent>
        <DialogActions>
          <Button type="button" primary onClick={aktivoiAineistoMuokkaus}>
            Jatka
          </Button>
          <Button type="button" onClick={close}>
            Peruuta
          </Button>
        </DialogActions>
      </HassuDialog>
    </Section>
  );
})({ position: "relative" });
