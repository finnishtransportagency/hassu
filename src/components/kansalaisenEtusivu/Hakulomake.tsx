import React, { useState, useCallback, useEffect, useMemo } from "react";
import SearchSection from "@components/layout/SearchSection";
import { HakulomakeOtsikko, HakuehtoNappi, VinkkiTeksti, VinkkiLinkki, MobiiliBlokki, HakutulosInfo } from "./TyylitellytKomponentit";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import TextInput from "@components/form/TextInput";
import Select, { SelectOption } from "@components/form/Select";
import Button from "@components/button/Button";
import { ProjektiTyyppi } from "../../../common/graphql/apiModel";
import { useHaunQueryparametrit } from "@pages/index";
import HassuGrid from "@components/HassuGrid";
import HassuGridItem from "@components/HassuGridItem";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import { useRouter } from "next/router";

type HakulomakeFormValues = {
  vapaasanahaku: string;
  kunta: string;
  maakunta: string;
  vaylamuoto: string;
};

type Props = {
  hakutulostenMaara: number | null | undefined;
  kuntaOptions: SelectOption[];
};

export default function Hakulomake({ hakutulostenMaara, kuntaOptions }: Props) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));
  const [pienennaHakuState, setPienennaHakuState] = useState<boolean>(false);
  const [lisaaHakuehtojaState, setLisaaHakuehtojaState] = useState<boolean>(false);
  const router = useRouter();

  const { vapaasanahaku, kunta, maakunta, vaylamuoto, pienennaHaku, lisaaHakuehtoja } = useHaunQueryparametrit({ kuntaOptions });

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

  const nollaaHakuehdot = useCallback(
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

  const vapaasanahakuInput = watch("vapaasanahaku");
  const kuntaInput = watch("kunta");
  const maakuntaInput = watch("maakunta");
  const vaylamuotoInput = watch("vaylamuoto");

  const haeSuunnitelmat = useCallback(
    // Asettaa url queryparametrit, jotka myös säästävät auki/kiinni-tilan.
    // Varsinainen haku tapahtuu sivun pääkomponentissa niiden perusteella
    (e) => {
      e.preventDefault();
      router.push(
        {
          pathname: router.pathname,
          query: {
            vapaasanahaku: vapaasanahakuInput,
            kunta: kuntaInput,
            maakunta: maakuntaInput,
            vaylamuoto: vaylamuotoInput,
            pienennahaku: pienennaHakuState,
            lisaahakuehtoja: lisaaHakuehtojaState,
            page: router.query.page || 1,
          },
        },
        undefined,
        { shallow: true }
      );
    },
    [router, vapaasanahakuInput, kuntaInput, maakuntaInput, vaylamuotoInput, pienennaHakuState, lisaaHakuehtojaState]
  );

  return (
    <div className="mb-6 pb-8">
      {!desktop && ( // Vain mobiilissa näkyvöä sininen palkki, josta voi avata ja sulkea hakukentät
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
              {desktop && (
                // Desktop-näkymässä on mahdollista piilottaa tai paljastaa kaksi vikaa hakukenttää.
                // Tässä on nappi sitä varten.
                <HakuehtoNappi
                  onClick={(e) => {
                    e.preventDefault();
                    setLisaaHakuehtojaState(!lisaaHakuehtojaState);
                  }}
                >
                  {lisaaHakuehtojaState ? "Vähemmän hakuehtoja" : "Lisää hakuehtoja"}
                  <FontAwesomeIcon
                    icon={`chevron-${lisaaHakuehtojaState ? "up" : "down"}`}
                    className={classNames("ml-3 pointer-events-none text-primary-dark")}
                    style={{ top: `calc(50% - 0.5rem)` }}
                  />
                </HakuehtoNappi>
              )}
              {(!desktop || (desktop && lisaaHakuehtojaState)) && (
                //Desktop-näkymässä nämä hakukentät näkyvät vain, jos käyttäjä on avannut ne näkyviin

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

              {!desktop && ( // Mobiilinäkymässä vinkkiteksti onkin täällä alhaalla
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
                onClick={haeSuunnitelmat}
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

      <HakutulosInfo className={desktop ? "" : "mobiili"}>
        <h2>Löytyi {hakutulostenMaara} suunnitelmaa</h2>
        <button onClick={nollaaHakuehdot}>Nollaa hakuehdot</button>
      </HakutulosInfo>
    </div>
  );
}
