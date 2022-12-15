import React, { useMemo, VoidFunctionComponent } from "react";
import KuulutuksenTiedot from "@components/projekti/paatos/kuulutuksenTiedot/index";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import Lukunakyma from "@components/projekti/paatos/kuulutuksenTiedot/Lukunakyma";
import { getPaatosSpecificData, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import PaatosPageLayout from "./PaatosPageLayout";

export const PaatoksenKuulutuksenTiedotPage: VoidFunctionComponent<{ projekti: ProjektiLisatiedolla; paatosTyyppi: PaatosTyyppi }> = ({
  projekti,
  paatosTyyppi,
}) => {
  const { julkaisu } = useMemo(() => getPaatosSpecificData(projekti, paatosTyyppi), [paatosTyyppi, projekti]);

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);
  return (
    <PaatosPageLayout paatosTyyppi={paatosTyyppi}>
      {epaaktiivinen && julkaisu ? (
        <Lukunakyma projekti={projekti} julkaisu={julkaisu} paatosTyyppi={paatosTyyppi} />
      ) : (
        <KuulutuksenTiedot projekti={projekti} paatosTyyppi={paatosTyyppi} />
      )}
    </PaatosPageLayout>
  );
};
