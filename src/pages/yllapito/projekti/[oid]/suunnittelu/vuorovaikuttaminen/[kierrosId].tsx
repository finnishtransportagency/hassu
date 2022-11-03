import React, { ReactElement } from "react";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import SuunnitteluPageLayout from "@components/projekti/suunnitteluvaihe/SuunnitteluvaihePageLayout";
import { useRouter } from "next/router";
import { isInteger } from "lodash";
import VuorovaikuttaminenLukutila from "@components/projekti/lukutila/VuorovaikuttaminenLukutila";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import SuunnitteluvaiheenVuorovaikuttaminen from "@components/projekti/suunnitteluvaihe/SuunnitteluvaiheenVuorovaikuttaminen";
import { SuunnitteluVaiheTila } from "@services/api";

export default function VuorovaikutusKierrosWrapper() {
  const { data: projekti } = useProjekti();

  if (!projekti) {
    return <></>;
  }

  return <VuorovaikutusKierros projekti={projekti} />;
}

function VuorovaikutusKierros({ projekti }: { projekti: ProjektiLisatiedolla }): ReactElement {
  const router = useRouter();

  const vuorovaikutukset = projekti.suunnitteluVaihe?.vuorovaikutukset;

  const kierrosId = router.query.kierrosId;

  // Check that kierrosId query param is string that is parseable to number
  const validatedKierrosId =
    typeof kierrosId === "string" &&
    !isInteger(kierrosId) &&
    vuorovaikutukset?.some((vuorovaikutus) => vuorovaikutus.vuorovaikutusNumero === parseInt(kierrosId) || kierrosId === "1")
      ? parseInt(kierrosId)
      : undefined;

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
