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

interface SearchInput {
  name: string;
}

const PROJEKTI_NIMI_PARAM = "projektinimi";

export default function Perusta() {
  const router = useRouter();
  const [hakuTulos, setHakuTulos] = useState<VelhoHakuTulos[] | null>([]);
  const [resultSectionVisible, setResultSectionVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validationSchema: SchemaOf<SearchInput> = Yup.object().shape({
    name: Yup.string()
      .required("Nimi on pakollinen kenttä.")
      .min(3, "Nimikenttään on kirjoitettava vähintään 3 merkkiä."),
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
    setError,
    clearErrors,
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
          setError("name", {
            type: "manual",
            message: "Haulla ei löytynyt yhtään projektia.",
          });
        } else {
          clearErrors();
        }
      } catch (e) {
        setError("name", {
          type: "manual",
          message: "Haku epäonnistui. Mikäli ongelma jatkuu, ota yhteys järjestelmän ylläpitäjään.",
        });
      }
      setIsLoading(false);
    },
    [clearErrors, setError, router]
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
          Hae projekti-VELHOon viety suunnitelma, jonka haluat tuoda Valtion väylien suunnittelu -palveluun. Voit
          käyttää hakuehtona projekti-VELHOon tallennettua asiatunnusta tai suunnitelman / projektin nimeä, tai näiden
          osaa.
        </p>
        <div className="w-64 content">
          <form onSubmit={handleSubmit(onSubmit)}>
            <TextInput label="Asiatunnus" disabled />
            <TextInput label="Projektin nimi" {...register("name")} />
            <Button primary endIcon="search" disabled={isLoading}>
              Hae
            </Button>
          </form>
        </div>
        {errors.name?.message && (
          <Notification type={NotificationType.ERROR} className="content">
            {errors.name?.message}
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
              <ul className="list-disc list-inside block">
                <li>
                  Valitse listasta se suunnitelma, jonka haluat tallentaa Valtion väylien suunnittelu -palveluun uudeksi
                  projektiksi.
                </li>
                <li>
                  Huomioi, että hakutuloksissa näytetään ainoastaan ne suunnitelmat / projektit joitaa ei ole vielä
                  perustettu palveluun. Käytä etusivun projektihakua etsiäksesi jo perustettuja projekteja.
                </li>
              </ul>
            </div>
          </Notification>
          {(Array.isArray(hakuTulos) && hakuTulos.length > 0) || isLoading ? (
            <ProjektiTaulu
              projektit={hakuTulos || []}
              isLoading={isLoading}
              projektiLinkki={(pid) => `/yllapito/projekti/${pid}`}
            />
          ) : (
            !isLoading && (
              <div>
                {"Hakusi '"}
                <span className="font-bold">{router.query[PROJEKTI_NIMI_PARAM]}</span>
                {"' ei vastaa yhtään projektia."}
              </div>
            )
          )}
        </section>
      )}
    </>
  );
}
