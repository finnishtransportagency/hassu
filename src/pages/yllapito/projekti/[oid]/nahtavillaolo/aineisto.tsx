import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import ProjektiConsumerComponent from "@components/projekti/ProjektiConsumer";
import NahtavillaoloPageLayout from "@components/projekti/nahtavillaolo/NahtavillaoloPageLayout";
import React, { ReactElement } from "react";
import NahtavilleAsetettavatAineistot from "@components/projekti/nahtavillaolo/nahtavilleAsetettavatAineistot/NahtavilleAsetettavatAineistot";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import NahtavillaoloAineistotLukutila from "@components/projekti/lukutila/NahtavillaoloAineistotLukutila";

export default function NahtavillaoloWrapper() {
  return <ProjektiConsumerComponent>{(projekti) => <Nahtavillaolo projekti={projekti} />}</ProjektiConsumerComponent>;
}

const Nahtavillaolo = ({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement => {
  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  return (
    <NahtavillaoloPageLayout>
      {epaaktiivinen && projekti.nahtavillaoloVaiheJulkaisu ? (
        <NahtavillaoloAineistotLukutila oid={projekti.oid} nahtavillaoloVaiheJulkaisu={projekti.nahtavillaoloVaiheJulkaisu} />
      ) : (
        <NahtavilleAsetettavatAineistot />
      )}
    </NahtavillaoloPageLayout>
  );
};
