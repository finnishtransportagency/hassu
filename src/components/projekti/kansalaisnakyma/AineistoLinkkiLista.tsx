import React, { ComponentProps, useMemo } from "react";
import { Aineisto } from "@services/api";
import ContentSpacer from "@components/layout/ContentSpacer";
import dayjs from "dayjs";
import { styled } from "@mui/system";
import { TiedostoLinkki } from "./TiedostoLinkkiLista";

type AineistoLinkkiListaProps = {
  aineistot: Aineisto[];
  julkaisupaiva: string;
} & ComponentProps<typeof ContentSpacer>;

type AineistoWithRequiredTiedosto = Omit<Aineisto, "tiedosto"> & { tiedosto: string };

export const AineistoLinkkiLista = styled(({ aineistot, julkaisupaiva, ...props }: AineistoLinkkiListaProps) => {
  const filteredAineistot = useMemo(
    () => aineistot.filter((aineisto): aineisto is AineistoWithRequiredTiedosto => !!aineisto.tiedosto),
    [aineistot]
  );
  return (
    <ContentSpacer as="ul" gap={2} {...props}>
      {filteredAineistot.map((aineisto) => {
        const visibleDate = aineistonTuontiPaiva(aineisto, julkaisupaiva);
        return (
          <TiedostoLinkki
            key={aineisto.dokumenttiOid}
            julkaisupaiva={visibleDate}
            tiedosto={aineisto.tiedosto}
            tiedostoNimi={aineisto.nimi}
          />
        );
      })}
    </ContentSpacer>
  );
})({});

function aineistonTuontiPaiva(aineisto: Aineisto, julkaisupaiva: string): string {
  if (!aineisto.tuotu) {
    return julkaisupaiva;
  }
  const aineistoTuotu = dayjs(aineisto.tuotu);
  const julkaisupaivaTuotu = dayjs(julkaisupaiva);
  const visibleDate = aineistoTuotu?.isValid() && aineistoTuotu.isAfter(julkaisupaivaTuotu, "day") ? aineisto.tuotu : julkaisupaiva;
  return visibleDate;
}
