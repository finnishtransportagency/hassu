import Section from "@components/layout/Section";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Kieli, Status, SuunnitelmaJaettuJulkinen } from "@services/api";
import React, { ReactElement, ReactNode } from "react";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import ProjektiJulkinenSideBar from "./ProjektiJulkinenSideBar";
import ProjektiJulkinenStepper from "./ProjektiJulkinenStepper";
import Notification, { NotificationType } from "@components/notification/Notification";
import useTranslation from "next-translate/useTranslation";
import { H1, H2 } from "@components/Headings";
import HassuWidget from "@components/layout/HassuWidget";
import ExtLink from "@components/ExtLink";
import { ProjektinJakotietoJulkinen } from "@components/kansalainen/ProjektinJakotietoJulkinen";
import { DashedList } from "@components/kansalainen/DashedList";
import ContentSpacer from "@components/layout/ContentSpacer";
interface Props {
  children: ReactNode;
  saameContent?: ReactNode;
  title: string;
  selectedStep: Status;
  vahainenMenettely?: boolean | null;
  suunnitelmaJaettu?: SuunnitelmaJaettuJulkinen | null;
}

export default function ProjektiPageLayout({
  children,
  saameContent,
  title,
  selectedStep,
  vahainenMenettely,
  suunnitelmaJaettu,
}: Props): ReactElement {
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
        {!smallScreen && (
          <div>
            {velho?.linkki && (
              <HassuWidget title={t("hankesivut_otsikko")}>
                <p>{t("lue_hankesivulta")}</p>
                <p>
                  <ExtLink href={velho.linkki}>{t("siirry_hankesivulle")}</ExtLink>
                </p>
              </HassuWidget>
            )}
            <ProjektiJulkinenSideBar sx={{ width: { md: "345px" } }} />
          </div>
        )}
        <div className="min-w-0">
          <Section noDivider className="mb-10">
            <H1 id="mainPageContent">{kieli === Kieli.RUOTSI ? projekti.kielitiedot?.projektinNimiVieraskielella : velho?.nimi}</H1>
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
            <H2>{title}</H2>
            {vahainenMenettely && <Notification type={NotificationType.INFO_GRAY}>{t("asiakirja.vahainen_menettely_info")}</Notification>}
            {suunnitelmaJaettu?.julkaisuKopioituSuunnitelmasta && (
              <Notification type={NotificationType.INFO_GRAY}>
                <p>
                  {t("suunnitelma-jaettu.kaynnistetty-suunnitelmalla")}{" "}
                  <ProjektinJakotietoJulkinen jakotieto={suunnitelmaJaettu.julkaisuKopioituSuunnitelmasta} />
                  {". "}
                  {t("suunnitelma-jaettu.tiedot-kopioitu")}
                </p>
              </Notification>
            )}
            {!!suunnitelmaJaettu?.julkaisuKopioituSuunnitelmiin?.length && (
              <Notification type={NotificationType.INFO_GRAY}>
                <ContentSpacer gap={2}>
                  <p>
                    {t("suunnitelma-jaettu.suunnittelua-on-jaettu", { count: suunnitelmaJaettu?.julkaisuKopioituSuunnitelmiin?.length })}{" "}
                  </p>
                  <DashedList>
                    {suunnitelmaJaettu?.julkaisuKopioituSuunnitelmiin.map((jakotieto) => (
                      <li key={jakotieto.oid}>
                        <ProjektinJakotietoJulkinen jakotieto={jakotieto} />
                      </li>
                    ))}
                  </DashedList>
                </ContentSpacer>
              </Notification>
            )}
            {smallScreen && velho?.linkki && (
              <HassuWidget smallScreen>
                <p>{t("lue_hankesivulta")}</p>
                <p>
                  <ExtLink href={velho.linkki}>{t("siirry_hankesivulle")}</ExtLink>
                </p>
              </HassuWidget>
            )}
            {children}
          </Section>
        </div>
      </div>
      {smallScreen && (
        <div>
          <ProjektiJulkinenSideBar sx={{ width: { md: "345px" } }} />
        </div>
      )}
    </section>
  );
}
