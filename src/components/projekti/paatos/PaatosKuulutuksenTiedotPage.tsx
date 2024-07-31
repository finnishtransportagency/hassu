import React, { useMemo, FunctionComponent } from "react";
import KuulutuksenTiedot from "@components/projekti/paatos/kuulutuksenTiedot/index";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import Lukunakyma from "@components/projekti/paatos/kuulutuksenTiedot/Lukunakyma";
import { getPaatosSpecificData, PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import PaatosPageLayout from "./PaatosPageLayout";

export const PaatoksenKuulutuksenTiedotPage: FunctionComponent<{
  projekti: ProjektiLisatiedolla;
  paatosTyyppi: PaatosTyyppi;
}> = ({ projekti, paatosTyyppi }) => {
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
