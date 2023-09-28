import React, { useMemo, VoidFunctionComponent } from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { getPaatosSpecificData, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import PaatosPageLayout from "./PaatosPageLayout";
import { MuokkausTila } from "@services/api";
import Muokkausnakyma from "./aineistot/Muokkausnakyma";
import Lukunakyma from "./aineistot/Lukunakyma";

export const PaatoksenAineistotPage: VoidFunctionComponent<{ projekti: ProjektiLisatiedolla; paatosTyyppi: PaatosTyyppi }> = ({
  projekti,
  paatosTyyppi,
}) => {
  const { julkaisematonPaatos, julkaisu } = useMemo(() => getPaatosSpecificData(projekti, paatosTyyppi), [paatosTyyppi, projekti]);

  const voiMuokata =
    !julkaisematonPaatos?.muokkausTila ||
    [MuokkausTila.MUOKKAUS, MuokkausTila.AINEISTO_MUOKKAUS].includes(julkaisematonPaatos.muokkausTila);

  return (
    <PaatosPageLayout paatosTyyppi={paatosTyyppi}>
      {voiMuokata ? (
        <Muokkausnakyma julkaisematonPaatos={julkaisematonPaatos} paatosTyyppi={paatosTyyppi} julkaisu={julkaisu} />
      ) : (
        <Lukunakyma paatosTyyppi={paatosTyyppi} projekti={projekti} />
      )}
    </PaatosPageLayout>
  );
};
