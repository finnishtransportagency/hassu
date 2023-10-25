import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { MuokkausTila } from "@services/api";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { paatosPageLayoutData } from "src/util/getPaatosSpecificData";
import { getPaatosSpecificData, paatosSpecificVaihe, PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import ProjektiConsumer from "../ProjektiConsumer";

function PaatosIndexPageWrapper({ paatosTyyppi }: { paatosTyyppi: PaatosTyyppi }) {
  return <ProjektiConsumer>{(projekti) => <PaatosIndexPage projekti={projekti} paatosTyyppi={paatosTyyppi} />}</ProjektiConsumer>;
}

function PaatosIndexPage({ paatosTyyppi, projekti }: { paatosTyyppi: PaatosTyyppi; projekti: ProjektiLisatiedolla }) {
  const router = useRouter();

  const { julkaisematonPaatos } = useMemo(() => getPaatosSpecificData(projekti, paatosTyyppi), [paatosTyyppi, projekti]);
  const { pageTitle, paatosRoutePart } = useMemo(() => paatosPageLayoutData[paatosTyyppi], [paatosTyyppi]);

  useEffect(() => {
    const isMuokkausTila = !julkaisematonPaatos?.muokkausTila || julkaisematonPaatos?.muokkausTila === MuokkausTila.MUOKKAUS;
    const pathname = isMuokkausTila
      ? `/yllapito/projekti/[oid]/${paatosRoutePart}/aineisto`
      : `/yllapito/projekti/[oid]/${paatosRoutePart}/kuulutus`;
    router.push({ query: { oid: projekti.oid }, pathname });
  }, [julkaisematonPaatos?.muokkausTila, paatosRoutePart, projekti, router]);

  return (
    <ProjektiPageLayout vaihe={paatosSpecificVaihe[paatosTyyppi]} title={pageTitle}>
      <></>
    </ProjektiPageLayout>
  );
}

export default PaatosIndexPageWrapper;
