import { yupResolver } from "@hookform/resolvers/yup";
import { Kieli, KirjaamoOsoite, TallennaProjektiInput } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import React, { useEffect, useMemo } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloKuulutusSchema } from "src/schemas/nahtavillaoloKuulutus";
import Painikkeet from "./Painikkeet";
import HankkeenSisallonKuvaus from "./HankkeenSisallonKuvaus";
import KuulutuksenJaIlmoituksenEsikatselu from "./KuulutuksenJaIlmoituksenEsikatselu";
import KuulutuksessaEsitettavatYhteystiedot from "./KuulutuksessaEsitettavatYhteystiedot";
import KuulutusJaJulkaisuPaiva from "./KuulutusJaJulkaisuPaiva";
import IlmoituksenVastaanottajatKomponentti from "./IlmoituksenVastaanottajat";
import defaultVastaanottajat from "src/util/defaultVastaanottajat";
import { removeTypeName } from "src/util/removeTypeName";
import Lukunakyma from "./Lukunakyma";
import useKirjaamoOsoitteet from "src/hooks/useKirjaamoOsoitteet";
import PdfPreviewForm from "@components/projekti/PdfPreviewForm";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { pickBy } from "lodash";

type PickedTallennaProjektiInput = Pick<TallennaProjektiInput, "oid" | "nahtavillaoloVaihe">;

export type KuulutuksenTiedotFormValues = Required<{
  [K in keyof PickedTallennaProjektiInput]: NonNullable<PickedTallennaProjektiInput[K]>;
}>;

interface Props {
  setIsDirty: (value: React.SetStateAction<boolean>) => void;
}

export default function KuulutuksenTiedot({ setIsDirty }: Props) {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  const { data: kirjaamoOsoitteet } = useKirjaamoOsoitteet();

  return (
    <>
      {projekti && kirjaamoOsoitteet && (
        <KuulutuksenTiedotForm setIsDirty={setIsDirty} projekti={projekti} kirjaamoOsoitteet={kirjaamoOsoitteet} />
      )}
    </>
  );
}

interface KuulutuksenTiedotFormProps {
  projekti: ProjektiLisatiedolla;
  kirjaamoOsoitteet: KirjaamoOsoite[];
}

function KuulutuksenTiedotForm({ projekti, kirjaamoOsoitteet, setIsDirty }: KuulutuksenTiedotFormProps & Props) {
  const pdfFormRef = React.useRef<React.ElementRef<typeof PdfPreviewForm>>(null);

  const defaultValues: KuulutuksenTiedotFormValues = useMemo(() => {
    const { ensisijainenKieli, toissijainenKieli } = projekti.kielitiedot || {};
    const hasRuotsinKieli = ensisijainenKieli === Kieli.RUOTSI || toissijainenKieli === Kieli.RUOTSI;
    const hasSaamenKieli = ensisijainenKieli === Kieli.SAAME || toissijainenKieli === Kieli.SAAME;

    // SUOMI hankkeen kuvaus on aina lomakkeella, RUOTSI JA SAAME vain jos kyseinen kieli on projektin kielitiedoissa.
    // Jos kieli ei ole kielitiedoissa kyseisen kielen kenttää ei tule lisätä hankkeenKuvaus olioon
    // Tästä syystä pickBy:llä poistetaan undefined hankkeenkuvaus tiedot.
    const nahtavillaOloHankkeenKuvaus = projekti.nahtavillaoloVaihe?.hankkeenKuvaus;
    const hankkeenKuvaus: KuulutuksenTiedotFormValues["nahtavillaoloVaihe"]["hankkeenKuvaus"] = !!nahtavillaOloHankkeenKuvaus
      ? {
          SUOMI: nahtavillaOloHankkeenKuvaus.SUOMI || "",
          ...pickBy(
            {
              RUOTSI: hasRuotsinKieli ? nahtavillaOloHankkeenKuvaus.RUOTSI || "" : undefined,
              SAAME: hasSaamenKieli ? nahtavillaOloHankkeenKuvaus.SAAME || "" : undefined,
            },
            (value) => value !== undefined
          ),
        }
      : {
          SUOMI: projekti.suunnitteluVaihe?.hankkeenKuvaus?.SUOMI || "",
          ...pickBy(
            {
              RUOTSI: hasRuotsinKieli ? projekti.suunnitteluVaihe?.hankkeenKuvaus?.RUOTSI || "" : undefined,
              SAAME: hasSaamenKieli ? projekti.suunnitteluVaihe?.hankkeenKuvaus?.SAAME || "" : undefined,
            },
            (value) => value !== undefined
          ),
        };

    return {
      oid: projekti.oid,
      nahtavillaoloVaihe: {
        kuulutusPaiva: projekti?.nahtavillaoloVaihe?.kuulutusPaiva || null,
        kuulutusVaihePaattyyPaiva: projekti?.nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva || null,
        muistutusoikeusPaattyyPaiva: projekti?.nahtavillaoloVaihe?.muistutusoikeusPaattyyPaiva || null,
        hankkeenKuvaus: hankkeenKuvaus,
        kuulutusYhteystiedot: projekti?.nahtavillaoloVaihe?.kuulutusYhteystiedot
          ? projekti.nahtavillaoloVaihe.kuulutusYhteystiedot.map((yhteystieto) => removeTypeName(yhteystieto))
          : [],
        kuulutusYhteysHenkilot:
          projekti?.kayttoOikeudet
            ?.filter(({ kayttajatunnus }) => projekti?.nahtavillaoloVaihe?.kuulutusYhteysHenkilot?.includes(kayttajatunnus))
            .map(({ kayttajatunnus }) => kayttajatunnus) || [],
        ilmoituksenVastaanottajat: defaultVastaanottajat(
          projekti,
          projekti.nahtavillaoloVaihe?.ilmoituksenVastaanottajat,
          kirjaamoOsoitteet
        ),
      },
    };
  }, [projekti, kirjaamoOsoitteet]);

  const formOptions: UseFormProps<KuulutuksenTiedotFormValues> = {
    resolver: yupResolver(nahtavillaoloKuulutusSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: projekti,
  };

  const useFormReturn = useForm<KuulutuksenTiedotFormValues>(formOptions);
  const {
    formState: { isDirty },
  } = useFormReturn;

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  useLeaveConfirm(isDirty);

  const voiMuokata = !projekti?.nahtavillaoloVaiheJulkaisut || projekti.nahtavillaoloVaiheJulkaisut.length < 1;

  return (
    <>
      {projekti.nahtavillaoloVaihe?.palautusSyy && (
        <Notification type={NotificationType.WARN}>
          {"Nahtävilläolovaihejulkaisu on palautettu korjattavaksi. Palautuksen syy: " + projekti.nahtavillaoloVaihe.palautusSyy}
        </Notification>
      )}
      {voiMuokata && (
        <>
          <FormProvider {...useFormReturn}>
            <form>
              <KuulutusJaJulkaisuPaiva />
              <HankkeenSisallonKuvaus kielitiedot={projekti?.kielitiedot} />
              <KuulutuksessaEsitettavatYhteystiedot />
              <IlmoituksenVastaanottajatKomponentti nahtavillaoloVaihe={projekti?.nahtavillaoloVaihe} />
              {pdfFormRef.current?.esikatselePdf && (
                <KuulutuksenJaIlmoituksenEsikatselu esikatselePdf={pdfFormRef.current?.esikatselePdf} />
              )}
              <Painikkeet projekti={projekti} />
            </form>
          </FormProvider>
          <PdfPreviewForm ref={pdfFormRef} />
        </>
      )}
      {!voiMuokata && projekti && projekti.nahtavillaoloVaiheJulkaisut?.[projekti.nahtavillaoloVaiheJulkaisut.length - 1] && (
        <FormProvider {...useFormReturn}>
          <Lukunakyma
            projekti={projekti}
            nahtavillaoloVaiheJulkaisu={projekti.nahtavillaoloVaiheJulkaisut[projekti.nahtavillaoloVaiheJulkaisut.length - 1]}
          />
          <Painikkeet projekti={projekti} />
        </FormProvider>
      )}
    </>
  );
}
