import React, { ReactElement } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import SuunnitteluPageLayoutWrapper from "@components/projekti/suunnitteluvaihe/SuunnitteluvaihePageLayout";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import SuunnitteluvaiheenPerustiedotLukutila from "@components/projekti/lukutila/SuunnitteluvaiheenPerustiedotLukutila";
import SuunnitteluvaiheenPerustiedot from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenPerustiedot";
import { SuunnitteluVaiheTila } from "@services/api";

export default function SuunnitteluWrapper() {
  const { data: projekti } = useProjekti();

  if (!projekti) {
    return <></>;
  }

  return <Suunnittelu projekti={projekti} />;
}

function Suunnittelu({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement {
  const migroitu = projekti?.suunnitteluVaihe?.tila == SuunnitteluVaiheTila.MIGROITU;
  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  if (migroitu) {
    return (
      <SuunnitteluPageLayoutWrapper>
        <p>Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.</p>
      </SuunnitteluPageLayoutWrapper>
    );
  }

  if (epaaktiivinen) {
    <SuunnitteluPageLayoutWrapper>
      <SuunnitteluvaiheenPerustiedotLukutila />
    </SuunnitteluPageLayoutWrapper>;
  }

  return (
    <SuunnitteluPageLayoutWrapper>
      <SuunnitteluvaiheenPerustiedot />
    </SuunnitteluPageLayoutWrapper>
  );
}
