import Button from "@components/button/Button";
import Textarea from "@components/form/Textarea";
import HassuDialog, { HassuDialogProps } from "@components/HassuDialog";
import ContentSpacer from "@components/layout/ContentSpacer";
import { DialogActions, DialogContent, useMediaQuery, useTheme } from "@mui/material";
import useTranslation from "next-translate/useTranslation";
import React, { useCallback } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { ResponsiveRating } from "./StyledRating";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import useSnackbars from "src/hooks/useSnackbars";
import useApi from "src/hooks/useApi";

interface PalauteFormData {
  arvosana: number;
  kehitysehdotus: string;
}

export const palautelomakeSchema = Yup.object().shape({
  kehitysehdotus: Yup.string().notRequired(),
  arvosana: Yup.number().required().positive().integer().min(1).max(10),
});

const defaultValues: PalauteFormData = {
  arvosana: 0,
  kehitysehdotus: "",
};

export default function AnnaPalvelustaPalautettaDialog(props: Omit<HassuDialogProps, "children">) {
  const { handleSubmit, register, control } = useForm<PalauteFormData>({
    resolver: yupResolver(palautelomakeSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });
  const { t } = useTranslation("tietoa-palvelusta/palautetta-palvelusta-dialog");

  const { showInfoMessage } = useSnackbars();

  const api = useApi();

  const closeDialog = useCallback(() => {
    props?.onClose?.({}, "escapeKeyDown");
  }, [props]);

  const laheta: SubmitHandler<PalauteFormData> = useCallback(
    async (data) => {
      try {
        await api.annaPalvelustaPalautetta(data);
        showInfoMessage(t("kiitos"));
        closeDialog();
      } catch {
        // ApiProvider tulostaa virheilmoituksen käyttöliittymään
      }
    },
    [api, closeDialog, showInfoMessage, t]
  );

  const peruuta: React.MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    closeDialog();
  }, [closeDialog]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <HassuDialog scroll="paper" fullScreen={isMobile} title={t("otsikko")} {...props}>
      <form style={{ display: "contents" }}>
        <DialogContent>
          <ContentSpacer gap={8}>
            <p>{t("kappale1")}</p>
            <h5 className="vayla-small-title">{t("minka-arvosanan-antaisit-palvelulle.otsikko")}</h5>
            <p className="vayla-label">{t("minka-arvosanan-antaisit-palvelulle.kappale1")}</p>
            <p>{t("minka-arvosanan-antaisit-palvelulle.kappale2")}</p>
            <Controller
              control={control}
              name="arvosana"
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <div>
                  <ResponsiveRating value={value} onChange={onChange} />
                  {error && <p className="text-red">{t("anna-arvosana")}</p>}
                </div>
              )}
            />
            <h5 className="vayla-small-title">{t("miten-kehittaisit-palvelua-paremmaksi.otsikko")}</h5>
            <Textarea minRows={3} {...register("kehitysehdotus")} label={t("miten-kehittaisit-palvelua-paremmaksi.tekstikentan-nimike")} />
            <p>{t("miten-kehittaisit-palvelua-paremmaksi.kappale1")}</p>
          </ContentSpacer>
        </DialogContent>
        <DialogActions>
          <Button type="button" primary onClick={handleSubmit(laheta)}>
            {t("laheta")}
          </Button>
          <Button type="button" onClick={peruuta}>
            {t("peruuta")}
          </Button>
        </DialogActions>
      </form>
    </HassuDialog>
  );
}
