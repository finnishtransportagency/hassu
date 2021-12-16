import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import * as Yup from "yup";
import log from "loglevel";
import { PageProps } from "@pages/_app";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import useProjekti from "src/hooks/useProjekti";
import { api, apiConfig, Kayttaja, ProjektiKayttajaInput, ProjektiRooli, TallennaProjektiInput } from "@services/api";
import useSWR from "swr";
import { SchemaOf } from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, UseFormProps } from "react-hook-form";
import Button from "@components/button/Button";
import Textarea from "@components/form/Textarea";
import ButtonLink from "@components/button/ButtonLink";
import Notification, { NotificationType } from "@components/notification/Notification";
import ProjektiPerustiedot from "@components/projekti/ProjektiPerustiedot";
import KayttoOikeusHallinta from "@components/projekti/KayttoOikeusHallinta";
import { kayttoOikeudetSchema } from "../../../../schemas/kayttoOikeudet";
import HassuLink from "@components/HassuLink";

// Extend TallennaProjektiInput by making fields other than muistiinpano nonnullable and required
type RequiredFields = Omit<
  TallennaProjektiInput,
  "muistiinpano" | "suunnittelustaVastaavaViranomainen" | "aloitusKuulutus" | "suunnitteluSopimus"
>;
type RequiredInputValues = Required<{
  [K in keyof RequiredFields]: NonNullable<RequiredFields[K]>;
}>;

type OptionalInputValues = Partial<Pick<TallennaProjektiInput, "muistiinpano">>;
type FormValues = RequiredInputValues & OptionalInputValues;

const defaultKayttaja: ProjektiKayttajaInput = {
  // @ts-ignore By default rooli should be 'undefined'
  rooli: "",
  puhelinnumero: "",
  kayttajatunnus: "",
};

const maxNoteLength = 2000;

const validationSchema: SchemaOf<FormValues> = Yup.object().shape({
  oid: Yup.string().required(),
  muistiinpano: Yup.string().max(
    maxNoteLength,
    `Muistiinpanoon voidaan kirjoittaa maksimissaan ${maxNoteLength} merkkiä.`
  ),
  kayttoOikeudet: kayttoOikeudetSchema,
});

export default function ProjektiSivu({ setRouteLabels }: PageProps) {
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti(oid);
  const isLoadingProjekti = !projekti && !projektiLoadError;

  const [formIsSubmitting, setFormIsSubmitting] = useState(false);

  const { data: kayttajat, error: kayttajatLoadError } = useSWR(apiConfig.listaaKayttajat.graphql, kayttajatLoader);
  const isLoadingKayttajat = !kayttajat && !kayttajatLoadError;

  const projektiHasPaallikko = projekti?.kayttoOikeudet?.some(({ rooli }) => rooli === ProjektiRooli.PROJEKTIPAALLIKKO);
  const projektiError =
    (!projekti?.tallennettu && !isLoadingProjekti) ||
    (!projektiHasPaallikko && !isLoadingProjekti) ||
    !!projektiLoadError;
  const disableFormEdit = projektiError || isLoadingProjekti || formIsSubmitting || isLoadingKayttajat;

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(validationSchema, { abortEarly: false, recursive: true }),
    defaultValues: { muistiinpano: "", kayttoOikeudet: [defaultKayttaja] },
    mode: "onChange",
    reValidateMode: "onChange",
  };

  const useFormReturn = useForm<FormValues>(formOptions);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useFormReturn;

  const onSubmit = async (formData: FormValues) => {
    setFormIsSubmitting(true);
    try {
      await api.tallennaProjekti(formData);
      reloadProjekti();
    } catch (e) {
      log.log("OnSubmit Error", e);
    }
    setFormIsSubmitting(false);
  };

  useEffect(() => {
    if (projekti && projekti.oid) {
      const tallentamisTiedot: FormValues = {
        oid: projekti.oid,
        muistiinpano: projekti.muistiinpano || "",
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

  return (
    <ProjektiPageLayout title={"Projektin perustiedot"}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={disableFormEdit}>
          {projektiError && (
            <Notification type={NotificationType.ERROR}>
              {!projektiHasPaallikko ? (
                <>
                  Projektilta puuttuu projektipäällikkö- / vastuuhenkilötieto projektiVELHOsta. Lisää vastuuhenkilötieto
                  projekti-VELHOssa ja yritä projektin perustamista uudelleen.
                </>
              ) : !projekti?.tallennettu ? (
                <>
                  {"Projektia ei ole tallennettu. "}
                  <HassuLink className="text-primary" href={`/yllapito/perusta/${oid}`}>
                    Siirry perustamaan projektia
                  </HassuLink>
                </>
              ) : (
                <>Projektin tietoja hakiessa tapahtui virhe. Tarkista tiedot velhosta ja yritä myöhemmin uudelleen.</>
              )}
            </Notification>
          )}
          <div className="content">
            <ProjektiPerustiedot projekti={projekti} />
          </div>
          <hr />
          <div className="content">
            <KayttoOikeusHallinta useFormReturn={useFormReturn} disableFields={disableFormEdit} />
            <hr />
          </div>
          <h4 className="vayla-small-title">Muistiinpanot</h4>
          <p>
            Voit kirjoittaa alla olevaan kenttään sisäisiä muistiinpanoja, jotka näkyvät kaikille projektiin lisätyille
            henkilöille. Muistiinpanoa voi muokata ainoastaan henkilöt, joilla on projektiin muokkausoikeudet. Vain
            viimeisimpänä tallennettu muistiinpano jää näkyviin.
          </p>
          <div className="flex flex-col">
            <Textarea
              label="Muistiinpano"
              disabled={disableFormEdit}
              {...register("muistiinpano")}
              error={errors.muistiinpano}
              maxLength={maxNoteLength}
            />
          </div>
          <hr />
          <Notification>Tallennus ei vielä julkaise tietoja.</Notification>
          <div className="flex justify-between flex-wrap gap-4">
            <ButtonLink href={"/yllapito/perusta"}>Takaisin suunnitelman hakuun</ButtonLink>
            <Button primary={!projekti?.tallennettu} disabled={disableFormEdit}>
              Tallenna projekti
            </Button>
            {projekti?.tallennettu && projekti?.oid && (
              <ButtonLink primary href={`/yllapito/projekti/${projekti?.oid}/aloituskuulutus`}>
                Siirry Aloituskuulutukseen
              </ButtonLink>
            )}
          </div>
        </fieldset>
      </form>
    </ProjektiPageLayout>
  );
}

async function kayttajatLoader(_: string): Promise<Kayttaja[]> {
  return await api.listUsers();
}
