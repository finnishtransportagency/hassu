import { useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { SchemaOf } from "yup";

import { api, VelhoHakuTulos } from "@services/api";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import TextInput from "@components/form/TextInput";
import Button from "@components/button/Button";
import Notification, { NotificationType } from "@components/notification/Notification";
import useTranslation from "next-translate/useTranslation";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import Table from "@components/Table";

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
      <h1>Perusta uusi projekti</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Section>
          <SectionContent>
            <p>
              Hae projekti-VELHOon viety suunnitelma, jonka haluat tuoda {t("commonFI:sivustonimi")} -palveluun. Voit
              käyttää hakuehtona projekti-VELHOon tallennettua asiatunnusta tai suunnitelman / projektin nimeä, tai
              näiden osaa.
            </p>
            <TextInput className="md:max-w-xs" label="Asiatunnus" disabled />
            <TextInput
              error={errors.name}
              className="md:max-w-xs"
              label="Projektin nimi"
              maxLength={PROJEKTI_NIMI_MAX_LENGTH}
              {...register("name")}
            />
          </SectionContent>
          <Button primary style={{ marginRight: "auto" }} endIcon="search" id="hae" disabled={isLoading}>
            Hae
          </Button>
          {searchError && <Notification type={NotificationType.ERROR}>{t(`haku-virhe.${searchError}`)}</Notification>}
        </Section>
      </form>
      {resultSectionVisible && (
        <Section noDivider>
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
            <Table
              cols={[
                { header: "Asiatunnus", data: (projekti) => projekti.asianumero, fraction: 3 },
                { header: "Nimi", data: (projekti) => projekti.nimi, fraction: 6 },
                {
                  header: "Tyyppi",
                  data: (projekti) => projekti.tyyppi && t(`projekti:projekti-tyyppi.${projekti.tyyppi}`),
                  fraction: 2,
                },
                { header: "Projektipäällikkö", data: (projekti) => projekti.projektiPaallikko, fraction: 3 },
              ]}
              rows={hakuTulos || []}
              isLoading={isLoading}
              rowLink={(projekti) => `/yllapito/perusta/${projekti?.oid}`}
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
        </Section>
      )}
    </>
  );
}
