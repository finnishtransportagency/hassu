import Section from "@components/layout/Section";
import { Status } from "@services/api";
import { useRouter } from "next/router";
import React, { ReactElement, ReactNode } from "react";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import ProjektiJulkinenSideNavigation from "./ProjektiJulkinenSideNavigation";
import ProjektiJulkinenStepper from "./ProjektiJulkinenStepper";

interface Props {
  children: ReactNode;
  title: string;
  selectedStep: number;
}

export default function ProjektiPageLayout({ children, title, selectedStep }: Props): ReactElement {
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti } = useProjektiJulkinen(oid);
  if (!projekti) {
    return <div />;
  }
  if (!projekti.aloitusKuulutusJulkaisut || !projekti.aloitusKuulutusJulkaisut[0]) {
    return <div />;
  }
  const kuulutus = projekti.aloitusKuulutusJulkaisut[0];
  const velho = kuulutus.velho;

  const statusStep: Record<Status, number> = {
    EI_JULKAISTU: -1,
    ALOITUSKUULUTUS: 0,
    SUUNNITTELU: 1,
    NAHTAVILLAOLO: 2,
    HYVAKSYNNASSA: 3,
    HYVAKSYMISPAATOS: 4,
    LAINVOIMA: 5,
    ARKISTOITU: -1,
  };

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-3">
        <div className="md:col-span-6 lg:col-span-4 xl:col-span-3">
          <ProjektiJulkinenSideNavigation />
        </div>
        <div className="md:col-span-6 lg:col-span-8 xl:col-span-9">
          <Section noDivider>
            <h1>{velho.nimi}</h1>
            <ProjektiJulkinenStepper
              oid={projekti.oid}
              activeStep={statusStep[projekti.status || Status.EI_JULKAISTU]}
              selectedStep={selectedStep}
              vertical
            />
          </Section>
          <Section noDivider>
            <h2 className="vayla-title">{title}</h2>
            {children}
          </Section>
        </div>
      </div>
    </section>
  );
}
