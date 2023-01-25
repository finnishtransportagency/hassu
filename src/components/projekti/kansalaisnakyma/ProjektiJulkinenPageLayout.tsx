import Section from "@components/layout/Section";
import Notification, { NotificationType } from "@components/notification/Notification";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import React, { ReactElement, ReactNode } from "react";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import ProjektiJulkinenSideBar from "./ProjektiJulkinenSideBar";
import ProjektiJulkinenStepper, { StepStatus } from "./ProjektiJulkinenStepper";

interface Props {
  children: ReactNode;
  title: string;
  selectedStep: StepStatus;
}

export default function ProjektiJulkinenPageLayout({ children, title, selectedStep }: Props): ReactElement {
  const theme = useTheme();
  const smallScreen = useMediaQuery(theme.breakpoints.down("lg"));
  const { data: projekti } = useProjektiJulkinen();
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
          <Section noDivider>
            <h1>{velho?.nimi}</h1>
            <ProjektiJulkinenStepper projekti={projekti} selectedStep={selectedStep} vertical={smallScreen ? true : undefined} />
          </Section>
          <Section noDivider>
            {projekti.vahainenMenettely && (
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
