import JataPalautettaNappi from "@components/button/JataPalautettaNappi";
import AnnaPalvelustaPalautettaDialog from "@components/kansalainen/tietoaPalvelusta/AnnaPalvelustaPalautettaDialog";
import ExternalLinkkiLista from "@components/kansalainen/tietoaPalvelusta/ExternalLinkkiLista";
import TietoaPalvelustaPageLayout from "@components/kansalainen/tietoaPalvelusta/TietoaPalvelustaPageLayout";
import ContentSpacer from "@components/layout/ContentSpacer";
import StyledLink, { ExternalStyledLink } from "@components/StyledLink";
import { styled } from "@mui/system";
import { isEvkAktivoitu } from "common/util/isEvkAktivoitu";
import Trans from "next-translate/Trans";
import useTranslation from "next-translate/useTranslation";
import React, { useCallback, useState } from "react";

export default function TietoaPalvelustaSivu() {
  const { t } = useTranslation("tietoa-palvelusta/yhteystiedot-ja-palaute");
  const [isPalateDialogOpen, setIsPalateDialogOpen] = useState(false);

  const openDialog = useCallback(() => {
    setIsPalateDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsPalateDialogOpen(false);
  }, []);

  return (
    <TietoaPalvelustaPageLayout>
      <ContentSpacer as={"section"} gap={8}>
        <h1 id="mainPageContent">{t("paaotsikko")}</h1>
        <ContentSpacer gap={4}>
          <p>{t("kappale1")}</p>
          <ExternalLinkkiLista
            linkkiTiedot={[
              { href: t("linkki1.href"), teksti: t("linkki1.teksti") },
              { href: t(`linkki2${isEvkAktivoitu() ? "" : "_ely"}.href`), teksti: t(`linkki2${isEvkAktivoitu() ? "" : "_ely"}.teksti`) },
            ]}
          />
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("palvelun-yhteystiedot.otsikko")}</h2>
          <Trans
            i18nKey="tietoa-palvelusta/yhteystiedot-ja-palaute:palvelun-yhteystiedot.kappale1"
            components={{
              p: <p />,
              a: <EmailLink href={"mailto:" + t("palvelun-yhteystiedot.email")} />,
            }}
            values={{ emailOsoite: t("palvelun-yhteystiedot.email") }}
          />
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">{t("palautetta-palvelusta.otsikko")}</h2>
          <p>{t("palautetta-palvelusta.kappale1")}</p>
          <p>{t("palautetta-palvelusta.kappale2")}</p>
        </ContentSpacer>
        <JataPalautettaNappi onClick={openDialog} teksti={t("palautetta-palvelusta.avaa-dialogi-painike")} />
        {isPalateDialogOpen && <AnnaPalvelustaPalautettaDialog open={isPalateDialogOpen} onClose={closeDialog} />}
        <h3 className="vayla-subtitle">{t("haluat-antaa-muuta-palautetta.otsikko")}</h3>
        <ContentSpacer gap={4}>
          <h4 className="vayla-small-title">{t("haluat-antaa-muuta-palautetta.palautetta-suunnitelmista.otsikko")}</h4>
          <Trans
            i18nKey="tietoa-palvelusta/yhteystiedot-ja-palaute:haluat-antaa-muuta-palautetta.palautetta-suunnitelmista.kappale1"
            components={{
              p: <p />,
              a: <StyledLink href="/" />,
            }}
          />
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h4 className="vayla-small-title">
            {t("haluat-antaa-muuta-palautetta.palautetta-valtion-teista-rautateistä-ja-vesivaylista.otsikko")}
          </h4>
          <Trans
            i18nKey="tietoa-palvelusta/yhteystiedot-ja-palaute:haluat-antaa-muuta-palautetta.palautetta-valtion-teista-rautateistä-ja-vesivaylista.kappale1"
            components={{
              p: <p />,
              a: (
                <ExternalStyledLink
                  href={t("haluat-antaa-muuta-palautetta.palautetta-valtion-teista-rautateistä-ja-vesivaylista.linkki")}
                />
              ),
            }}
          />
        </ContentSpacer>
      </ContentSpacer>
    </TietoaPalvelustaPageLayout>
  );
}

const EmailLink = styled("a")({ fontWeight: 700 });
