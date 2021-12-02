import Textarea from "@components/form/Textarea";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { useRouter } from "next/router";
import React, { ReactElement, useEffect, useState } from "react";
import useProjekti from "src/hooks/useProjekti";
import { SchemaOf } from "yup";
import * as Yup from "yup";
import { useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Button from "@components/button/Button";
import Notification, { NotificationType } from "@components/notification/Notification";
import { AloitusKuulutusInput, api, TallennaProjektiInput } from "@services/api";
import log from "loglevel";
import ButtonLink from "@components/button/ButtonLink";
import HassuLink from "@components/HassuLink";
import { PageProps } from "@pages/_app";

type FormValues = Pick<TallennaProjektiInput, "oid"> & {
  aloitusKuulutus: Pick<AloitusKuulutusInput, "hankkeenKuvaus">;
};

const maxAloituskuulutusLength = 2000;

export default function Aloituskuulutus({ setRouteLabels }: PageProps): ReactElement {
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti(oid);
  const projektiError = projektiLoadError || !projekti?.tallennettu;
  const isLoadingProjekti = !projekti && !projektiLoadError;
  const disableFormEdit = projektiError || isLoadingProjekti || isFormSubmitting;

  useEffect(() => {
    if (router.isReady) {
      let routeLabel = "";
      if (projekti?.velho?.nimi) {
        routeLabel = projekti.velho?.nimi;
      } else if (typeof oid === "string") {
        routeLabel = oid;
      }
      if (routeLabel) {
        setRouteLabels({ "/yllapito/projekti/[oid]": { label: routeLabel } });
      }
    }
  }, [router.isReady, oid, projekti, setRouteLabels]);

  const validationSchema: SchemaOf<FormValues> = Yup.object().shape({
    oid: Yup.string().required(),
    aloitusKuulutus: Yup.object().shape({
      hankkeenKuvaus: Yup.string()
        .required("Aloituskuulutus on täytettävä.")
        .max(
          maxAloituskuulutusLength,
          `Aloituskuulutukseen voidaan kirjoittaa maksimissaan ${maxAloituskuulutusLength} merkkiä.`
        ),
    }),
  });

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(validationSchema, { abortEarly: false, recursive: true }),
    defaultValues: { aloitusKuulutus: { hankkeenKuvaus: "" } },
    mode: "onChange",
    reValidateMode: "onChange",
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>(formOptions);

  useEffect(() => {
    if (projekti && projekti.oid) {
      const tallentamisTiedot: FormValues = {
        oid: projekti.oid,
        aloitusKuulutus: { hankkeenKuvaus: projekti?.aloitusKuulutus?.hankkeenKuvaus },
      };
      reset(tallentamisTiedot);
    }
  }, [projekti, reset]);

  const onSubmit = async (formData: FormValues) => {
    setIsFormSubmitting(true);
    try {
      await api.tallennaProjekti(formData);
      reloadProjekti();
    } catch (e) {
      log.log("OnSubmit Error", e);
    }
    setIsFormSubmitting(false);
  };

  return (
    <ProjektiPageLayout title="Aloituskuulutus">
      <form>
        {projektiError && (
          <Notification type={NotificationType.ERROR}>
            {projektiLoadError ? (
              <p>Projektin tietoja hakiessa tapahtui virhe. Tarkista tiedot velhosta ja yritä myöhemmin uudelleen.</p>
            ) : !projekti?.tallennettu ? (
              <p>
                <>Projektin ei ole vielä perustettu. Perusta projekti </>
                <HassuLink className="text-primary" href={projekti?.oid && `/yllapito/projekti/${projekti.oid}`}>
                  Projektin Perustamissivulla
                </HassuLink>
                .
              </p>
            ) : (
              <>Tuntematon virhe.</>
            )}
          </Notification>
        )}
        <Textarea
          label="Suunnitelman aloituskuulutus *"
          registrationValues={register("aloitusKuulutus.hankkeenKuvaus")}
          error={errors.aloitusKuulutus?.hankkeenKuvaus}
          disabled={disableFormEdit}
        ></Textarea>
        <Notification type={NotificationType.INFO}>
          Esikatsele kuulutus ja ilmoitus ennen hyväksyntään lähettämistä.
        </Notification>
        <div className="flex gap-6 flex-wrap">
          <ButtonLink
            type="button"
            href={projekti?.oid && `/api/projekti/${projekti?.oid}/aloituskuulutus/pdf`}
            disabled={!projekti?.aloitusKuulutus?.hankkeenKuvaus}
            target="_blank"
          >
            Katsele tallennettua kuulutusta
          </ButtonLink>
          <ButtonLink
            href={projekti?.oid && `/api/projekti/${projekti?.oid}/aloituskuulutus/pdf`}
            useNextLink={false}
            disabled={!projekti?.aloitusKuulutus?.hankkeenKuvaus}
            download
          >
            Lataa tallennettu aloituskuulutus
          </ButtonLink>
        </div>
      </form>
      <hr />
      <div className="flex gap-6 justify-between flex-wrap">
        <Button onClick={handleSubmit(onSubmit)} disabled={disableFormEdit}>
          Tallenna Keskeneräisenä
        </Button>
        <Button primary disabled>
          Lähetä Hyväksyttäväksi
        </Button>
      </div>
    </ProjektiPageLayout>
  );
}
