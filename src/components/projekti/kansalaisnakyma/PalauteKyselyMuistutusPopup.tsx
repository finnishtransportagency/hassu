import ButtonLink from "@components/button/ButtonLink";
import HassuDialog from "@components/HassuDialog";
import { DialogActions, DialogContent } from "@mui/material";
import Button from "@components/button/Button";
import useTranslation from "next-translate/useTranslation";
import { ReactElement, useEffect, useState } from "react";
import { haehardCodedPalauteKyselyTiedot, PalauteKyselyAvoinna } from "src/util/haePalauteKyselyTiedot";

const kyselyTiedot: PalauteKyselyAvoinna = haehardCodedPalauteKyselyTiedot();
const SESSION_STORAGE_KEY_FOR_PALAUTE_KYSELY_MUISTUTUS_POPUP = "palauteKyselyPop_" + kyselyTiedot.startDate;

export function PalauteKyselyMuistutusPopup(): ReactElement | null {
  const { t } = useTranslation();
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (kyselyTiedot.isActive) {
      const hasSeenPopup = sessionStorage.getItem(SESSION_STORAGE_KEY_FOR_PALAUTE_KYSELY_MUISTUTUS_POPUP);
      if (!hasSeenPopup) {
        setShowPopup(true);
        sessionStorage.setItem(SESSION_STORAGE_KEY_FOR_PALAUTE_KYSELY_MUISTUTUS_POPUP, "true");
      }
    }
  }, []);

  const onClose = () => {
    setShowPopup(false);
  };

  if (!kyselyTiedot.isActive) {
    return null;
  }
  return (
    <HassuDialog
      scroll="paper"
      fullScreen={false}
      open={showPopup}
      title={t("palautekyselymuistutus:kerro-kayttokokemuksestasi")}
      onClose={onClose}
      maxWidth={"sm"}
    >
      <DialogContent>
        <p>{t("palautekyselymuistutus:kerro-kayttokokemuksestasi-vastaa-kyselyyn")}</p>
        <p>{t("palautekyselymuistutus:kerro-kayttokokemuksestasi-saatu-palaute")}</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} id="close_kerro_kayttokokemuksestasi">
          {t("common:sulje")}
        </Button>
        <ButtonLink href={kyselyTiedot.href} target="_blank" primary id="link_kerro_kayttokokemuksesi_popup" endIcon="external-link-alt">
          {t("projekti:muistutuslomake.kerro_kayttokokemuksestasi_linkki")}
        </ButtonLink>
      </DialogActions>
    </HassuDialog>
  );
}
