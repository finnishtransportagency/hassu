import Button from "@components/button/Button";
import Textarea from "@components/form/Textarea";
import HassuDialog, { HassuDialogProps } from "@components/HassuDialog";
import ContentSpacer from "@components/layout/ContentSpacer";
import { DialogActions, DialogContent, Rating, Typography } from "@mui/material";
import useTranslation from "next-translate/useTranslation";
import React, { useState } from "react";

type Props = {};

export default function AnnaPalvelustaPalautettaDialog({ children, ...props }: HassuDialogProps) {
  const [value, setValue] = useState<number | null>(null);
  const { t } = useTranslation("tietoa-palvelusta/yhteystiedot-ja-palaute");
  return (
    <HassuDialog {...props} title={t("palautetta-palvelusta.dialogi.otsikko")}>
      <DialogContent>
        <ContentSpacer gap={8}>
          <p>{t("palautetta-palvelusta.dialogi.kappale1")}</p>
          <h5 className="vayla-small-title">{t("palautetta-palvelusta.dialogi.minka-arvosanan-antaisit-palvelulle.otsikko")}</h5>
          <p className="vayla-label">{t("palautetta-palvelusta.dialogi.minka-arvosanan-antaisit-palvelulle.kappale1")}</p>
          <p>{t("palautetta-palvelusta.dialogi.minka-arvosanan-antaisit-palvelulle.kappale2")}</p>
          <p style={{ backgroundColor: "greenyellow", height: "57px" }}>12345678910</p>
          <Typography component="legend">Controlled</Typography>
          <Rating
            name="simple-controlled"
            value={value}
            max={10}
            highlightSelectedOnly
            onChange={(_event, newValue) => {
              setValue(newValue);
            }}
          />
          <h5 className="vayla-small-title">{t("palautetta-palvelusta.dialogi.miten-kehittaisit-palvelua-paremmaksi.otsikko")}</h5>
          <Textarea minRows={3} label={t("palautetta-palvelusta.dialogi.miten-kehittaisit-palvelua-paremmaksi.tekstikentan-nimike")} />
          <p>{t("palautetta-palvelusta.dialogi.miten-kehittaisit-palvelua-paremmaksi.kappale1")}</p>
        </ContentSpacer>
      </DialogContent>
      <DialogActions>
        <Button primary onClick={(e) => props?.onClose(e, "escapeKeyDown")}>
          {t("palautetta-palvelusta.dialogi.laheta")}
        </Button>
        <Button onClick={(e) => props?.onClose(e, "escapeKeyDown")}>{t("palautetta-palvelusta.dialogi.peruuta")}</Button>
      </DialogActions>
      {children}
    </HassuDialog>
  );
}
