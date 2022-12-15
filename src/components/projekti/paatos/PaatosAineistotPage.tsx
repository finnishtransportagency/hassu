import React, { useMemo, VoidFunctionComponent } from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { getPaatosSpecificData, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import PaatosAineistotLukutila from "../lukutila/PaatosAineistotLukutila";
import PaatosAineistot from "@components/projekti/paatos/aineistot/index";
import PaatosPageLayout from "./PaatosPageLayout";

export const PaatoksenAineistotPage: VoidFunctionComponent<{ projekti: ProjektiLisatiedolla; paatosTyyppi: PaatosTyyppi }> = ({
  projekti,
  paatosTyyppi,
}) => {
  const {
    julkaisu: viimeisinJulkaisu,
    julkaisematonPaatos,
    julkaisu,
  } = useMemo(() => getPaatosSpecificData(projekti, paatosTyyppi), [paatosTyyppi, projekti]);

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  return (
    <PaatosPageLayout paatosTyyppi={paatosTyyppi}>
      {epaaktiivinen && viimeisinJulkaisu ? (
        <PaatosAineistotLukutila oid={projekti.oid} paatosJulkaisu={viimeisinJulkaisu} />
      ) : (
        <PaatosAineistot projekti={projekti} julkaisu={julkaisu} julkaisematonPaatos={julkaisematonPaatos} paatosTyyppi={paatosTyyppi} />
      )}
    </PaatosPageLayout>
  );
};
