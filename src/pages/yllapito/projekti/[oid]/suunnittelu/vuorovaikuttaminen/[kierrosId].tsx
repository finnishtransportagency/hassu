import React, { ReactElement } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import SuunnitteluPageLayout from "@components/projekti/suunnitteluvaihe/SuunnitteluvaihePageLayout";
import { useRouter } from "next/router";
import VuorovaikuttaminenLukutila from "@components/projekti/lukutila/VuorovaikuttaminenLukutila";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import SuunnitteluvaiheenVuorovaikuttaminen from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenVuorovaikuttaminen";
import { SuunnitteluVaiheTila } from "@services/api";
import { getValidatedKierrosId } from "src/util/getValidatedKierrosId";

export default function VuorovaikutusKierrosWrapper() {
  const { data: projekti } = useProjekti();

  if (!projekti) {
    return <></>;
  }

  return <VuorovaikutusKierros projekti={projekti} />;
}

function VuorovaikutusKierros({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement {
  const router = useRouter();

  // Check that kierrosId query param is string that is parseable to number
  const validatedKierrosId = getValidatedKierrosId(router, projekti);

  const migroitu = projekti?.suunnitteluVaihe?.tila == SuunnitteluVaiheTila.MIGROITU;

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  if (epaaktiivinen) {
    return (
      <SuunnitteluPageLayout>
        {validatedKierrosId ? (
          <VuorovaikuttaminenLukutila vuorovaikutusnro={validatedKierrosId} />
        ) : (
          <p>Virheellinen vuorovaikutusnumero</p>
        )}
      </SuunnitteluPageLayout>
    );
  }

  if (migroitu) {
    return (
      <SuunnitteluPageLayout>
        <p>Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.</p>
      </SuunnitteluPageLayout>
    );
  }

  return (
    <SuunnitteluPageLayout>
      {validatedKierrosId ? (
        <SuunnitteluvaiheenVuorovaikuttaminen vuorovaikutusnro={validatedKierrosId} />
      ) : (
        <p>Virheellinen vuorovaikutusnumero</p>
      )}
    </SuunnitteluPageLayout>
  );
}
