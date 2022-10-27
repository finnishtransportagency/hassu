import Section from "@components/layout/Section";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Status } from "@services/api";
import React, { ReactElement, ReactNode } from "react";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import ProjektiJulkinenSideBar from "./ProjektiJulkinenSideBar";
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
    JATKOPAATOS_1: 5,
    JATKOPAATOS_2: 6,
    EPAAKTIIVINEN_1: -1,
    EPAAKTIIVINEN_2: -1,
    EPAAKTIIVINEN_3: -1,
  };

  return (
    <section>
      <div className="flex flex-col md:flex-row gap-8 mb-3">
        <div style={{ minWidth: "345px", height: "400px", background: "green" }}>{/* <ProjektiJulkinenSideBar /> */}</div>
        <div className="grow">
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
