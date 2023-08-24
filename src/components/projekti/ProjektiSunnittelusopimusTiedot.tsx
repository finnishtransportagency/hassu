import React, { ReactElement, useEffect, useState } from "react";
import { Projekti, ProjektiTyyppi, SuunnitteluSopimusInput } from "@services/api";
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
import { kuntametadata } from "../../../common/kuntametadata";
import { formatNimi } from "../../util/userUtil";
import Notification, { NotificationType } from "@components/notification/Notification";
import { isAllowedToChangeSuunnittelusopimus } from "common/util/operationValidators";

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
  } = useFormContext<FormValues>();

  const [hasSuunnitteluSopimus, setHasSuunnitteluSopimus] = useState(false);
  const [suunnitteluSopimus, setSuunnitteluSopimus] = useState<SuunnitteluSopimusInput | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
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
    setLogoUrl(projekti?.suunnitteluSopimus?.logo || undefined);
  }, [projekti, setHasSuunnitteluSopimus, setLogoUrl]);

  if (!kuntaOptions || kuntaOptions.length == 0 || hide || !projekti) {
    return <></>;
  }

  const suunnitteluSopimusCanBeChanged = isAllowedToChangeSuunnittelusopimus(projekti);

  const disabled = formDisabled || !suunnitteluSopimusCanBeChanged;

  return (
    <Section smallGaps>
      <h4 className="vayla-small-title">Suunnittelusopimus</h4>
      {disabled && (
        <Notification type={NotificationType.INFO}>
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
                addEmptyOption
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
                logoUrl ? (
                  <FormGroup label="Virallinen, kunnalta saatu logo. *" errorMessage={(errors as any).suunnitteluSopimus?.logo?.message}>
                    <HassuStack direction="row">
                      <img className="h-11 border-gray border mb-3.5 py-2 px-3" src={logoUrl} alt="Suunnittelu sopimus logo" />
                      <IconButton
                        name="suunnittelusopimus_logo_trash_button"
                        icon="trash"
                        disabled={formDisabled}
                        onClick={() => {
                          setLogoUrl(undefined);
                          // @ts-ignore
                          setValue("suunnitteluSopimus.logo", undefined);
                        }}
                      />
                    </HassuStack>
                  </FormGroup>
                ) : (
                  <FileInput
                    label="Virallinen, kunnalta saatu logo. *"
                    error={(errors as any).suunnitteluSopimus?.logo}
                    maxFiles={1}
                    onDrop={(files) => {
                      const logoTiedosto = files[0];
                      if (logoTiedosto) {
                        setLogoUrl(URL.createObjectURL(logoTiedosto));
                        field.onChange(logoTiedosto);
                      }
                    }}
                    bottomInfoText="Tuetut tiedostomuodot ovat JPEG ja PNG. Sallittu tiedostokoko on maksimissaan 25 Mt."
                    onChange={(e) => {
                      const logoTiedosto = e.target.files?.[0];
                      if (logoTiedosto) {
                        setLogoUrl(URL.createObjectURL(logoTiedosto));
                        field.onChange(logoTiedosto);
                      }
                    }}
                    disabled={formDisabled}
                  />
                )
              }
              name="suunnitteluSopimus.logo"
              control={control}
              defaultValue={undefined}
              shouldUnregister
            />
          </SectionContent>
        </SectionContent>
      )}
      <p>
        Valintaan voi vaikuttaa aloituskuulutuksen tekemisen saakka, jonka jälkeen valinta lukittuu. Kunnan edustaja on mahdollista vaihtaa
        myös prosessin aikana.
      </p>
    </Section>
  );
}
