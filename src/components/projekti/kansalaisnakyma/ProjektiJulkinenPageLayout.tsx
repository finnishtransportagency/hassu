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

  const statusStepMap = new Map<Status, number>([
    [Status.ALOITUSKUULUTUS, 0],
    [Status.SUUNNITTELU, 1],
    [Status.NAHTAVILLAOLO, 2],
    [Status.ARKISTOITU, 3], // TODO: toistaiseksi puuttuu status "Hyvaksynnassa"
    [Status.HYVAKSYMISPAATOS, 4],
    [Status.LAINVOIMA, 5]
  ]);

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-3">
        <div className="md:col-span-6 lg:col-span-4 xl:col-span-3">
          <ProjektiJulkinenSideNavigation />
        </div>
        <div className="md:col-span-6 lg:col-span-8 xl:col-span-9">
          <Section noDivider>
          <h1>{velho.nimi}</h1>
          <ProjektiJulkinenStepper activeStep={statusStepMap.get(Status.NAHTAVILLAOLO) || -1} selectedStep={selectedStep} />
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
