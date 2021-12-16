import { PageProps } from "@pages/_app";
import React, { ReactElement, useEffect } from "react";
import useProjekti from "src/hooks/useProjekti";
import { useRouter } from "next/router";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import ProjektiPerustiedot from "@components/projekti/ProjektiPerustiedot";
import KayttoOikeusHallinta, { defaultKayttaja } from "@components/projekti/KayttoOikeusHallinta";
import { api, ProjektiRooli, TallennaProjektiInput } from "@services/api";
import * as Yup from "yup";
import { useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import log from "loglevel";
import Button from "@components/button/Button";
import ButtonLink from "@components/button/ButtonLink";
import { kayttoOikeudetSchema } from "src/schemas/kayttoOikeudet";
import HassuLink from "@components/HassuLink";
import Notification, { NotificationType } from "@components/notification/Notification";

// Extend TallennaProjektiInput by making fields other than muistiinpano nonnullable and required
type RequiredFields = Pick<TallennaProjektiInput, "oid" | "kayttoOikeudet">;
type FormValues = Required<{
  [K in keyof RequiredFields]: NonNullable<RequiredFields[K]>;
}>;

const validationSchema: Yup.SchemaOf<FormValues> = Yup.object().shape({
  oid: Yup.string().required(),
  kayttoOikeudet: kayttoOikeudetSchema,
});

export default function PerustaProjekti({ setRouteLabels }: PageProps): ReactElement {
  const router = useRouter();
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);

  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti(oid);
  const isLoadingProjekti = !projekti && !projektiLoadError;
  const projektiHasPaallikko = projekti?.kayttoOikeudet?.some(({ rooli }) => rooli === ProjektiRooli.PROJEKTIPAALLIKKO);
  const projektiError = projekti?.tallennettu || (!projektiHasPaallikko && !isLoadingProjekti);
  const disableFormEdit = projektiError || isLoadingProjekti || formIsSubmitting;
  useProjektiBreadcrumbs(setRouteLabels);

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(validationSchema, { abortEarly: false, recursive: true }),
    defaultValues: { kayttoOikeudet: [defaultKayttaja] },
    mode: "onChange",
    reValidateMode: "onChange",
  };

  const useFormReturn = useForm<FormValues>(formOptions);

  const { reset, handleSubmit } = useFormReturn as unknown as UseFormReturn<FormValues>;

  const submitCreateAnotherOne = async (formData: FormValues) => {
    setFormIsSubmitting(true);
    try {
      await api.tallennaProjekti(formData);
      reloadProjekti();
      router.push(`/yllapito/perusta`);
    } catch (e) {
      log.log("OnSubmit Error", e);
    }
    setFormIsSubmitting(false);
  };

  const submitMoveToProject = async (formData: FormValues) => {
    setFormIsSubmitting(true);
    try {
      await api.tallennaProjekti(formData);
      reloadProjekti();
      router.push(`/yllapito/projekti/${oid}`);
    } catch (e) {
      log.log("OnSubmit Error", e);
    }
    setFormIsSubmitting(false);
  };

  useEffect(() => {
    if (projekti && projekti.oid) {
      const tallentamisTiedot: FormValues = {
        oid: projekti.oid,
        kayttoOikeudet:
          projekti.kayttoOikeudet?.map(({ kayttajatunnus, puhelinnumero, rooli }) => ({
            kayttajatunnus,
            puhelinnumero: puhelinnumero || "",
            rooli,
          })) || [],
      };
      reset(tallentamisTiedot);
    }
  }, [projekti, reset]);

  return (
    <section>
      <h1>Projektin Perustaminen</h1>
      <h2>{projekti?.velho.nimi || "-"}</h2>
      <form>
        <fieldset disabled={disableFormEdit}>
          {projektiError && (
            <Notification type={NotificationType.ERROR}>
              <p>
                {!projektiHasPaallikko ? (
                  <>
                    Projektilta puuttuu projektipäällikkö- / vastuuhenkilötieto projektiVELHOsta. Lisää
                    vastuuhenkilötieto projekti-VELHOssa ja yritä projektin perustamista uudelleen.
                  </>
                ) : projekti?.tallennettu ? (
                  <>
                    {"Projekti on jo tallennettu. "}
                    <HassuLink className="text-primary" href={`/yllapito/projekti/${oid}`}>
                      Siirry projektisivulle
                    </HassuLink>
                  </>
                ) : (
                  <>Projektin tietoja hakiessa tapahtui virhe. Tarkista tiedot velhosta ja yritä myöhemmin uudelleen.</>
                )}
              </p>
            </Notification>
          )}
          <ProjektiPerustiedot projekti={projekti} />
          <hr />
          <KayttoOikeusHallinta useFormReturn={useFormReturn} disableFields={disableFormEdit} />
          <hr />
          <div className="flex gap-6 flex-col md:flex-row">
            <ButtonLink className="mr-auto" href="/yllapito/perusta">
              Takaisin
            </ButtonLink>
            <Button type="button" primary onClick={handleSubmit(submitMoveToProject)} disabled={disableFormEdit}>
              Tallenna ja siirry projektiin
            </Button>
            <Button type="button" onClick={handleSubmit(submitCreateAnotherOne)} disabled={disableFormEdit}>
              Tallenna ja lisää toinen projekti
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
