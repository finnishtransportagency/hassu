import { DialogActions, DialogContent } from "@mui/material";
import React, { ReactElement, useCallback, useState } from "react";
import Button from "@components/button/Button";
import HassuStack from "@components/layout/HassuStack";
import HassuDialog from "@components/HassuDialog";
import HassuGrid from "@components/HassuGrid";
import { FormProvider, useForm, UseFormProps, Controller, FieldError } from "react-hook-form";
import { palauteSchema } from "src/schemas/vuorovaikutus";
import { yupResolver } from "@hookform/resolvers/yup";
import useTranslation from "next-translate/useTranslation";
import { VuorovaikutusJulkinen, ProjektiJulkinen, PalauteInput, api } from "@services/api";
import { formatDate } from "src/util/dateUtils";
import TextInput from "@components/form/TextInput";
import Textarea from "@components/form/Textarea";
import CheckBox from "@components/form/CheckBox";
import IconButton from "@components/button/IconButton";
import FormGroup from "@components/form/FormGroup";
import axios from "axios";
import HassuSpinner from "@components/HassuSpinner";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";

interface Props {
  open: boolean;
  onClose: () => void;
  vuorovaikutus: VuorovaikutusJulkinen;
  projekti: ProjektiJulkinen;
}

interface PalauteFormInput {
  etunimi: string;
  sukunimi: string;
  sahkoposti: string;
  puhelinnumero: string;
  kysymysTaiPalaute: string;
  yhteydenottotapaEmail: boolean | null;
  yhteydenottotapaPuhelin: boolean | null;
  liite: string | null;
}

const defaultValues = {
  kysymysTaiPalaute: "",
  yhteydenottotapaEmail: false,
  yhteydenottotapaPuhelin: false,
  liite: null
};

export default function PalauteLomakeDialogi({ open, onClose, projekti, vuorovaikutus }: Props): ReactElement {
  const { t } = useTranslation();
  const [tiedosto, setTiedosto] = useState<File | undefined>(undefined);
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);
  const [kiitosDialogiOpen, setKiitosDialogiOpen] = useState(false);
  const [tiedostoLiianSuuri, setTiedostoLiianSuuri] = useState(false);

  const formOptions: UseFormProps<PalauteFormInput> = {
    resolver: yupResolver(palauteSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues
  };
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const useFormReturn = useForm<PalauteFormInput>(formOptions);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    reset
  } = useFormReturn;

  const talletaTiedosto = useCallback(async (tiedosto: File) => {
    const contentType = (tiedosto as Blob).type || "application/octet-stream";
    const response = await api.valmisteleTiedostonLataus(tiedosto.name, contentType);
    await axios.put(response.latausLinkki, tiedosto, {
      headers: {
        "Content-Type": contentType,
      },
    });
    return response.tiedostoPolku;
  }, []);

  const save = useCallback(
    async (formData: PalauteFormInput) => {
      setFormIsSubmitting(true);
      try {
        const palauteFinalValues : PalauteInput = { ...formData, liite: null };
        if (tiedosto) {
          palauteFinalValues.liite = await talletaTiedosto(tiedosto);
        }
        (Object.keys(palauteFinalValues) as Array<keyof PalauteInput>).forEach(key => {
          if (!palauteFinalValues[key]) delete palauteFinalValues[key];
        });
        await api.lisaaPalaute(projekti.oid, palauteFinalValues);
        showSuccessMessage(t("common:ilmoitukset.tallennus_onnistui"));
        onClose();
        setKiitosDialogiOpen(true);
        reset(defaultValues);
      } catch (e) {
        log.log("OnSubmit Error", e);
        showErrorMessage(t("common:ilmoitukset.tallennuksessa_tapahtui_virhe"));
      }
      setFormIsSubmitting(false);
    },
    [talletaTiedosto, projekti, onClose, showErrorMessage, showSuccessMessage, reset, t, tiedosto]
  );

  return (
    <>
      <HassuDialog
        scroll="body"
        open={open}
        title={t("projekti:jata_palaute_tai")}
        onClose={onClose}
        maxWidth={"md"}
      >
        <DialogContent>
          <p>
            {t("projekti:voit_jattaa_palautetta")}
          </p>
          <p style={{ fontWeight: "bold"}}>
            {t("projekti:kysymykset_ja_palautteet").replace(
              "xx.xx.xxxx",
              formatDate(vuorovaikutus.kysymyksetJaPalautteetViimeistaan)
            )}
          </p>
          <FormProvider {...useFormReturn}>
            <form>
              <HassuStack>
                <HassuGrid sx={{ width: "100%" }} cols={[1, 1, 2]}>
                  <TextInput
                    label={t("common:etunimi")}
                    {...register("etunimi")}
                    error={errors.etunimi}
                  />
                  <TextInput
                    label={t("common:sukunimi")}
                    {...register("sukunimi")}
                    error={errors.sukunimi}
                  />
                  <TextInput
                    label={t("common:sahkoposti")}
                    {...register("sahkoposti")}
                    error={errors?.sahkoposti?.message ? { message: t(`common:virheet.${errors.sahkoposti.message}`) } as FieldError: undefined}
                  />
                  <TextInput
                    style={{ maxWidth: "15em" }}
                    label={t("common:puhelinnumero")}
                    {...register("puhelinnumero")}
                    error={errors.puhelinnumero}
                  />
                </HassuGrid>
              </HassuStack>
              <Textarea
                minRows={3}
                maxRows={13}
                className="mt-4"
                label={t("projekti:palautelomake.palaute")}
                {...register("kysymysTaiPalaute")}
                error={errors?.kysymysTaiPalaute?.message ? { message: t(`common:virheet.${errors.kysymysTaiPalaute.message}`) } as FieldError: undefined}
              />
              <div>
                <p style={{ fontWeight: "bold" }}>{t("projekti:palautelomake.toivottu_yhteydenottotapa")}</p>
                <div>
                  <CheckBox
                    label={t("common:sahkoposti")}
                    {...register("yhteydenottotapaEmail")}
                  />
                </div>
                <div>
                  <CheckBox
                    label={t("projekti:palautelomake.puhelinsoitto")}
                    {...register("yhteydenottotapaPuhelin")}
                  />
                </div>
              </div>
              <div className="mt-3">
                <p style={{ fontWeight: "bold" }}>{t("common:liite")}</p>
                <p>{t("projekti:palautelomake.tuetut_tiedostomuodot_ovat")}</p>
                {tiedosto
                  ? <FormGroup
                      label={t("common:valittu_tiedosto")}
                      errorMessage={errors?.liite?.message ? t(`common:virheet.${errors.liite.message}`) : ""}
                    >
                      <HassuStack direction="row">
                        <div style={{ marginTop: "auto", marginBottom: "auto" }}>
                          <div>{tiedosto.name}</div>
                          {tiedostoLiianSuuri && <div style={{ color: "red", fontWeight: "bold" }}>{t("common:tiedosto_on_liian_suuri")}</div>}
                        </div>
                        <IconButton
                          icon="trash"
                          onClick={() => {
                            setTiedosto(undefined);
                            setTiedostoLiianSuuri(false);
                            (document.getElementById("file-input") as HTMLInputElement).value = "";
                            setValue("liite", null);
                          }}
                        />
                      </HassuStack>
                    </FormGroup>
                  : <Button
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById("file-input")?.click()
                      }}
                    >
                      {t("common:hae_tiedosto")}
                    </Button>
                }
                <Controller
                  render={({ field }) =>
                    <input
                      className="hidden"
                      id="file-input"
                      type="file"
                      accept="image/jpeg, image/png, image/jpg, application/pdf"
                      onChange={(e) => {
                        const tiedosto = e.target.files?.[0];
                        setTiedosto(tiedosto);
                        if (tiedosto && tiedosto.size > 4500000) {
                          setTiedostoLiianSuuri(true);
                        }
                        field.onChange(e.target.value)
                      }}
                    />
                  }
                  name="liite"
                  control={control}
                  defaultValue={null}
                  shouldUnregister
                />
              </div>
            </form>
          </FormProvider>
        </DialogContent>

        <DialogActions>
          <Button primary onClick={handleSubmit(save)} disabled={tiedostoLiianSuuri}>
            {t("common:laheta")}
          </Button>
          <Button
            onClick={(e) => {
              onClose();
              e.preventDefault();
            }}
          >
            {t("common:peruuta")}
          </Button>
        </DialogActions>
        <HassuSpinner open={formIsSubmitting} />
      </HassuDialog>
      <KiitosDialogi
        open={kiitosDialogiOpen}
        onClose={() => setKiitosDialogiOpen(false)}
      />
    </>
  );
}

interface KiitosProps {
  open: boolean;
  onClose: () => void;
}

export function KiitosDialogi({ open, onClose}: KiitosProps): ReactElement {
  const { t } = useTranslation();
  return (
    <HassuDialog
      scroll="body"
      open={open}
      title={t("projekti:palautelomake.kiitos_viestista")}
      onClose={onClose}
      maxWidth={"sm"}
    >
      <DialogContent>
        <p>{t("projekti:palautelomake.olemme_vastaanottaneet_viestisi")}</p>
        <p>{t("projekti:palautelomake.kaikki_viestit_kasitellaan")}</p>
        <p>{t("projekti:palautelomake.jos_toivoit_yhteydenottoa")}</p>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          primary
        >
          {t("common:sulje")}
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}



