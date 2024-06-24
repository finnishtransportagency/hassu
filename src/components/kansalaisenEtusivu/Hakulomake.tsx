import React, { useCallback, useEffect, useMemo, useState } from "react";
import SearchSection from "@components/layout/SearchSection";
import { HakuehtoNappi, HakutulosInfo, MobiiliBlokki } from "./TyylitellytKomponentit";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import TextInput from "@components/form/TextInput";
import { SelectOption } from "@components/form/Select";
import Button from "@components/button/Button";
import { HookReturnType } from "@pages/index";
import HassuGrid from "@components/HassuGrid";
import HassuGridItem from "@components/HassuGridItem";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import { useRouter } from "next/router";
import useTranslation from "next-translate/useTranslation";
import Trans from "next-translate/Trans";
import omitUnnecessaryFields from "src/util/omitUnnecessaryFields";
import MenuItem from "@mui/material/MenuItem";
import HassuMuiSelect from "@components/form/HassuMuiSelect";
import { H2 } from "@components/Headings";

type HakulomakeFormValues = {
  vapaasanahaku: string;
  kunta: string;
  maakunta: string;
  vaylamuoto: string;
};

type Props = {
  hakutulostenMaara: number | null | undefined;
  kuntaOptions: SelectOption[];
  maakuntaOptions: SelectOption[];
  query: HookReturnType;
};

export default function HakulomakeWrapper({ hakutulostenMaara, maakuntaOptions, kuntaOptions, query }: Props) {
  if (!query) {
    return null;
  }
  return <Hakulomake hakutulostenMaara={hakutulostenMaara} maakuntaOptions={maakuntaOptions} kuntaOptions={kuntaOptions} query={query} />;
}

function Hakulomake({ hakutulostenMaara, kuntaOptions, maakuntaOptions, query }: Props) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));
  const [pienennaHakuState, setPienennaHakuState] = useState<boolean>(false);
  const [lisaaHakuehtojaState, setLisaaHakuehtojaState] = useState<boolean>(false);
  const router = useRouter();
  const { t } = useTranslation("etusivu");

  const { vapaasanahaku, kunta, maakunta, vaylamuoto, pienennaHaku, lisaaHakuehtoja } = query;
  const vaylamuotoOptions = ["tie", "rata"].map((muoto) => ({
    label: t(`projekti:projekti-vayla-muoto.${muoto}`),
    value: muoto,
  }));

  const defaultValues: HakulomakeFormValues = useMemo(
    () => ({
      vapaasanahaku,
      kunta,
      maakunta,
      vaylamuoto,
    }),
    [vapaasanahaku, kunta, maakunta, vaylamuoto]
  );

  const formOptions: UseFormProps<HakulomakeFormValues> = {
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
  };
  const useFormReturn = useForm<HakulomakeFormValues>(formOptions);
  const {
    register,
    formState: { errors },
    setValue,
    handleSubmit,
    control,
  } = useFormReturn;

  useEffect(() => {
    // Alustaa hakulomakkeen url query parametrien perusteella
    setValue("vapaasanahaku", defaultValues.vapaasanahaku);
    setValue("kunta", defaultValues.kunta);
    setValue("maakunta", defaultValues.maakunta);
    setValue("vaylamuoto", defaultValues.vaylamuoto);
  }, [setValue, defaultValues, kuntaOptions]);

  useEffect(() => {
    // Asettaa sisäisen auki/kiinni-tilan url query parametrien perusteella
    setPienennaHakuState(pienennaHaku);
    setLisaaHakuehtojaState(lisaaHakuehtoja);
  }, [lisaaHakuehtoja, pienennaHaku]);

  const nollaaHakuehdot: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.preventDefault();
      router.push(
        {
          pathname: router.pathname,
          query: {},
        },
        undefined,
        { shallow: true }
      );
    },
    [router]
  );

  const haeSuunnitelmat = useCallback(
    // Asettaa url queryparametrit, jotka myös säästävät auki/kiinni-tilan.
    // Varsinainen haku tapahtuu sivun pääkomponentissa niiden perusteella
    (data: HakulomakeFormValues) => {
      router.push(
        {
          pathname: router.pathname,
          query: omitUnnecessaryFields({
            vapaasanahaku: data.vapaasanahaku,
            kunta: data.kunta,
            maakunta: data.maakunta,
            vaylamuoto: data.vaylamuoto,
            pienennahaku: pienennaHakuState,
            lisaahakuehtoja: lisaaHakuehtojaState,
            sivu: 1,
          }),
        },
        undefined,
        { shallow: true }
      );
    },
    [router, pienennaHakuState, lisaaHakuehtojaState]
  );

  const pienennaHakuHandler = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.preventDefault();
      setPienennaHakuState(!pienennaHakuState);
    },
    [pienennaHakuState]
  );

  const lisaaHakuehtojaHandler = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.preventDefault();
      setLisaaHakuehtojaState(!lisaaHakuehtojaState);
    },
    [lisaaHakuehtojaState]
  );

  return (
    <div className="mb-6">
      {!desktop && ( // Vain mobiilissa näkyvöä sininen palkki, josta voi avata ja sulkea hakukentät
        <MobiiliBlokki id="pienenna_hakulomake_button" onClick={pienennaHakuHandler}>
          {t("suunnitelmien-haku")}
          {pienennaHakuState ? (
            <FontAwesomeIcon
              icon="chevron-down"
              className={classNames("float-right mt-1 pointer-events-none text-white")}
              style={{ top: `calc(50% - 0.5rem)` }}
            />
          ) : (
            <FontAwesomeIcon
              icon="chevron-up"
              className={classNames("float-right mt-1 pointer-events-none text-white")}
              style={{ top: `calc(50% - 0.5rem)` }}
            />
          )}
        </MobiiliBlokki>
      )}

      {(desktop || (!desktop && !pienennaHakuState)) && (
        <SearchSection noDivider>
          <H2 id="mainPageContent">{t("suunnitelmien-haku")}</H2>
          <FormProvider {...useFormReturn}>
            <form className="mt-4">
              <HassuGrid cols={{ xs: 1, md: 1, lg: 3, xl: 3 }}>
                {" "}
                <HassuGridItem colSpan={{ xs: 1, lg: 2 }}>
                  <TextInput label={t("vapaasanahaku")} {...register("vapaasanahaku")} error={errors?.vapaasanahaku} id="vapaasanahaku" />
                </HassuGridItem>
                <HassuMuiSelect name="kunta" label={t("kunta")} control={control} defaultValue="">
                  {kuntaOptions.map((option) => {
                    return (
                      <MenuItem key={option.label} value={option.value}>
                        {option.label}
                      </MenuItem>
                    );
                  })}
                </HassuMuiSelect>
              </HassuGrid>
              {desktop && (
                // Desktop-näkymässä on mahdollista piilottaa tai paljastaa kaksi vikaa hakukenttää.
                // Tässä on nappi sitä varten.
                <HakuehtoNappi id="lisaa_hakuehtoja_button" onClick={lisaaHakuehtojaHandler}>
                  {lisaaHakuehtojaState ? t("vahemman-hakuehtoja") : t("lisaa-hakuehtoja")}
                  <FontAwesomeIcon
                    icon={`chevron-${lisaaHakuehtojaState ? "up" : "down"}`}
                    className={classNames("ml-3 pointer-events-none text-primary-dark")}
                    style={{ top: `calc(50% - 0.5rem)` }}
                  />
                </HakuehtoNappi>
              )}
              {(!desktop || (desktop && lisaaHakuehtojaState)) && (
                //Desktop-näkymässä nämä hakukentät näkyvät vain, jos käyttäjä on avannut ne näkyviin

                <HassuGrid cols={{ xs: 1, md: 1, lg: 3, xl: 3 }}>
                  <HassuMuiSelect name="maakunta" label={t("maakunta")} control={control} defaultValue="">
                    {maakuntaOptions.map((option) => {
                      return (
                        <MenuItem key={option.label} value={option.value}>
                          {option.label}
                        </MenuItem>
                      );
                    })}
                  </HassuMuiSelect>
                  <HassuMuiSelect name="vaylamuoto" label={t("vaylamuoto")} control={control} defaultValue="">
                    {vaylamuotoOptions
                      .filter((option) => option.value !== "")
                      .map((option) => {
                        return (
                          <MenuItem key={option.label} value={option.value}>
                            {option.label}
                          </MenuItem>
                        );
                      })}
                  </HassuMuiSelect>
                </HassuGrid>
              )}

              <Button
                type="submit"
                onClick={handleSubmit(haeSuunnitelmat)}
                primary
                style={{ marginRight: "auto", marginTop: "1em" }}
                endIcon="search"
                id="hae"
                disabled={false}
              >
                {t("hae")}
              </Button>
            </form>
          </FormProvider>
        </SearchSection>
      )}
      {hakutulostenMaara != undefined && (
        <HakutulosInfo className={desktop ? "" : "mobiili"}>
          <p id="hakutulosmaara" style={{ marginBottom: "0.5rem" }}>
            <Trans i18nKey="etusivu:loytyi-n-suunnitelmaa" values={{ lkm: hakutulostenMaara }} />
          </p>
          <button id="nollaa_hakuehdot_button" onClick={nollaaHakuehdot}>
            {t("nollaa-hakuehdot")}
          </button>
        </HakutulosInfo>
      )}
    </div>
  );
}
