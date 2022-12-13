import React, { ReactElement } from "react";
import KuulutuksenTiedot from "@components/projekti/nahtavillaolo/kuulutuksentiedot/KuulutuksenTiedot";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import Lukunakyma from "@components/projekti/nahtavillaolo/kuulutuksentiedot/Lukunakyma";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import ProjektiConsumerComponent from "@components/projekti/ProjektiConsumer";
import NahtavillaoloPageLayout from "@components/projekti/nahtavillaolo/NahtavillaoloPageLayout";
import { MuokkausTila } from "@services/api";

export default function NahtavillaoloWrapper() {
  return <ProjektiConsumerComponent>{(projekti) => <Nahtavillaolo projekti={projekti} />}</ProjektiConsumerComponent>;
}

const Nahtavillaolo = ({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement => {
  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  return (
    <NahtavillaoloPageLayout>
      {epaaktiivinen &&
      (projekti.nahtavillaoloVaihe?.muokkausTila !== MuokkausTila.MUOKKAUS || !projekti.nahtavillaoloVaihe?.muokkausTila) ? (
        <Lukunakyma projekti={projekti} nahtavillaoloVaiheJulkaisu={projekti.nahtavillaoloVaiheJulkaisu} />
      ) : (
        <KuulutuksenTiedot />
      )}
    </NahtavillaoloPageLayout>
  );
};
