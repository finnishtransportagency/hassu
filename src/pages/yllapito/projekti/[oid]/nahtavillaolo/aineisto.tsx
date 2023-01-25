import ProjektiConsumerComponent from "@components/projekti/ProjektiConsumer";
import NahtavillaoloPageLayout from "@components/projekti/nahtavillaolo/NahtavillaoloPageLayout";
import React, { ReactElement } from "react";
import Muokkausnakyma from "@components/projekti/nahtavillaolo/nahtavilleAsetettavatAineistot/Muokkausnakyma";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
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
  const voiMuokata = !projekti?.nahtavillaoloVaihe?.muokkausTila || projekti?.nahtavillaoloVaihe?.muokkausTila === MuokkausTila.MUOKKAUS;
  return <NahtavillaoloPageLayout>{voiMuokata ? <Muokkausnakyma /> : <Lukunakyma />}</NahtavillaoloPageLayout>;
};
