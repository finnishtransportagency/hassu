import React, { useCallback, useEffect, useState } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { HyvaksymispaatosInput, JatkopaatettavaVaihe, KasittelynTila } from "@services/api";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useSnackbars from "src/hooks/useSnackbars";
import router from "next/router";
import { DialogActions, DialogContent } from "@mui/material";
import log from "loglevel";
import { useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { hyvaksymispaatosSchema } from "src/schemas/kasittelynTila";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "common/ProjektiValidationContext";
import HassuGrid from "@components/HassuGrid";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { TextFieldWithController } from "@components/form/TextFieldWithController";
import { H5 } from "@components/Headings";
import ContentSpacer from "@components/layout/ContentSpacer";
import { KeyedMutator } from "swr/dist/types";
import useApi from "src/hooks/useApi";

type PalautaAktiiviseksiButtonProps = {
  jatkopaatettavaVaihe: JatkopaatettavaVaihe;
  projekti: ProjektiLisatiedolla;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
};

const titles: Record<JatkopaatettavaVaihe, string> = {
  JATKOPAATOS_1: "1. jatkopäätös",
  JATKOPAATOS_2: "2. jatkopäätös",
};

const jatkettavaVaiheKey: Record<JatkopaatettavaVaihe, keyof Pick<KasittelynTila, "ensimmainenJatkopaatos" | "toinenJatkopaatos">> = {
  JATKOPAATOS_1: "ensimmainenJatkopaatos",
  JATKOPAATOS_2: "toinenJatkopaatos",
};

const datepickerLabels: Record<JatkopaatettavaVaihe, string> = {
  JATKOPAATOS_1: "1. jatkopäätöksen päivä",
  JATKOPAATOS_2: "2. jatkopäätöksen päivä",
};

export function PalautaAktiiviseksiButton(props: PalautaAktiiviseksiButtonProps) {
  const [isOpen, setOpen] = useState(false);
  const formOptions: UseFormProps<HyvaksymispaatosInput, ProjektiValidationContext> = {
    resolver: yupResolver(hyvaksymispaatosSchema(jatkettavaVaiheKey[props.jatkopaatettavaVaihe]), { abortEarly: false, recursive: true }),
    defaultValues: getDefaultValues(props),
    mode: "onChange",
    reValidateMode: "onChange",
    shouldUnregister: true,
    context: { projekti: props.projekti },
  };
  const { handleSubmit, control, trigger, reset } = useForm(formOptions);

  const api = useApi();

  useEffect(() => {
    reset(getDefaultValues(props));
  }, [props, reset]);

  const { withLoadingSpinner } = useLoadingSpinner();
  const { showSuccessMessage } = useSnackbars();

  const openTallenna = useCallback(() => {
    setOpen(true);
  }, []);
  const closeTallenna = useCallback(() => {
    setOpen(false);
  }, []);

  const palautaAktiviseksi = useCallback(
    async (paatoksenTiedot: HyvaksymispaatosInput) =>
      await withLoadingSpinner(
        (async () => {
          try {
            await api.aktivoiProjektiJatkopaatettavaksi({
              oid: props.projekti.oid,
              versio: props.projekti.versio,
              vaihe: props.jatkopaatettavaVaihe,
              paatoksenTiedot,
            });
            await props.reloadProjekti();
            showSuccessMessage("Projekti avattu jatkopäätettäksi");
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await router.push(`/yllapito/projekti/${props.projekti.oid}/henkilot`);
          } catch (e) {
            log.log("OnSubmit Error", e);
          }
          setOpen(false);
        })()
      ),
    [withLoadingSpinner, api, props, showSuccessMessage]
  );

  const title = titles[props.jatkopaatettavaVaihe];

  return (
    <>
      <Button type="button" id="open_palauta_aktiiviseksi_dialog" onClick={openTallenna}>
        Palauta aktiiviseksi
      </Button>
      <HassuDialog open={isOpen} title="Palauta aktiiviseksi" onClose={closeTallenna}>
        <form>
          <DialogContent sx={{ mb: 12 }}>
            <ContentSpacer gap={7}>
              <p>
                Olet palauttassa suunnitelman aktiiviseksi jatkopäättämistä varten. Painamalla Palauta aktiiviseksi -painiketta tallennat
                jatkopäätöksen tiedot ja siirryt Projektin henkilöt -sivulle.
              </p>
              <p>
                Varmistathan, että Projektivelhossa oleva projektipäällikkötieto on ajantasainen. Mikäli teet muutoksia Projektivelhon
                tietoihin, hae uudet tiedot projektille Projektin henkilöt -sivulta löytyvällä Päivitä tiedot -painikkeella.
              </p>
              <ContentSpacer>
                <H5>{title}</H5>
                <p>Anna päivämäärä, jolloin suunnitelma on saanut jatkopäätöksen sekä tämän asiatunnus.</p>
                <HassuGrid cols={{ lg: 3 }}>
                  <HassuDatePickerWithController
                    label={datepickerLabels[props.jatkopaatettavaVaihe]}
                    controllerProps={{ control, name: "paatoksenPvm" }}
                    onChange={(outputDate) => {
                      if (outputDate === null) {
                        trigger("asianumero");
                      }
                    }}
                  />
                  <TextFieldWithController
                    label="Asiatunnus"
                    controllerProps={{ control, name: "asianumero" }}
                    onChange={(event) => {
                      if (event.target.value === "") {
                        trigger("paatoksenPvm");
                      }
                    }}
                  />
                </HassuGrid>
                <p>
                  Jollei jatkopäätöksen tietoja ole vielä tiedossa, voidaan ne jättää toistaiseksi tyhjäksi. Tietoja voidaan myöhemmin
                  päivittää Käsittelyn tila -sivulta.
                </p>
              </ContentSpacer>
            </ContentSpacer>
          </DialogContent>
          <DialogActions>
            <Button primary type="button" id="accept_palauta_jatkopaatos" onClick={handleSubmit(palautaAktiviseksi)}>
              Palauta aktiiviseksi
            </Button>
            <Button type="button" id="cancel_palauta_jatkopaatos" onClick={closeTallenna}>
              Peruuta
            </Button>
          </DialogActions>
        </form>
      </HassuDialog>
    </>
  );
}

const getDefaultValues = (props: PalautaAktiiviseksiButtonProps): HyvaksymispaatosInput => ({
  asianumero: props.projekti.kasittelynTila?.[jatkettavaVaiheKey[props.jatkopaatettavaVaihe]]?.asianumero || "",
  paatoksenPvm: props.projekti.kasittelynTila?.[jatkettavaVaiheKey[props.jatkopaatettavaVaihe]]?.paatoksenPvm || null,
});
