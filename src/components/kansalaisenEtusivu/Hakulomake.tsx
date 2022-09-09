import React, { useState, useCallback, useEffect, useMemo } from "react";
import SearchSection from "@components/layout/SearchSection";
import { HakulomakeOtsikko, HakuehtoNappi, VinkkiTeksti, VinkkiLinkki, MobiiliBlokki } from "./TyylitellytKomponentit";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import TextInput from "@components/form/TextInput";
import Select, { SelectOption } from "@components/form/Select";
import Button from "@components/button/Button";
import { ProjektiTyyppi } from "../../../common/graphql/apiModel";
import { useRouter } from "next/router";
import HassuGrid from "@components/HassuGrid";
import HassuGridItem from "@components/HassuGridItem";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";

type HakulomakeFormValues = {
  vapaasanahaku: string;
  kunta: string;
  maakunta: string;
  vaylamuoto: string;
};

export default function Hakulomake() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));
  const [kuntaOptions, setKuntaOptions] = useState<SelectOption[]>([]);
  const [pienennaHakuState, setPienennaHakuState] = useState<boolean>(false);
  const [lisaaHakuehtojaState, setLisaaHakuehtojaState] = useState<boolean>(false);

  const getKuntaLista = useCallback(async () => {
    const list = await (await fetch("/api/kuntalista.json")).json();
    setKuntaOptions(list);
  }, [setKuntaOptions]);

  useEffect(() => {
    getKuntaLista();
  }, [getKuntaLista]);

  const router = useRouter();
  const vapaasanahaku = typeof router.query?.vapaasanahaku === "string" ? router.query.vapaasanahaku : "";
  const kunta =
    kuntaOptions.find((option) => router.query?.kunta === option.value) && typeof router.query?.kunta === "string"
      ? router.query.kunta
      : "";
  const maakunta =
    ([] as SelectOption[]).find((option) => router.query?.maakunta === option.value) && typeof router.query?.maakunta === "string"
      ? router.query.maakunta
      : "";
  const vaylamuoto =
    Object.keys(ProjektiTyyppi).find((option) => router.query?.vaylamuoto === option) && typeof router.query?.vaylamuoto === "string"
      ? router.query.vaylamuoto
      : "";
  const pienennaHaku = router.query?.pienennahaku === "true" ? true : false;
  const lisaaHakuehtoja = router.query?.lisaahakuehtoja === "true" ? true : false;

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
    watch,
  } = useFormReturn;

  const nykKuntaArvo = watch("kunta");

  useEffect(() => {
    setValue("vapaasanahaku", defaultValues.vapaasanahaku);
    setValue("kunta", defaultValues.kunta);
    setValue("maakunta", defaultValues.maakunta);
    setValue("vaylamuoto", defaultValues.vaylamuoto);
  }, [setValue, defaultValues, kuntaOptions, nykKuntaArvo]);

  useEffect(() => {
    setPienennaHakuState(pienennaHaku);
    setLisaaHakuehtojaState(lisaaHakuehtoja);
  }, [lisaaHakuehtoja, pienennaHaku]);

  return (
    <div className="mb-6 pb-8">
      {!desktop && (
        <MobiiliBlokki
          onClick={(e) => {
            e.preventDefault();
            setPienennaHakuState(!pienennaHakuState);
          }}
        >
          Suunnitelmien haku
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
          <HakulomakeOtsikko>Suunnitelmien haku</HakulomakeOtsikko>
          <FormProvider {...useFormReturn}>
            <form>
              <HassuGrid cols={{ xs: 1, md: 1, lg: 3, xl: 3 }}>
                {" "}
                <HassuGridItem colSpan={{ xs: 1, lg: 2 }}>
                  <TextInput label="Vapaasanahaku" {...register("vapaasanahaku")} error={errors?.vapaasanahaku} />
                  {desktop && (
                    <VinkkiTeksti>
                      Vinkki: kokeile &apos;valtatie&apos;-sanan sijaan &apos;vt&apos;, joko yhteen tai erikseen kirjoitettuna tien numeron
                      kanssa. Katso lisää{" "}
                      <VinkkiLinkki className="skaalaa" href="">
                        hakuohjeista
                      </VinkkiLinkki>
                      .
                    </VinkkiTeksti>
                  )}
                </HassuGridItem>
                <Select
                  className="w-100"
                  id="kunta"
                  label="Kunta"
                  options={kuntaOptions ? kuntaOptions : [{ label: "", value: "" }]}
                  error={errors?.kunta}
                  {...register("kunta", { shouldUnregister: false })}
                />
              </HassuGrid>
              {desktop &&
                (lisaaHakuehtojaState ? (
                  <HakuehtoNappi
                    onClick={(e) => {
                      e.preventDefault();
                      setLisaaHakuehtojaState(false);
                    }}
                  >
                    Vähemmän hakuehtoja
                    <FontAwesomeIcon
                      icon="chevron-up"
                      className={classNames("ml-3 pointer-events-none text-primary-dark")}
                      style={{ top: `calc(50% - 0.5rem)` }}
                    />
                  </HakuehtoNappi>
                ) : (
                  <HakuehtoNappi
                    onClick={(e) => {
                      e.preventDefault();
                      setLisaaHakuehtojaState(true);
                    }}
                  >
                    Lisää hakuehtoja
                    <FontAwesomeIcon
                      icon="chevron-down"
                      className={classNames("ml-3 pointer-events-none text-primary-dark")}
                      style={{ top: `calc(50% - 0.5rem)` }}
                    />
                  </HakuehtoNappi>
                ))}
              {(!desktop || (desktop && lisaaHakuehtojaState)) && (
                <HassuGrid className="mt-4 mb-6" cols={{ xs: 1, md: 1, lg: 3, xl: 3 }}>
                  <HassuGridItem colSpan={{ xs: 1, lg: 1 }}>
                    <Select
                      id="maakunta"
                      label="Maakunta"
                      options={[{ label: "", value: "" }]}
                      error={errors?.maakunta}
                      {...register("maakunta", { shouldUnregister: true })}
                    />
                  </HassuGridItem>
                  <HassuGridItem colSpan={{ xs: 1, lg: 1 }}>
                    <Select
                      id="vaylamuoto"
                      label="Väylämuoto"
                      options={Object.keys(ProjektiTyyppi).map((tyyppi) => ({ label: tyyppi, value: tyyppi }))}
                      error={errors?.vaylamuoto}
                      {...register("vaylamuoto", { shouldUnregister: false })}
                    />
                  </HassuGridItem>
                </HassuGrid>
              )}

              {!desktop && (
                <VinkkiTeksti>
                  Vinkki: kokeile &apos;valtatie&apos;-sanan sijaan &apos;vt&apos;, joko yhteen tai erikseen kirjoitettuna tien numeron
                  kanssa. Katso lisää{" "}
                  <VinkkiLinkki className="skaalaa" href="">
                    hakuohjeista
                  </VinkkiLinkki>
                  .
                </VinkkiTeksti>
              )}

              <Button
                primary
                style={{ marginRight: "auto", marginTop: "1em", marginBottom: "1.5em" }}
                endIcon="search"
                id="hae"
                disabled={false}
              >
                Hae
              </Button>
            </form>
          </FormProvider>
        </SearchSection>
      )}
    </div>
  );
}
