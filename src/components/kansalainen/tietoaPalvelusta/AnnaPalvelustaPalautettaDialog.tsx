import Button from "@components/button/Button";
import Textarea from "@components/form/Textarea";
import HassuDialog, { HassuDialogProps } from "@components/HassuDialog";
import ContentSpacer from "@components/layout/ContentSpacer";
import { DialogActions, DialogContent } from "@mui/material";
import useTranslation from "next-translate/useTranslation";
import React, { useCallback } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import StyledRating from "./StyledRating";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import useSnackbars from "src/hooks/useSnackbars";

interface PalauteFormData {
  arvosana: number | undefined | null;
  kehitysehdotus: string;
}

export const palautelomakeSchema = Yup.object().shape({
  kehitysehdotus: Yup.string().notRequired(),
  arvosana: Yup.number().required().positive().integer().min(1).max(10),
});

const defaultValues: PalauteFormData = {
  arvosana: null,
  kehitysehdotus: "",
};

export default function AnnaPalvelustaPalautettaDialog(props: Omit<HassuDialogProps, "children">) {
  const { handleSubmit, register, control } = useForm<PalauteFormData>({
    resolver: yupResolver(palautelomakeSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });
  const { t } = useTranslation("tietoa-palvelusta/yhteystiedot-ja-palaute");

  const { showInfoMessage } = useSnackbars();

  const closeDialog = useCallback(() => {
    props?.onClose?.({}, "escapeKeyDown");
  }, [props]);

  const laheta: SubmitHandler<PalauteFormData> = useCallback(
    (_data) => {
      showInfoMessage(t("palautetta-palvelusta.dialogi.kiitos"));
      closeDialog();
    },
    [closeDialog, showInfoMessage, t]
  );

  const peruuta: React.MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    closeDialog();
  }, [closeDialog]);

  return (
    <HassuDialog
      scroll="paper"
      PaperProps={{ sx: { maxHeight: "95vh", minHeight: "95vh" } }}
      title={t("palautetta-palvelusta.dialogi.otsikko")}
      {...props}
    >
      <form style={{ display: "contents" }}>
        <DialogContent sx={{ overflow: "scroll", overflowX: "visible", overflowY: "scroll" }}>
          <ContentSpacer gap={8}>
            <p>{t("palautetta-palvelusta.dialogi.kappale1")}</p>
            <h5 className="vayla-small-title">{t("palautetta-palvelusta.dialogi.minka-arvosanan-antaisit-palvelulle.otsikko")}</h5>
            <p className="vayla-label">{t("palautetta-palvelusta.dialogi.minka-arvosanan-antaisit-palvelulle.kappale1")}</p>
            <p>{t("palautetta-palvelusta.dialogi.minka-arvosanan-antaisit-palvelulle.kappale2")}</p>
            <Controller
              control={control}
              name="arvosana"
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <>
                  <StyledRating
                    value={value}
                    onChange={(_event, value) => {
                      onChange(value);
                    }}
                  />
                  {error && <p className="text-red">{t("palautetta-palvelusta.dialogi.anna-arvosana")}</p>}
                </>
              )}
            />
            <h5 className="vayla-small-title">{t("palautetta-palvelusta.dialogi.miten-kehittaisit-palvelua-paremmaksi.otsikko")}</h5>
            <Textarea
              minRows={3}
              {...register("kehitysehdotus")}
              label={t("palautetta-palvelusta.dialogi.miten-kehittaisit-palvelua-paremmaksi.tekstikentan-nimike")}
            />
            <p>{t("palautetta-palvelusta.dialogi.miten-kehittaisit-palvelua-paremmaksi.kappale1")}</p>
          </ContentSpacer>
        </DialogContent>
        <DialogActions>
          <Button type="button" primary onClick={handleSubmit(laheta)}>
            {t("palautetta-palvelusta.dialogi.laheta")}
          </Button>
          <Button type="button" onClick={peruuta}>
            {t("palautetta-palvelusta.dialogi.peruuta")}
          </Button>
        </DialogActions>
      </form>
    </HassuDialog>
  );
}
