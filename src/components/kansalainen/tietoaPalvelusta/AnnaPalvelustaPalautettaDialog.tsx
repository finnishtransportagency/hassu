import Button from "@components/button/Button";
import Textarea from "@components/form/Textarea";
import HassuDialog, { HassuDialogProps } from "@components/HassuDialog";
import ContentSpacer from "@components/layout/ContentSpacer";
import { DialogActions, DialogContent, RatingProps } from "@mui/material";
import useTranslation from "next-translate/useTranslation";
import React, { useCallback, useState } from "react";
import StyledRating from "./StyledRating";

export default function AnnaPalvelustaPalautettaDialog({ children, ...props }: HassuDialogProps) {
  const [value, setValue] = useState<number | null>(null);

  const onChange: RatingProps["onChange"] = useCallback((_event, value) => {
    setValue(value);
  }, []);

  const laheta: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      props?.onClose?.(e, "escapeKeyDown");
    },
    [props]
  );

  const peruuta: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      props?.onClose?.(e, "escapeKeyDown");
    },
    [props]
  );

  const { t } = useTranslation("tietoa-palvelusta/yhteystiedot-ja-palaute");
  return (
    <HassuDialog {...props} title={t("palautetta-palvelusta.dialogi.otsikko")}>
      <DialogContent sx={{ overflow: "visible" }}>
        <ContentSpacer gap={8}>
          <p>{t("palautetta-palvelusta.dialogi.kappale1")}</p>
          <h5 className="vayla-small-title">{t("palautetta-palvelusta.dialogi.minka-arvosanan-antaisit-palvelulle.otsikko")}</h5>
          <p className="vayla-label">{t("palautetta-palvelusta.dialogi.minka-arvosanan-antaisit-palvelulle.kappale1")}</p>
          <p>{t("palautetta-palvelusta.dialogi.minka-arvosanan-antaisit-palvelulle.kappale2")}</p>
          <StyledRating value={value} onChange={onChange} />
          <h5 className="vayla-small-title">{t("palautetta-palvelusta.dialogi.miten-kehittaisit-palvelua-paremmaksi.otsikko")}</h5>
          <Textarea minRows={3} label={t("palautetta-palvelusta.dialogi.miten-kehittaisit-palvelua-paremmaksi.tekstikentan-nimike")} />
          <p>{t("palautetta-palvelusta.dialogi.miten-kehittaisit-palvelua-paremmaksi.kappale1")}</p>
        </ContentSpacer>
      </DialogContent>
      <DialogActions>
        <Button primary onClick={laheta}>
          {t("palautetta-palvelusta.dialogi.laheta")}
        </Button>
        <Button onClick={peruuta}>{t("palautetta-palvelusta.dialogi.peruuta")}</Button>
      </DialogActions>
      {children}
    </HassuDialog>
  );
}
