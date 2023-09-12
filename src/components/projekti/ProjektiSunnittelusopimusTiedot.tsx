import React, { ReactElement, useEffect, useState } from "react";
import { Kieli, Projekti, ProjektiTyyppi, SuunnitteluSopimusInput } from "@services/api";
import RadioButton from "@components/form/RadioButton";
import Select, { SelectOption } from "@components/form/Select";
import { Controller, useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FileInput from "@components/form/FileInput";
import IconButton from "@components/button/IconButton";
import FormGroup from "@components/form/FormGroup";
import Section from "@components/layout/Section";
import HassuGrid from "@components/HassuGrid";
import SectionContent from "@components/layout/SectionContent";
import HassuStack from "@components/layout/HassuStack";
import useTranslation from "next-translate/useTranslation";
import { kuntametadata } from "hassu-common/kuntametadata";
import { formatNimi } from "../../util/userUtil";
import Notification, { NotificationType } from "@components/notification/Notification";
import { isAllowedToChangeSuunnittelusopimus } from "hassu-common/util/operationValidators";

interface Props {
  projekti?: Projekti | null;
  formDisabled?: boolean;
}

export default function ProjektiPerustiedot({ formDisabled, projekti }: Props): ReactElement {
  const {
    register,
    formState: { errors },
    control,
    setValue,
    watch,
  } = useFormContext<FormValues>();

  const [hasSuunnitteluSopimus, setHasSuunnitteluSopimus] = useState(false);
  const [suunnitteluSopimus, setSuunnitteluSopimus] = useState<SuunnitteluSopimusInput | null>(null);
  const [logoUrlFi, setLogoUrlFi] = useState<string | undefined>(undefined);
  const [logoUrlSv, setLogoUrlSv] = useState<string | undefined>(undefined);
  const [kuntaOptions, setKuntaOptions] = useState<SelectOption[]>([]);
  const { lang } = useTranslation();

  const hide = projekti?.velho.tyyppi === ProjektiTyyppi.RATA || projekti?.velho.tyyppi === ProjektiTyyppi.YLEINEN;

  useEffect(() => {
    setKuntaOptions(kuntametadata.kuntaOptions(lang));
  }, [lang]);

  useEffect(() => {
    setHasSuunnitteluSopimus(!!projekti?.suunnitteluSopimus);
    if (projekti?.suunnitteluSopimus) {
      const { __typename, ...suunnitteluSopimus } = projekti.suunnitteluSopimus;
      setSuunnitteluSopimus(suunnitteluSopimus);
    } else {
      setSuunnitteluSopimus(null);
    }
    setLogoUrlFi(projekti?.suunnitteluSopimus?.logo?.SUOMI || undefined);
    setLogoUrlSv(projekti?.suunnitteluSopimus?.logo?.RUOTSI || undefined);
  }, [projekti, setHasSuunnitteluSopimus, setLogoUrlFi, setLogoUrlSv]);

  if (!kuntaOptions || kuntaOptions.length == 0 || hide || !projekti) {
    return <></>;
  }

  const suunnitteluSopimusCanBeChanged = isAllowedToChangeSuunnittelusopimus(projekti);

  const disabled = formDisabled || !suunnitteluSopimusCanBeChanged;

  const toissijainenKieli = watch("kielitiedot.toissijainenKieli");

  return (
    <Section smallGaps>
      <h4 className="vayla-small-title">Suunnittelusopimus</h4>
      {disabled && (
        <Notification type={NotificationType.INFO_GRAY}>
          Et voi muuttaa suunnittelusopimuksen olemassaoloa, koska aloituskuulutus on julkaistu tai odottaa hyväksyntää. Voit kuitenkin
          muuttaa kunnan edustajan tietoja.
        </Notification>
      )}
      <FormGroup
        label="Onko kyseessä suunnittelusopimuksella toteutettava suunnitteluhanke? *"
        flexDirection="row"
        errorMessage={errors.suunnittelusopimusprojekti?.message || (errors.suunnitteluSopimus as any)?.message}
      >
        <RadioButton
          disabled={disabled}
          label="Kyllä"
          value="true"
          {...register("suunnittelusopimusprojekti")}
          onChange={() => {
            setHasSuunnitteluSopimus(true);
            setValue("suunnitteluSopimus", suunnitteluSopimus, { shouldValidate: true });
          }}
        />
        <RadioButton
          disabled={disabled}
          label="Ei"
          value="false"
          {...register("suunnittelusopimusprojekti")}
          onChange={() => {
            setHasSuunnitteluSopimus(false);
            setValue("suunnitteluSopimus", null, { shouldValidate: true });
          }}
        />
      </FormGroup>
      {hasSuunnitteluSopimus && (
        <SectionContent largeGaps sx={{ marginLeft: 4 }}>
          <SectionContent>
            <h5 className="vayla-smallest-title">Kunnan edustajan tiedot</h5>
            <p>
              Kunnan edustajaksi merkitty henkilö näkyy automaattisesti valittuna aloituskuulutuksen ja vuorovaikutusten yhteystiedoissa.
            </p>
            <HassuGrid cols={{ lg: 3 }}>
              <Select
                id="suunnittelusopimus_yhteyshenkilo"
                label="Henkilö *"
                options={
                  projekti?.kayttoOikeudet?.map((kayttaja) => ({
                    label: formatNimi(kayttaja),
                    value: kayttaja.kayttajatunnus,
                  })) || []
                }
                emptyOption="Valitse"
                error={(errors as any).suunnitteluSopimus?.yhteysHenkilo}
                disabled={formDisabled}
                {...register("suunnitteluSopimus.yhteysHenkilo", { shouldUnregister: true })}
              />
              <Select
                id="suunnittelusopimus_kunta"
                label="Kunta *"
                options={kuntaOptions ? kuntaOptions : [{ label: "", value: "" }]}
                error={(errors as any).suunnitteluSopimus?.kunta}
                disabled={formDisabled}
                {...register("suunnitteluSopimus.kunta", { shouldUnregister: true })}
              />
            </HassuGrid>
          </SectionContent>
          <SectionContent>
            <h5 className="vayla-smallest-title">Kunnan logo</h5>
            <Controller
              render={({ field }) =>
                logoUrlFi ? (
                  <FormGroup
                    label={`Virallinen, kunnalta saatu logo${toissijainenKieli == Kieli.RUOTSI && " (suomenkielinen versio)"}. *`}
                    errorMessage={(errors as any).suunnitteluSopimus?.logo?.SUOMI?.message}
                  >
                    <HassuStack direction="row">
                      <img className="h-11 border-gray border mb-3.5 py-2 px-3" src={logoUrlFi} alt="Suunnittelu sopimus logo" />
                      <IconButton
                        name="suunnittelusopimus_logo_fi_trash_button"
                        icon="trash"
                        disabled={formDisabled}
                        onClick={() => {
                          setLogoUrlFi(undefined);
                          // @ts-ignore
                          setValue("suunnitteluSopimus.logo.SUOMI", undefined);
                        }}
                      />
                    </HassuStack>
                  </FormGroup>
                ) : (
                  <FileInput
                    label={`Virallinen, kunnalta saatu logo${toissijainenKieli == Kieli.RUOTSI && " (ruotsinkielinen versio)"}. *`}
                    error={(errors as any).suunnitteluSopimus?.SUOMI?.logo}
                    maxFiles={1}
                    onDrop={(files) => {
                      const logoTiedosto = files[0];
                      if (logoTiedosto) {
                        setLogoUrlFi(URL.createObjectURL(logoTiedosto));
                        field.onChange(logoTiedosto);
                      }
                    }}
                    bottomInfoText="Tuetut tiedostomuodot ovat JPEG ja PNG. Sallittu tiedostokoko on maksimissaan 25 Mt."
                    onChange={(e) => {
                      const logoTiedosto = e.target.files?.[0];
                      if (logoTiedosto) {
                        setLogoUrlFi(URL.createObjectURL(logoTiedosto));
                        field.onChange(logoTiedosto);
                      }
                    }}
                    disabled={formDisabled}
                  />
                )
              }
              name="suunnitteluSopimus.logo.SUOMI"
              control={control}
              defaultValue={undefined}
              shouldUnregister
            />
            {toissijainenKieli == Kieli.RUOTSI && (
              <Controller
                render={({ field }) =>
                  logoUrlSv ? (
                    <FormGroup
                      label={`Virallinen, kunnalta saatu logo (ruotsinkielinen versio). *`}
                      errorMessage={(errors as any).suunnitteluSopimus?.logo?.RUOTSI?.message}
                    >
                      <HassuStack direction="row">
                        <img className="h-11 border-gray border mb-3.5 py-2 px-3" src={logoUrlSv} alt="Suunnittelu sopimus logo" />
                        <IconButton
                          name="suunnittelusopimus_logo_sv_trash_button"
                          icon="trash"
                          disabled={formDisabled}
                          onClick={() => {
                            setLogoUrlSv(undefined);
                            // @ts-ignore
                            setValue("suunnitteluSopimus.logo.RUOTSI", undefined);
                          }}
                        />
                      </HassuStack>
                    </FormGroup>
                  ) : (
                    <FileInput
                      label={`Virallinen, kunnalta saatu logo (ruotsinkielinen versio). *`}
                      error={(errors as any).suunnitteluSopimus?.RUOTSI?.logo}
                      maxFiles={1}
                      onDrop={(files) => {
                        const logoTiedosto = files[0];
                        if (logoTiedosto) {
                          setLogoUrlSv(URL.createObjectURL(logoTiedosto));
                          field.onChange(logoTiedosto);
                        }
                      }}
                      bottomInfoText="Tuetut tiedostomuodot ovat JPEG ja PNG. Sallittu tiedostokoko on maksimissaan 25 Mt."
                      onChange={(e) => {
                        const logoTiedosto = e.target.files?.[0];
                        if (logoTiedosto) {
                          setLogoUrlSv(URL.createObjectURL(logoTiedosto));
                          field.onChange(logoTiedosto);
                        }
                      }}
                      disabled={formDisabled}
                    />
                  )
                }
                name="suunnitteluSopimus.logo.RUOTSI"
                control={control}
                defaultValue={undefined}
                shouldUnregister
              />
            )}
          </SectionContent>
        </SectionContent>
      )}
      <p>
        Valintaan voi vaikuttaa aloituskuulutuksen tekemiseen saakka, jonka jälkeen valinta lukittuu. Kunnan edustaja on mahdollista vaihtaa
        myös prosessin aikana.
      </p>
    </Section>
  );
}
