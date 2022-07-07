import Section from "@components/layout/Section";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Status } from "@services/api";
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
  const theme = useTheme();
  const smallScreen = useMediaQuery(theme.breakpoints.down("lg"));
  const { data: projekti } = useProjektiJulkinen();
  if (!projekti) {
    return <div />;
  }

  const velho = projekti.velho;

  const statusStep: Record<Status, number> = {
    EI_JULKAISTU_PROJEKTIN_HENKILOT: -2,
    EI_JULKAISTU: -1,
    ALOITUSKUULUTUS: 0,
    SUUNNITTELU: 1,
    NAHTAVILLAOLO: 2,
    HYVAKSYMISMENETTELYSSA: 3,
    HYVAKSYTTY: 4,
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
            <h1>{velho?.nimi}</h1>
            <ProjektiJulkinenStepper
              oid={projekti.oid}
              activeStep={statusStep[projekti.status || Status.EI_JULKAISTU]}
              selectedStep={selectedStep}
              vertical={smallScreen ? true : undefined}
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
