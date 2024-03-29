import ProjektiConsumerComponent from "@components/projekti/ProjektiConsumer";
import NahtavillaoloPageLayout from "@components/projekti/nahtavillaolo/NahtavillaoloPageLayout";
import React, { ReactElement } from "react";
import Muokkausnakyma from "@components/projekti/nahtavillaolo/nahtavilleAsetettavatAineistot/Muokkausnakyma";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { MuokkausTila } from "@services/api";
import Lukunakyma from "@components/projekti/nahtavillaolo/nahtavilleAsetettavatAineistot/Lukunakyma";

export default function NahtavillaoloWrapper() {
  return (
    <ProjektiConsumerComponent useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <Nahtavillaolo projekti={projekti} />}
    </ProjektiConsumerComponent>
  );
}

const Nahtavillaolo = ({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement => {
  const voiMuokata =
    !projekti?.nahtavillaoloVaihe?.muokkausTila ||
    [MuokkausTila.MUOKKAUS, MuokkausTila.AINEISTO_MUOKKAUS].includes(projekti.nahtavillaoloVaihe.muokkausTila);
  return <NahtavillaoloPageLayout>{voiMuokata ? <Muokkausnakyma /> : <Lukunakyma />}</NahtavillaoloPageLayout>;
};
