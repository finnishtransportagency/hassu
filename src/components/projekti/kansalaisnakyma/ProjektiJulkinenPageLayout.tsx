import Section from "@components/layout/Section";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Kieli, ProjektiJulkinen, Status } from "@services/api";
import React, { ReactElement, ReactNode } from "react";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import ProjektiJulkinenSideBar from "./ProjektiJulkinenSideBar";
import ProjektiJulkinenStepper from "./ProjektiJulkinenStepper";
import Notification, { NotificationType } from "@components/notification/Notification";
interface Props {
  children: ReactNode;
  saameContent?: ReactNode;
  title: string;
  selectedStep: number;
  vahainenMenettely?: true;
}

const stepsForStatuses: Partial<Record<Status, number>> = {
  ALOITUSKUULUTUS: 0,
  SUUNNITTELU: 1,
  NAHTAVILLAOLO: 2,
  HYVAKSYMISMENETTELYSSA: 3,
  HYVAKSYTTY: 4,
  JATKOPAATOS_1: 4,
  JATKOPAATOS_2: 4,
};

function getActiveStep(projekti: ProjektiJulkinen): number {
  const status = projekti.status;
  if (!status) {
    return -1;
  }
  const stepStatus = stepsForStatuses[status];
  if (stepStatus === undefined) {
    return -1;
  }
  return stepStatus;
}

export default function ProjektiPageLayout({ children, saameContent, title, selectedStep, vahainenMenettely }: Props): ReactElement {
  const theme = useTheme();
  const smallScreen = useMediaQuery(theme.breakpoints.down("lg"));
  const { data: projekti } = useProjektiJulkinen();

  const kieli = useKansalaiskieli();

  if (!projekti) {
    return <div />;
  }

  const velho = projekti.velho;
  return (
    <section>
      <div className="flex flex-col md:flex-row gap-8 mb-3">
        <div>
          <ProjektiJulkinenSideBar sx={{ width: { md: "345px" } }} />
        </div>
        <div>
          <Section noDivider className="mb-10">
            <h1>{kieli === Kieli.RUOTSI ? projekti.kielitiedot?.projektinNimiVieraskielella : velho?.nimi}</h1>
            <ProjektiJulkinenStepper
              oid={projekti.oid}
              activeStep={getActiveStep(projekti)}
              projektiStatus={projekti.status}
              selectedStep={selectedStep}
              vertical={smallScreen ? true : undefined}
            />
          </Section>
          <Section noDivider className="mb-10">
            {saameContent}
            {vahainenMenettely && (
              <Notification type={NotificationType.INFO_GRAY}>
                Suunnitelma kohdistuu pienelle alueelle ja suunnitelma on vaikutuksiltaan vähäinen. Vuorovaikutus suunnitelmista käydään
                suoraan asianomaisen ja kunnan kanssa.
              </Notification>
            )}
            {title && <h2 className="vayla-title">{title}</h2>}
            {children}
          </Section>
        </div>
      </div>
    </section>
  );
}
