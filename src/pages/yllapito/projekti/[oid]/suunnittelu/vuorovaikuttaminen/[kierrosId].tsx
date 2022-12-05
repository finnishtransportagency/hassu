import React, { ReactElement } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import SuunnitteluPageLayout from "@components/projekti/suunnitteluvaihe/SuunnitteluvaihePageLayout";
import { useRouter } from "next/router";
import VuorovaikuttaminenEpaaktiivinenLukutila from "@components/projekti/lukutila/VuorovaikuttaminenEpaaktiivinenLukutila";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import SuunnitteluvaiheenVuorovaikuttaminen from "@components/projekti/suunnitteluvaihe/VuorovaikutusKierros";
import { VuorovaikutusKierrosTila } from "@services/api";
import { getValidatedKierrosId } from "src/util/getValidatedKierrosId";
import VuorovaikutusKierrosLukutila from "@components/projekti/lukutila/VuorovaikutusKierrosLukutila";

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

  const migroitu = projekti?.vuorovaikutusKierros?.tila == VuorovaikutusKierrosTila.MIGROITU;

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  const lukutila: boolean = !!projekti.vuorovaikutusKierrosJulkaisut?.[projekti?.vuorovaikutusKierros?.vuorovaikutusNumero || 0];

  if (epaaktiivinen) {
    return (
      <SuunnitteluPageLayout>
        {validatedKierrosId ? (
          <VuorovaikuttaminenEpaaktiivinenLukutila vuorovaikutusnro={validatedKierrosId} />
        ) : (
          <p>Virheellinen vuorovaikutusnumero</p>
        )}
      </SuunnitteluPageLayout>
    );
  }

  if (lukutila) {
    return (
      <SuunnitteluPageLayout>
        {validatedKierrosId ? <VuorovaikutusKierrosLukutila /> : <p>Virheellinen vuorovaikutusnumero</p>}
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
        <SuunnitteluvaiheenVuorovaikuttaminen vuorovaikutusnro={validatedKierrosId - 1} />
      ) : (
        <p>Virheellinen vuorovaikutusnumero</p>
      )}
    </SuunnitteluPageLayout>
  );
}
