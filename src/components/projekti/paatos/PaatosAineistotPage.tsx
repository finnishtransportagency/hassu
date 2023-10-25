import React, { useMemo, VoidFunctionComponent } from "react";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import PaatosPageLayout from "./PaatosPageLayout";
import { MuokkausTila } from "@services/api";
import Muokkausnakyma from "./aineistot/Muokkausnakyma";
import Lukunakyma from "./aineistot/Lukunakyma";
import { getPaatosSpecificData } from "common/hyvaksymisPaatosUtil";

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
