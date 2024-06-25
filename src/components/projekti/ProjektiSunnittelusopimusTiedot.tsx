import React, { ReactElement } from "react";
import { Projekti, ProjektiTyyppi } from "@services/api";
import Select from "@components/form/Select";
import { Controller, useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import Section from "@components/layout/Section";
import HassuGrid from "@components/HassuGrid";
import SectionContent from "@components/layout/SectionContent";
import { kuntametadata } from "hassu-common/kuntametadata";
import { formatNimi } from "../../util/userUtil";
import Notification, { NotificationType } from "@components/notification/Notification";
import { isAllowedToChangeSuunnittelusopimus } from "hassu-common/util/operationValidators";
import ProjektiSuunnittelusopimusLogoInput from "./ProjektiSuunnittelusopimusLogoInput";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import { FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { H3, H4 } from "../Headings";

interface Props {
  projekti?: Projekti | null;
  formDisabled?: boolean;
}

export default function ProjektiPerustiedot({ formDisabled, projekti }: Props): ReactElement {
  const {
    register,
    formState: { errors },
    watch,
    control,
  } = useFormContext<FormValues>();

  const kuntaOptions = kuntametadata.kuntaOptions("fi");

  const hide = projekti?.velho.tyyppi === ProjektiTyyppi.RATA || projekti?.velho.tyyppi === ProjektiTyyppi.YLEINEN;

  if (!kuntaOptions || kuntaOptions.length == 0 || hide || !projekti) {
    return <></>;
  }

  const suunnitteluSopimusCanBeChanged = isAllowedToChangeSuunnittelusopimus(projekti);

  const disabled = formDisabled || !suunnitteluSopimusCanBeChanged;

  const kielitiedot = watch("kielitiedot");
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  return (
    <Section smallGaps>
      <H3>Suunnittelusopimus</H3>
      {disabled && (
        <Notification type={NotificationType.INFO_GRAY}>
          Et voi muuttaa suunnittelusopimuksen olemassaoloa, koska aloituskuulutus on julkaistu tai odottaa hyväksyntää. Voit kuitenkin
          muuttaa kunnan edustajan tietoja.
        </Notification>
      )}
      <Controller
        name="suunnittelusopimusprojekti"
        control={control}
        render={({ field, fieldState }) => (
          <>
            <FormGroup
              label="Onko kyseessä suunnittelusopimuksella toteutettava suunnitteluhanke? *"
              errorMessage={fieldState.error?.message}
              flexDirection="row"
            >
              <RadioGroup
                aria-labelledby="demo-controlled-radio-buttons-group"
                row
                value={field.value}
                onChange={(value) => {
                  field.onChange(value.target.value);
                }}
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
              >
                <FormControlLabel value={"true"} disabled={disabled} control={<Radio />} label="Kyllä" />
                <FormControlLabel value={"false"} disabled={disabled} control={<Radio />} label="Ei" />
              </RadioGroup>
            </FormGroup>
            {field.value === "true" && (
              <Controller
                name="suunnitteluSopimus"
                control={control}
                defaultValue={null}
                shouldUnregister={true}
                render={() => (
                  <SectionContent largeGaps sx={{ marginLeft: 4 }}>
                    <SectionContent>
                      <H4>Kunnan edustajan tiedot</H4>
                      <p>
                        Kunnan edustajaksi merkitty henkilö näkyy automaattisesti valittuna aloituskuulutuksen ja vuorovaikutusten
                        yhteystiedoissa.
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
                      <H4>Kunnan logo</H4>
                      {ensisijainenKaannettavaKieli && (
                        <ProjektiSuunnittelusopimusLogoInput<FormValues>
                          lang={ensisijainenKaannettavaKieli}
                          isPrimaryLang
                          name={`suunnitteluSopimus.logo.${ensisijainenKaannettavaKieli}`}
                          disabled={formDisabled}
                        />
                      )}
                      {toissijainenKaannettavaKieli && (
                        <ProjektiSuunnittelusopimusLogoInput<FormValues>
                          lang={toissijainenKaannettavaKieli}
                          isPrimaryLang={false}
                          name={`suunnitteluSopimus.logo.${toissijainenKaannettavaKieli}`}
                          disabled={formDisabled}
                        />
                      )}
                    </SectionContent>
                  </SectionContent>
                )}
              />
            )}
          </>
        )}
      />
      <p>
        Valintaan voi vaikuttaa aloituskuulutuksen tekemiseen saakka, jonka jälkeen valinta lukittuu. Kunnan edustaja on mahdollista vaihtaa
        myös prosessin aikana.
      </p>
    </Section>
  );
}
