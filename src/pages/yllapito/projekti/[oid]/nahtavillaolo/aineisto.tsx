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

  const nahtavillaolovaiheJulkaisu = projekti.nahtavillaoloVaiheJulkaisut?.[projekti.nahtavillaoloVaiheJulkaisut.length - 1];

  return (
    <NahtavillaoloPageLayout>
      {epaaktiivinen && nahtavillaolovaiheJulkaisu ? (
        <NahtavillaoloAineistotLukutila oid={projekti.oid} nahtavillaoloVaiheJulkaisu={nahtavillaolovaiheJulkaisu} />
      ) : (
        <NahtavilleAsetettavatAineistot />
      )}
    </NahtavillaoloPageLayout>
  );
};
