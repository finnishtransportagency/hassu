// Contains code generated or recommended by Amazon Q
import SectionContent from "@components/layout/SectionContent";
import { UudelleenKuulutus, Vaihe } from "@services/api";
import useSuomifiUser from "src/hooks/useSuomifiUser";
import StyledLink from "@components/StyledLink";
import { Controller, useFormContext } from "react-hook-form";
import styled from "@emotion/styled";
import FormGroup from "@components/form/FormGroup";
import RadioButton from "@components/form/RadioButton";
import dayjs from "dayjs";
import { ISO_DATE_FORMAT, nyt } from "backend/src/util/dateUtil";
import { H4 } from "@components/Headings";

export type KiinteistonomistajatUudelleenkuulutusVaihe = Vaihe.NAHTAVILLAOLO | Vaihe.HYVAKSYMISPAATOS | Vaihe.ALOITUSKUULUTUS;

interface KiinteistonomistajatUudelleenkuulutusProps {
  vaihe?: KiinteistonomistajatUudelleenkuulutusVaihe;
  oid: string;
  uudelleenKuulutus: UudelleenKuulutus | null | undefined;
}

type FormFields = {
  nahtavillaoloVaihe: {
    uudelleenKuulutus: {
      tiedotaKiinteistonomistajia: boolean;
    };
  };
  paatos: {
    uudelleenKuulutus: {
      tiedotaKiinteistonomistajia: boolean;
    };
  };
  aloitusKuulutus: {
    uudelleenKuulutus: {
      tiedotaKiinteistonomistajia: boolean;
    };
  };
};

const FormGroupWithBoldLabel = styled(FormGroup)(() => ({
  "> label": {
    fontWeight: "bold",
  },
  label: {
    marginBottom: "0.5rem",
  },
}));

export function KiinteistonOmistajatUudelleenkuulutus({ vaihe, oid, uudelleenKuulutus }: KiinteistonomistajatUudelleenkuulutusProps) {
  const { data } = useSuomifiUser();
  const { control } = useFormContext<FormFields>();
  if (uudelleenKuulutus && data?.suomifiViestitEnabled && vaihe === Vaihe.NAHTAVILLAOLO) {
    const pvm = dayjs(uudelleenKuulutus.alkuperainenKuulutusPaiva, ISO_DATE_FORMAT).endOf("date");
    const kuulutuspaivaInPast = pvm.isBefore(nyt());
    const kuulutuspaivaIsToday = pvm.isSame(nyt(), "date");
    const showRadioButtons = kuulutuspaivaIsToday || kuulutuspaivaInPast;
    return (
      <SectionContent>
        <H4 className="font-bold">Kiinteistönomistajat</H4>
        <Controller
          name="nahtavillaoloVaihe.uudelleenKuulutus.tiedotaKiinteistonomistajia"
          control={control}
          render={({ field }) => (
            <>
              {showRadioButtons && (
                <FormGroupWithBoldLabel label="Kiinteistönomistajien tiedottaminen uudelleenkuulutuksen yhteydessä" flexDirection="col">
                  <RadioButton
                    id="tiedotaKiinteistonomistajiaKylla"
                    label={"Kiinteistönomistajille lähetetään tieto uudesta kuulutuksesta"}
                    onChange={(value) => {
                      field.onChange(value.target.value === "on" ? true : false);
                    }}
                    checked={field.value === true}
                  />
                  <RadioButton
                    id="tiedotaKiinteistonomistajiaEi"
                    label="Kiinteistönomistajille ei lähetetä tietoa uudesta kuulutuksesta"
                    checked={field.value === false}
                    onChange={(value) => {
                      field.onChange(value.target.value === "off" ? true : false);
                    }}
                  />
                </FormGroupWithBoldLabel>
              )}
              {field.value === true && (
                <p>
                  Tarkasta kiinteistönomistajien vastaanottajalista Tiedottaminen -sivun{" "}
                  <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid } }}>
                    Kiinteistönomistajat
                  </StyledLink>{" "}
                  -välilehdeltä. Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään
                  julkaistavaksi.
                </p>
              )}
              {field.value === false && <p>Kiinteistönomistajille ei lähetetä tietoa uudelleenkuulutuksesta.</p>}
            </>
          )}
        />
      </SectionContent>
    );
  } else if (uudelleenKuulutus && data?.suomifiViestitEnabled && vaihe === Vaihe.HYVAKSYMISPAATOS) {
    const pvm = dayjs(uudelleenKuulutus.alkuperainenKuulutusPaiva, ISO_DATE_FORMAT).endOf("date");
    const kuulutuspaivaIsToday = pvm.isSame(nyt(), "date");
    return (
      <SectionContent>
        <H4 className="font-bold">Kiinteistönomistajat ja muistuttajat</H4>
        <Controller
          name="paatos.uudelleenKuulutus.tiedotaKiinteistonomistajia"
          control={control}
          render={({ field }) => (
            <>
              {kuulutuspaivaIsToday && (
                <FormGroupWithBoldLabel
                  label="Kiinteistönomistajien ja muistuttajien tiedottaminen uudelleenkuulutuksen yhteydessä"
                  flexDirection="col"
                >
                  <RadioButton
                    id="tiedotaKiinteistonomistajiaKylla"
                    label={"Kiinteistönomistajille ja muistuttajille lähetetään tieto uudesta kuulutuksesta"}
                    onChange={(value) => {
                      field.onChange(value.target.value === "on");
                    }}
                    checked={field.value === true}
                  />
                  <RadioButton
                    id="tiedotaKiinteistonomistajiaEi"
                    label="Kiinteistönomistajille ja muistuttajille ei lähetetä tietoa uudesta kuulutuksesta"
                    onChange={(value) => {
                      field.onChange(value.target.value === "off");
                    }}
                    checked={field.value === false}
                  />
                </FormGroupWithBoldLabel>
              )}
              {field.value === true && (
                <>
                  <p>
                    Tarkasta kiinteistönomistajien ja muistuttajien vastaanottajalista{" "}
                    <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid } }}>
                      Tiedottaminen
                    </StyledLink>{" "}
                    -sivulta Kiinteistönomistajat- ja Muistuttajat-välilehdiltä. Vastaanottajalista viedään automaattisesti asianhallintaan,
                    kun kuulutus hyväksytään julkaistavaksi.
                  </p>
                  <p>
                    Kiinteistönomistajia, joille on tiedossa yhteystiedot, tiedotetaan automaattisesti Suomi.fi-palvelun kautta. VLS:n
                    kautta muistutuksen jättäneitä tiedotetaan automaattisesti Suomi.fi-palvelun kautta. Muistutuksen muilla tavoin
                    jättäneitä tulee tiedottaa järjestelmän ulkopuolella. Tiedot kiinteistönomistajista ja muistuttajista löytyvät
                    Tiedottaminen sivulta.
                  </p>
                </>
              )}
              {field.value === false && <p>Kiinteistönomistajille ja muistuttajille ei lähetetä tietoa uudelleenkuulutuksesta.</p>}
            </>
          )}
        />
      </SectionContent>
    );
  } else if (uudelleenKuulutus && data?.suomifiViestitEnabled && vaihe === Vaihe.ALOITUSKUULUTUS) {
    const pvm = dayjs(uudelleenKuulutus.alkuperainenKuulutusPaiva, ISO_DATE_FORMAT).endOf("date");
    const kuulutuspaivaInPast = pvm.isBefore(nyt());
    const kuulutuspaivaIsToday = pvm.isSame(nyt(), "date");
    const showRadioButtons = kuulutuspaivaIsToday || kuulutuspaivaInPast;
    return (
      <SectionContent>
        <H4 className="font-bold">Kiinteistönomistajat</H4>
        <Controller
          name="aloitusKuulutus.uudelleenKuulutus.tiedotaKiinteistonomistajia"
          control={control}
          render={({ field }) => (
            <>
              {showRadioButtons && (
                <FormGroupWithBoldLabel label="Kiinteistönomistajien tiedottaminen uudelleenkuulutuksen yhteydessä" flexDirection="col">
                  <RadioButton
                    id="tiedotaKiinteistonomistajiaKylla"
                    label={"Kiinteistönomistajille lähetetään tieto uudesta kuulutuksesta"}
                    onChange={(value) => {
                      field.onChange(value.target.value === "on" ? true : false);
                    }}
                    checked={field.value === true}
                  />
                  <RadioButton
                    id="tiedotaKiinteistonomistajiaEi"
                    label="Kiinteistönomistajille ei lähetetä tietoa uudesta kuulutuksesta"
                    checked={field.value === false}
                    onChange={(value) => {
                      field.onChange(value.target.value === "off" ? true : false);
                    }}
                  />
                </FormGroupWithBoldLabel>
              )}
              {field.value === true && (
                <p>
                  Tarkasta kiinteistönomistajien vastaanottajalista Tiedottaminen -sivun{" "}
                  <StyledLink href={{ pathname: `/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat`, query: { oid } }}>
                    Kiinteistönomistajat
                  </StyledLink>{" "}
                  -välilehdeltä. Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään
                  julkaistavaksi.
                </p>
              )}
              {field.value === false && <p>Kiinteistönomistajille ei lähetetä tietoa uudelleenkuulutuksesta.</p>}
            </>
          )}
        />
      </SectionContent>
    );
  } else {
    return <></>;
  }
}
