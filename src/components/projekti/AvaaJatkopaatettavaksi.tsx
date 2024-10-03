import React, { useCallback, useState } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { api, HyvaksymispaatosInput, JatkopaatettavaVaihe, KasittelynTila } from "@services/api";
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

type AvaaJatkopaatettavaksiPainikeProps = {
  jatkopaatettavaVaihe: JatkopaatettavaVaihe;
  projekti: ProjektiLisatiedolla;
};

const titles: Record<JatkopaatettavaVaihe, string> = {
  JATKOPAATOS_1: "Avaa 1. jatkopäätös",
  JATKOPAATOS_2: "Avaa 2. jatkopäätös",
};

const jatkettavaVaiheKey: Record<JatkopaatettavaVaihe, keyof Pick<KasittelynTila, "ensimmainenJatkopaatos" | "toinenJatkopaatos">> = {
  JATKOPAATOS_1: "ensimmainenJatkopaatos",
  JATKOPAATOS_2: "toinenJatkopaatos",
};

const datepickerLabels: Record<JatkopaatettavaVaihe, string> = {
  JATKOPAATOS_1: "1. jatkopäätöksen päivä",
  JATKOPAATOS_2: "2. jatkopäätöksen päivä",
};

export function AvaaJatkopaatettavaksiPainike(props: AvaaJatkopaatettavaksiPainikeProps) {
  const [isOpen, setOpen] = useState(false);
  const formOptions: UseFormProps<HyvaksymispaatosInput, ProjektiValidationContext> = {
    resolver: yupResolver(hyvaksymispaatosSchema(jatkettavaVaiheKey[props.jatkopaatettavaVaihe]), { abortEarly: false, recursive: true }),
    defaultValues: {
      asianumero: props.projekti.kasittelynTila?.[jatkettavaVaiheKey[props.jatkopaatettavaVaihe]]?.asianumero || "",
      paatoksenPvm: props.projekti.kasittelynTila?.[jatkettavaVaiheKey[props.jatkopaatettavaVaihe]]?.paatoksenPvm || null,
    },
    mode: "onChange",
    reValidateMode: "onChange",
    shouldUnregister: true,
    context: { projekti: props.projekti },
  };
  const { handleSubmit, control, trigger } = useForm(formOptions);

  const { withLoadingSpinner } = useLoadingSpinner();
  const { showSuccessMessage } = useSnackbars();

  const openTallenna = useCallback(() => {
    setOpen(true);
  }, []);
  const closeTallenna = useCallback(() => {
    setOpen(false);
  }, []);

  const avaaJatkopaatos = useCallback(
    async (paatoksenTiedot: HyvaksymispaatosInput) =>
      await withLoadingSpinner(
        (async () => {
          try {
            await api.avaaProjektiJatkopaatettavaksi({ oid: props.projekti.oid, vaihe: props.jatkopaatettavaVaihe, paatoksenTiedot });
            showSuccessMessage("Projekti avattu jatkopäätettäksi");
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await router.push(`/yllapito/projekti/${props.projekti.oid}/henkilot`);
          } catch (e) {
            log.log("OnSubmit Error", e);
          }
          setOpen(false);
        })()
      ),
    [withLoadingSpinner, props.projekti.oid, props.jatkopaatettavaVaihe, showSuccessMessage]
  );

  const title = titles[props.jatkopaatettavaVaihe];

  return (
    <>
      <Button type="button" id="avaa_jatkopaatettavaksi" onClick={openTallenna}>
        {title}
      </Button>
      <HassuDialog open={isOpen} title={title} onClose={closeTallenna}>
        <form>
          <DialogContent>
            <div>
              <p>
                Olet avaamassa suunnitelmalle jatkopäätöksen kuulutuksen lomakkeen. Painamalla Avaa jatkopäätettäväksi -painiketta tallennat
                jatkopäätöksen tiedot ja siirryt Projektin henkilöt -sivulle.
              </p>
              <p>
                Jollei jatkopäätöksen tietoja ole vielä tiedossa, voidaan ne jättää toistaiseksi tyhjäksi. Tiedot voidaan myöhemmin
                päivittää Käsittelyn tila -sivulta.
              </p>
              <p>Päivitä Projektivelhosta projektipäällikkö ajantasalle ja päivitä sen jälkeen Projektin henkilöt -sivu.</p>
            </div>
            <HassuGrid cols={{ lg: 3 }}>
              <HassuDatePickerWithController
                label={datepickerLabels[props.jatkopaatettavaVaihe]}
                controllerProps={{ control, name: "paatoksenPvm" }}
                onChange={() => {
                  trigger("asianumero");
                }}
              />
              <TextFieldWithController
                label="Asiatunnus"
                controllerProps={{ control, name: "asianumero" }}
                onChange={() => {
                  trigger("paatoksenPvm");
                }}
              />
            </HassuGrid>
          </DialogContent>
          <DialogActions>
            <Button primary type="button" id="accept_and_save_jatkopaatos" onClick={handleSubmit(avaaJatkopaatos)}>
              Avaa jatkopäätettäväksi
            </Button>
            <Button type="button" onClick={closeTallenna}>
              Peruuta
            </Button>
          </DialogActions>
        </form>
      </HassuDialog>
    </>
  );
}
