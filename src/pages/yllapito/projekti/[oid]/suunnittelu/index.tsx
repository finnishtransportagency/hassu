import React, { ReactElement } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import SuunnitteluPageLayoutWrapper from "@components/projekti/suunnitteluvaihe/PageLayout";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import SuunnitteluvaiheenPerustiedotLukutila from "@components/projekti/lukutila/SuunnitteluvaiheenPerustiedotLukutila";
import SuunnitteluvaiheenPerustiedot from "@components/projekti/suunnitteluvaihe/Perustiedot";
import { VuorovaikutusKierrosTila } from "@services/api";

export default function SuunnitteluWrapper() {
  const { data: projekti } = useProjekti();

  if (!projekti) {
    return <></>;
  }

  return <Suunnittelu projekti={projekti} />;
}

function Suunnittelu({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement {
  const migroitu = projekti?.vuorovaikutusKierros?.tila == VuorovaikutusKierrosTila.MIGROITU;
  const lukutila =
    projektiOnEpaaktiivinen(projekti) || !projekti.nykyinenKayttaja.omaaMuokkausOikeuden || projekti.nahtavillaoloVaiheJulkaisu;

  if (migroitu) {
    return (
      <SuunnitteluPageLayoutWrapper lukutila={!!projekti.nahtavillaoloVaiheJulkaisu}>
        <p>Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.</p>
      </SuunnitteluPageLayoutWrapper>
    );
  }

  if (lukutila) {
    return (
      <SuunnitteluPageLayoutWrapper lukutila={true}>
        <SuunnitteluvaiheenPerustiedotLukutila />
      </SuunnitteluPageLayoutWrapper>
    );
  }

  return (
    <SuunnitteluPageLayoutWrapper>
      <SuunnitteluvaiheenPerustiedot />
    </SuunnitteluPageLayoutWrapper>
  );
}
