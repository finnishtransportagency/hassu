import React, { ReactElement, useEffect, useState } from "react";
import { AloitusKuulutusTila, Projekti } from "@services/api";
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

interface Props {
  projekti?: Projekti | null;
  kuntalista?: string[];
}

export default function ProjektiPerustiedot({ projekti }: Props): ReactElement {
  const {
    register,
    formState: { errors },
    control,
    setValue,
  } = useFormContext<FormValues>();

  const [hasSuunnitteluSopimus, setHasSuunnitteluSopimus] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [kuntaOptions, setKuntaOptions] = useState<SelectOption[]>([]);
  const { lang } = useTranslation();

  const disabled = !!(
    projekti?.aloitusKuulutusJulkaisu &&
    projekti?.aloitusKuulutusJulkaisu.tila &&
    [AloitusKuulutusTila.HYVAKSYTTY, AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA].includes(projekti.aloitusKuulutusJulkaisu.tila)
  );

  useEffect(() => {
    setKuntaOptions(kuntametadata.kuntaOptions(lang));
  }, [lang]);

  useEffect(() => {
    setHasSuunnitteluSopimus(!!projekti?.suunnitteluSopimus);
    setLogoUrl(projekti?.suunnitteluSopimus?.logo || undefined);
  }, [projekti, setHasSuunnitteluSopimus, setLogoUrl]);

  if (!kuntaOptions || kuntaOptions.length == 0) {
    return <></>;
  }

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
        errorMessage={errors.suunnittelusopimusprojekti?.message}
      >
        <RadioButton
          disabled={disabled}
          label="Kyllä"
          value="true"
          {...register("suunnittelusopimusprojekti")}
          onChange={() => {
            setHasSuunnitteluSopimus(true);
          }}
        />
        <RadioButton
          disabled={disabled}
          label="Ei"
          value="false"
          {...register("suunnittelusopimusprojekti")}
          onChange={() => {
            setHasSuunnitteluSopimus(false);
          }}
        />
      </FormGroup>
      {hasSuunnitteluSopimus && (
        <SectionContent largeGaps sx={{ marginLeft: 4 }}>
          <SectionContent>
            <p>Kunnan projektipäällikön tiedot</p>
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
                {...register("suunnitteluSopimus.yhteysHenkilo", { shouldUnregister: true })}
              />
              <Select
                id="suunnittelusopimus_kunta"
                label="Kunta *"
                options={kuntaOptions ? kuntaOptions : [{ label: "", value: "" }]}
                error={(errors as any).suunnitteluSopimus?.kunta}
                {...register("suunnitteluSopimus.kunta", { shouldUnregister: true })}
              />
            </HassuGrid>
          </SectionContent>
          <SectionContent>
            <Controller
              render={({ field }) =>
                logoUrl ? (
                  <FormGroup label="Virallinen, kunnalta saatu logo. *" errorMessage={(errors as any).suunnitteluSopimus?.logo?.message}>
                    <HassuStack direction="row">
                      <img className="h-11 border-gray border mb-3.5 py-2 px-3" src={logoUrl} alt="Suunnittelu sopimus logo" />
                      <IconButton
                        name="suunnittelusopimus_logo_trash_button"
                        icon="trash"
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
                    onDrop={(files) => {
                      const logoTiedosto = files[0];
                      if (logoTiedosto) {
                        setLogoUrl(URL.createObjectURL(logoTiedosto));
                        field.onChange(logoTiedosto);
                      }
                    }}
                    onChange={(e) => {
                      const logoTiedosto = e.target.files?.[0];
                      if (logoTiedosto) {
                        setLogoUrl(URL.createObjectURL(logoTiedosto));
                        field.onChange(logoTiedosto);
                      }
                    }}
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
    </Section>
  );
}
