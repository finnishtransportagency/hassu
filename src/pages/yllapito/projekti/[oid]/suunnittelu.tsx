import React, { ReactElement, useEffect } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { useRouter } from "next/router";
import useProjekti from "src/hooks/useProjekti";
import { PageProps } from "@pages/_app";
import Section from "@components/layout/Section";
import Tabs from "@components/layout/tabs/Tabs";
import SuunnitteluvaiheenPerustiedot from "@components/projekti/suunnitteluvaihe/SuunniteluvaiheenPerustiedot";

export default function Suunnittelu({ setRouteLabels }: PageProps): ReactElement {
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti } = useProjekti(oid);

  useEffect(() => {
    if (router.isReady) {
      let routeLabel = "";
      if (projekti?.velho?.nimi) {
        routeLabel = projekti.velho?.nimi;
      } else if (typeof oid === "string") {
        routeLabel = oid;
      }
      if (routeLabel) {
        setRouteLabels({ "/yllapito/projekti/[oid]": { label: routeLabel } });
      }
    }
  }, [router.isReady, oid, projekti, setRouteLabels]);

  return (
    <ProjektiPageLayout title="Suunnittelu">
      <Section noDivider>
        <Tabs
          defaultValue={1}
          tabs={[
            { label: "Suunnitteluvaiheen perustiedot", content: <SuunnitteluvaiheenPerustiedot projekti={projekti} />, value: 1 },
            { label: "1. Vuorovaikuttaminen", content: <SuunniteluvaiheenVuorovaikutus />, value: 2 },
          ]}
        />
      </Section>
    </ProjektiPageLayout>
  );
}

const SuunniteluvaiheenVuorovaikutus = () => {
  return <>Vuorovaikutustiedot tähän</>;
};
