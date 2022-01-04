import Textarea from "@components/form/Textarea";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { useRouter } from "next/router";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import useProjekti from "src/hooks/useProjekti";
import * as Yup from "yup";
import { SchemaOf } from "yup";
import { useForm, UseFormProps } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Button from "@components/button/Button";
import Notification, { NotificationType } from "@components/notification/Notification";
import { AloitusKuulutusInput, api, TallennaProjektiInput } from "@services/api";
import log from "loglevel";
import { PageProps } from "@pages/_app";
import DatePicker from "@components/form/DatePicker";
import { getProjektiValidationSchema, ProjektiTestType } from "src/schemas/projekti";
import ProjektiErrorNotification from "@components/projekti/ProjektiErrorNotification";

type FormValues = Pick<TallennaProjektiInput, "oid"> & {
  aloitusKuulutus: Pick<AloitusKuulutusInput, "hankkeenKuvaus" | "kuulutusPaiva">;
};

const maxAloituskuulutusLength = 2000;

const draftValidationSchema: SchemaOf<FormValues> = Yup.object().shape({
  oid: Yup.string().required(),
  aloitusKuulutus: Yup.object().shape({
    hankkeenKuvaus: Yup.string().max(
      maxAloituskuulutusLength,
      `Aloituskuulutukseen voidaan kirjoittaa maksimissaan ${maxAloituskuulutusLength} merkkiä`
    ),
    kuulutusPaiva: Yup.string()
      .test("is-valid-date", "Virheellinen päivämäärä", (dateString) => {
        // KuulutusPaiva is not required when saved as a draft.
        // This test doesn't throw errors if date is not set.
        if (!dateString) {
          return true;
        }
        let validDate = false;
        try {
          const dateString2 = new Date(dateString!).toISOString().split("T")[0];
          if (dateString2 === dateString) {
            validDate = true;
          }
        } catch {
          validDate = false;
        }
        return validDate;
      })
      .test("not-in-past", "Aloituskuulutusta ei voida asettaa menneisyyteen", (dateString) => {
        // KuulutusPaiva is not required when saved as a draft.
        // This test doesn't throw errors if date is not set.
        if (!dateString) {
          return true;
        }
        const todayISODate = new Date().toISOString().split("T")[0];
        return dateString >= todayISODate;
      }),
  }),
});

const loadedProjektiValidationSchema = getProjektiValidationSchema([
  ProjektiTestType.PROJEKTI_IS_LOADED,
  ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
  ProjektiTestType.PROJEKTI_IS_CREATED,
]);

export default function Aloituskuulutus({ setRouteLabels }: PageProps): ReactElement {
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [serializedFormData, setSerializedFormData] = useState("{}");
  const router = useRouter();
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  const { data: projekti, error: projektiLoadError, mutate: reloadProjekti } = useProjekti(oid);
  const isLoadingProjekti = !projekti && !projektiLoadError;
  const projektiHasErrors = !isLoadingProjekti && !loadedProjektiValidationSchema.isValidSync(projekti);
  const disableFormEdit = projektiHasErrors || isLoadingProjekti || isFormSubmitting;
  const today = new Date().toISOString().split("T")[0];
  const pdfFormRef = useRef<HTMLFormElement | null>(null);

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

  const formOptions: UseFormProps<FormValues> = {
    resolver: yupResolver(draftValidationSchema, { abortEarly: false, recursive: true }),
    defaultValues: { aloitusKuulutus: { hankkeenKuvaus: "" } },
    mode: "onChange",
    reValidateMode: "onChange",
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormValues>(formOptions);

  const watchKuulutusPaiva = watch("aloitusKuulutus.kuulutusPaiva");

  useEffect(() => {
    if (projekti && projekti.oid) {
      const tallentamisTiedot: FormValues = {
        oid: projekti.oid,
        aloitusKuulutus: {
          hankkeenKuvaus: projekti?.aloitusKuulutus?.hankkeenKuvaus,
          kuulutusPaiva: projekti?.aloitusKuulutus?.kuulutusPaiva,
        },
      };
      reset(tallentamisTiedot);
    }
  }, [projekti, reset]);

  const saveDraft = async (formData: FormValues) => {
    setIsFormSubmitting(true);
    try {
      await api.tallennaProjekti(formData);
      await reloadProjekti();
    } catch (e) {
      log.log("OnSubmit Error", e);
    }
    setIsFormSubmitting(false);
  };

  const sendToManager = async (formData: FormValues) => {
    log.log(formData);
    alert("Lähetetään projektipäällikölle...");
  };

  const showPDFPreview = async (formData: FormValues) => {
    setSerializedFormData(JSON.stringify(formData));
    pdfFormRef.current?.submit();
  };

  return (
    <ProjektiPageLayout title="Aloituskuulutus">
      <form>
        <ProjektiErrorNotification
          projekti={projekti}
          validationSchema={loadedProjektiValidationSchema}
          disableValidation={isLoadingProjekti}
        />
        <Notification type={NotificationType.WARN}>
          Aloituskuulutusta ei ole vielä julkaistu palvelun julkisella puolella.{" "}
          {watchKuulutusPaiva && !errors.aloitusKuulutus?.kuulutusPaiva
            ? `Kuulutuspäivä on ${new Date(watchKuulutusPaiva).toLocaleDateString("fi")}`
            : "Kuulutuspäivää ei ole asetettu"}
          . Voit edelleen tehdä muutoksia projektin tietoihin. Tallennetut muutokset huomioidaan kuulutuksessa.
        </Notification>
        <h3 className="vayla-title">Suunnittelun aloittamisesta kuuluttaminen</h3>
        <p>
          Kun suunnitelman aloittamisesta kuulutetaan, projektista julkaistaan aloituskuulutustiedot tämän palvelun
          julkisella puolella. Aloituskuulutuksen näkyvilläoloaika määräytyy annetun kuulutuspäivän mukaan. Projekti
          siirtyy määräajan jälkeen automaattisesti suunnitteluvaiheeseen.
        </p>
        <Notification type={NotificationType.INFO} hideIcon>
          <div>
            <h3 className="vayla-small-title">Ohjeet</h3>
            <ul className="list-disc block pl-5">
              <li>
                Anna päivämäärä, jolloin suunnittelun aloittamisesta kuulutetaan tämän palvelun julkisella puolella.
              </li>
              <li>
                Kuvaa aloituskuulutuksessa esitettävään sisällönkuvauskenttään lyhyesti suunnittelukohteen alueellinen
                rajaus (maantiealue ja vaikutusalue), suunnittelun tavoitteet, vaikutukset ja toimenpiteet
                pääpiirteittäin karkealla tasolla. Älä lisää tekstiin linkkejä.
              </li>
            </ul>
          </div>
        </Notification>
        <div className="lg:flex md:gap-x-8">
          <DatePicker
            label="Kuuluuspäivä *"
            {...register("aloitusKuulutus.kuulutusPaiva")}
            disabled={disableFormEdit}
            min={today}
            error={errors.aloitusKuulutus?.kuulutusPaiva}
          />
          <DatePicker disabled label="Siirtyy suunnitteluvaiheeseen" />
        </div>
        <Textarea
          label="Hankkeen sisällönkuvaus *"
          {...register("aloitusKuulutus.hankkeenKuvaus")}
          error={errors.aloitusKuulutus?.hankkeenKuvaus}
          maxLength={maxAloituskuulutusLength}
          disabled={disableFormEdit}
        />
        <Notification type={NotificationType.INFO}>
          Esikatsele kuulutus ja ilmoitus ennen hyväksyntään lähettämistä.
        </Notification>
        <Button
          type="submit"
          onClick={handleSubmit(showPDFPreview)}
          disabled={!projekti?.aloitusKuulutus?.hankkeenKuvaus}
        >
          Katsele kuulutusta
        </Button>
      </form>
      <form
        ref={pdfFormRef}
        target="_blank"
        action={`/api/projekti/${projekti?.oid}/aloituskuulutus/pdf`}
        method="POST"
      >
        <input type="hidden" name="tallennaProjektiInput" value={serializedFormData} />
      </form>
      <hr />
      <div className="flex gap-6 justify-between flex-wrap">
        <Button onClick={handleSubmit(saveDraft)} disabled={disableFormEdit}>
          Tallenna Keskeneräisenä
        </Button>
        <Button primary onClick={handleSubmit(sendToManager)} disabled>
          Lähetä Hyväksyttäväksi
        </Button>
      </div>
    </ProjektiPageLayout>
  );
}
