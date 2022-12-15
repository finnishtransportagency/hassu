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
  const { julkaisematonPaatos } = useMemo(() => getPaatosSpecificData(projekti, paatosTyyppi), [paatosTyyppi, projekti]);

  const voiMuokata = !julkaisematonPaatos?.muokkausTila || julkaisematonPaatos?.muokkausTila === MuokkausTila.MUOKKAUS;

  return (
    <PaatosPageLayout paatosTyyppi={paatosTyyppi}>
      {voiMuokata ? (
        <Muokkausnakyma julkaisematonPaatos={julkaisematonPaatos} paatosTyyppi={paatosTyyppi} />
      ) : (
        <Lukunakyma paatosTyyppi={paatosTyyppi} projekti={projekti} />
      )}
    </PaatosPageLayout>
  );
};
