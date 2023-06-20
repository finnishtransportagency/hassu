import Section from "@components/layout/Section";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Kieli, Status } from "@services/api";
import React, { ReactElement, ReactNode } from "react";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import ProjektiJulkinenSideBar from "./ProjektiJulkinenSideBar";
import ProjektiJulkinenStepper from "./ProjektiJulkinenStepper";
import Notification, { NotificationType } from "@components/notification/Notification";
import useTranslation from "next-translate/useTranslation";
interface Props {
  children: ReactNode;
  saameContent?: ReactNode;
  title: string;
  selectedStep: Status;
  vahainenMenettely?: boolean | null;
}

export default function ProjektiPageLayout({ children, saameContent, title, selectedStep, vahainenMenettely }: Props): ReactElement {
  const theme = useTheme();
  const smallScreen = useMediaQuery(theme.breakpoints.down("lg"));
  const { data: projekti } = useProjektiJulkinen();
  const { t } = useTranslation("projekti");
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
              activeStep={projekti.status}
              projektiStatus={projekti.status}
              selectedStep={selectedStep}
              vertical={smallScreen ? true : undefined}
              vahainenMenettely={projekti.vahainenMenettely}
            />
          </Section>
          <Section noDivider className="mb-10">
            {saameContent}
            {vahainenMenettely && <Notification type={NotificationType.INFO_GRAY}>{t("vahainen_menettely_info")}</Notification>}
            {title && <h2 className="vayla-title">{title}</h2>}
            {children}
          </Section>
        </div>
      </div>
    </section>
  );
}
