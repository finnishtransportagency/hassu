import React, { ReactElement, useEffect, useState } from "react";
import { Kieli, Projekti, ProjektiTyyppi, SuunnitteluSopimusInput } from "@services/api";
import RadioButton from "@components/form/RadioButton";
import Select, { SelectOption } from "@components/form/Select";
import { useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import Section from "@components/layout/Section";
import HassuGrid from "@components/HassuGrid";
import SectionContent from "@components/layout/SectionContent";
import useTranslation from "next-translate/useTranslation";
import { kuntametadata } from "hassu-common/kuntametadata";
import { formatNimi } from "../../util/userUtil";
import Notification, { NotificationType } from "@components/notification/Notification";
import { isAllowedToChangeSuunnittelusopimus } from "hassu-common/util/operationValidators";
import ProjektiSuunnittelusopimusLogoInput from "./ProjektiSuunnittelusopimusLogoInput";
import { getKaannettavatKielet } from "common/kaannettavatKielet";

interface Props {
  projekti?: Projekti | null;
  formDisabled?: boolean;
}

export default function ProjektiPerustiedot({ formDisabled, projekti }: Props): ReactElement {
  const {
    register,
    formState: { errors },
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

  const kielitiedot = watch("kielitiedot");
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

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
            {ensisijainenKaannettavaKieli && (
                  <ProjektiSuunnittelusopimusLogoInput
                    lang={ensisijainenKaannettavaKieli}
                    isPrimaryLang
                    logoUrl={ensisijainenKaannettavaKieli === Kieli.SUOMI ? logoUrlFi : logoUrlSv}
                    disabled={formDisabled}
                  />
                )}
                {toissijainenKaannettavaKieli && (
                  <ProjektiSuunnittelusopimusLogoInput
                    lang={toissijainenKaannettavaKieli}
                    isPrimaryLang={false}
                    logoUrl={toissijainenKaannettavaKieli === Kieli.SUOMI ? logoUrlFi : logoUrlSv}
                    disabled={formDisabled}
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
