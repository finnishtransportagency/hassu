import { useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { SchemaOf } from "yup";

import { api, VelhoHakuTulos } from "@services/api";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import ProjektiTaulu from "@components/projekti/ProjektiTaulu";
import TextInput from "@components/form/TextInput";
import Button from "@components/button/Button";
import Notification, { NotificationType } from "@components/notification/Notification";
import useTranslation from "next-translate/useTranslation";

interface SearchInput {
  name: string;
}

const PROJEKTI_NIMI_PARAM = "projektinimi";

const PROJEKTI_NIMI_MAX_LENGTH = 100;
const PROJEKTI_NIMI_MIN_LENGTH = 3;

enum SearchError {
  NO_RESULTS = "NO_RESULTS",
  SEARCH_UNSUCCESSFUL = "SEARCH_UNSUCCESSFUL",
}

export default function Perusta() {
  const { t } = useTranslation("velho-haku");
  const router = useRouter();
  const [hakuTulos, setHakuTulos] = useState<VelhoHakuTulos[] | null>([]);
  const [resultSectionVisible, setResultSectionVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<SearchError | undefined>(undefined);

  const validationSchema: SchemaOf<SearchInput> = Yup.object().shape({
    name: Yup.string()
      .required("Nimi on pakollinen kenttä.")
      .min(PROJEKTI_NIMI_MIN_LENGTH, `Nimikenttään on kirjoitettava vähintään ${PROJEKTI_NIMI_MIN_LENGTH} merkkiä.`)
      .max(PROJEKTI_NIMI_MAX_LENGTH, `Nimikenttään voi kirjoittaa maksimissaan ${PROJEKTI_NIMI_MAX_LENGTH} merkkiä.`),
  });

  const formOptions: UseFormProps<SearchInput> = {
    resolver: yupResolver(validationSchema),
    defaultValues: { name: "" },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SearchInput>(formOptions);

  const onSubmit = useCallback(
    async (data: SearchInput) => {
      if (router.query[PROJEKTI_NIMI_PARAM] !== data.name) {
        await router.push({ query: { [PROJEKTI_NIMI_PARAM]: data.name } });
        // Route change will trigger onSubmit (this function) another time
        // Return so that requests are not duplicated.
        return;
      }
      try {
        setIsLoading(true);
        setResultSectionVisible(true);
        const tulos = await api.getVelhoSuunnitelmasByName(data.name);
        setHakuTulos(tulos);
        if (tulos.length === 0) {
          setSearchError(SearchError.NO_RESULTS);
        } else {
          setSearchError(undefined);
        }
      } catch (e) {
        setSearchError(SearchError.SEARCH_UNSUCCESSFUL);
      }
      setIsLoading(false);
    },
    [router]
  );

  useEffect(() => {
    const FillFormAndSubmit = async (data: SearchInput) => {
      await reset(data);
      handleSubmit(onSubmit)();
    };
    if (router.isReady) {
      const name = router.query[PROJEKTI_NIMI_PARAM];
      if (typeof name === "string") {
        FillFormAndSubmit({ name });
      }
    }
  }, [router.isReady, router.query, reset, handleSubmit, onSubmit]);

  return (
    <>
      <section>
        <h1>Perusta uusi projekti</h1>
        <p className="ingress">
          Hae projekti-VELHOon viety suunnitelma, jonka haluat tuoda {t("commonFI:sivustonimi")} -palveluun. Voit
          käyttää hakuehtona projekti-VELHOon tallennettua asiatunnusta tai suunnitelman / projektin nimeä, tai näiden
          osaa.
        </p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="w-64 content space-y-4">
            <TextInput label="Asiatunnus" disabled />
            <TextInput
              error={errors.name}
              label="Projektin nimi"
              maxLength={PROJEKTI_NIMI_MAX_LENGTH}
              {...register("name")}
            />
            <Button primary endIcon="search" id="hae" disabled={isLoading}>
              Hae
            </Button>
          </div>
        </form>
        {searchError && (
          <Notification type={NotificationType.ERROR} className="content">
            {t(`haku-virhe.${searchError}`)}
          </Notification>
        )}
      </section>
      <hr />
      {resultSectionVisible && (
        <section>
          <h2>Hakutulokset</h2>
          <Notification type={NotificationType.INFO} hideIcon>
            <div>
              <h3 className="vayla-small-title">Ohjeet</h3>
              <ul className="list-disc block pl-5">
                <li>
                  Valitse listasta se suunnitelma, jonka haluat tallentaa {t("commonFI:sivustonimi")} -palveluun uudeksi
                  projektiksi. Jos etsimääsi suunnitelmaa ei näy listassa, varmista, että se on tallennettu
                  projekti-VELHOon, ja hakuehdot ovat oikein. Ota tarvittaessa yhteys pääkäyttäjään.
                </li>
                <li>
                  Huomioi, että hakutuloksissa näytetään ainoastaan ne suunnitelmat / projektit, joita ei ole vielä
                  perustettu palveluun. Käytä etusivun projektihakua etsiäksesi jo perustettuja projekteja.
                </li>
              </ul>
            </div>
          </Notification>
          {(Array.isArray(hakuTulos) && hakuTulos.length > 0) || isLoading ? (
            <ProjektiTaulu
              projektit={hakuTulos || []}
              isLoading={isLoading}
              projektiLinkki={(pid) => `/yllapito/perusta/${pid}`}
            />
          ) : (
            !isLoading && (
              <p>
                {"Hakusi '"}
                <span className="font-bold">{router.query[PROJEKTI_NIMI_PARAM]}</span>
                {"' ei vastaa yhtään projektia."}
              </p>
            )
          )}
        </section>
      )}
    </>
  );
}
