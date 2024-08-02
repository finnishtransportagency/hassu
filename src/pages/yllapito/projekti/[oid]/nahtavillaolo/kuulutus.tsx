import React, { ReactElement } from "react";
import KuulutuksenTiedot from "@components/projekti/nahtavillaolo/kuulutuksentiedot/KuulutuksenTiedot";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import Lukunakyma from "@components/projekti/nahtavillaolo/kuulutuksentiedot/Lukunakyma";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import ProjektiConsumerComponent from "@components/projekti/ProjektiConsumer";
import NahtavillaoloPageLayout from "@components/projekti/nahtavillaolo/NahtavillaoloPageLayout";
import { MuokkausTila } from "@services/api";

export default function NahtavillaoloKuulutusWrapper() {
  return (
    <ProjektiConsumerComponent useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <NahtavillaoloKuulutus projekti={projekti} />}
    </ProjektiConsumerComponent>
  );
}

const NahtavillaoloKuulutus = ({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement => {
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
