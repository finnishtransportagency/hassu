import { useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { SchemaOf } from "yup";

import { api, VelhoHakuTulos } from "@services/api";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import ProjektiTaulu from "@components/projekti/ProjektiTaulu";

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
        <p>
          Hae projekti-VELHOon viety suunnitelma, jonka haluat tuoda Valtion väylien suunnittelu -palveluun. Voit hakea
          suunnitelman joko asiatunnuksella tai suunnitelman / projektin nimellä tai sen osalla.
        </p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-3">
            <div className="md:col-span-4 xl:col-span-3 md:col-start-1 xl:col-start-1 my-auto">
              <label className="font-bold text-gray">Asiatunnus</label>
            </div>
            <div className="md:col-span-4 xl:col-span-3">
              <input
                type="text"
                className="border rounded w-full py-1 px-2 focus:outline-none focus:shadow-outline disabled:opacity-50"
                disabled
              />
            </div>
            <div className="md:col-span-4 xl:col-span-3 md:col-start-1 xl:col-start-1 my-auto">
              <label className="font-bold">Projektin nimi</label>
            </div>
            <div className="md:col-span-4 xl:col-span-3">
              <input
                type="text"
                className="border rounded w-full py-1 px-2 focus:outline-none focus:shadow-outline"
                {...register("name")}
              />
            </div>
            <div className="md:col-span-2">
              <button
                className="px-3 py-1 rounded-3xl border-transparent rounded text-base font-normal bg-primary-dark text-white uppercase disabled:opacity-50 disabled:cursor-default"
                disabled={isLoading}
              >
                Haku
              </button>
            </div>
          </div>
        </form>
        {errors.name?.message && (
          <div className="bg-warmWhite border border-secondary-red py-2 px-3 w-full">{errors.name?.message}</div>
        )}
      </section>
      <hr />
      {resultSectionVisible && (
        <section className="pt-3">
          <h2>Hakutulokset</h2>
          <div className="bg-secondary-turquoise bg-opacity-25 border border-primary py-2 px-3 w-full mb-4">
            Ohjeet
            <div>
              <ul className="list-disc list-inside">
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
          </div>
          {(Array.isArray(hakuTulos) && hakuTulos.length > 0) || isLoading ? (
            <ProjektiTaulu projektit={hakuTulos || []} isLoading={isLoading} />
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
