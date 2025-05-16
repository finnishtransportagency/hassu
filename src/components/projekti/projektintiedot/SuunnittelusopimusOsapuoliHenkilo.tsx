import React, { ReactElement } from "react";
import { useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import HassuGrid from "@components/HassuGrid";
import TextInput from "@components/form/TextInput";
import { H5 } from "@components/Headings";
import ContentSpacer from "@components/layout/ContentSpacer";

interface SuunnittelusopimusOsapuoliHenkiloProps {
  osapuoliNumero: number;
  osapuoliTyyppi: string;
}

export default function SuunnittelusopimusOsapuoliHenkilo({
  osapuoliNumero,
  osapuoliTyyppi,
}: SuunnittelusopimusOsapuoliHenkiloProps): ReactElement {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormValues>();

  const fieldName = (field: string) => `suunnitteluSopimus.osapuoli${osapuoliNumero}.${field}`;

  return (
    <ContentSpacer gap={8}>
      <div style={{ marginTop: "1.5rem", marginLeft: "2rem" }}>
        <H5>Uusi edustaja</H5>
        <p>
          Lisää uusi edustaja valintalistalle Lisää edustaja -painikkeella. Edustajia voi olla korkeintaan kaksi per osapuoli. Huomioi, että
          uusi edustaja ei tallennu Projektin henkilöt -sivulle eikä henkilölle tule käyttöoikeuksia projektiin.
        </p>
        <HassuGrid cols={{ lg: 3 }}>
          {osapuoliTyyppi === "kunta" && (
            <>
              <TextInput
                id={`suunnittelusopimus_osapuoli${osapuoliNumero}_etunimi`}
                label="Etunimi *"
                error={(errors as any)?.suunnitteluSopimus?.["osapuoli" + osapuoliNumero]?.etunimi}
                disabled={false}
                {...register(fieldName("etunimi") as any)}
              />
              <TextInput
                id={`suunnittelusopimus_osapuoli${osapuoliNumero}_sukunimi`}
                label="Sukunimi *"
                error={(errors as any)?.suunnitteluSopimus?.["osapuoli" + osapuoliNumero]?.sukunimi}
                disabled={false}
                {...register(fieldName("sukunimi") as any)}
              />
              <TextInput
                id={`suunnittelusopimus_osapuoli${osapuoliNumero}_yritys`}
                label="Organisaatio (jos muu kuin osapuoli)"
                error={(errors as any)?.suunnitteluSopimus?.["osapuoli" + osapuoliNumero]?.yritys}
                disabled={false}
                {...register(fieldName("yritys") as any)}
              />
              <TextInput
                id={`suunnittelusopimus_osapuoli${osapuoliNumero}_puhelinnumero`}
                label="Puhelinnumero *"
                error={(errors as any)?.suunnitteluSopimus?.["osapuoli" + osapuoliNumero]?.puhelinnumero}
                disabled={false}
                {...register(fieldName("puhelinnumero") as any)}
              />
              <TextInput
                id={`suunnittelusopimus_osapuoli${osapuoliNumero}_sahkoposti`}
                label="Sähköposti *"
                error={(errors as any)?.suunnitteluSopimus?.["osapuoli" + osapuoliNumero]?.email}
                disabled={false}
                {...register(fieldName("email") as any)}
              />
            </>
          )}
          {osapuoliTyyppi === "yritys" && (
            <>
              <TextInput
                id={`suunnittelusopimus_osapuoli${osapuoliNumero}_etunimi`}
                label="Etunimi *"
                error={(errors as any)?.suunnitteluSopimus?.["osapuoli" + osapuoliNumero]?.etunimi}
                disabled={false}
                {...register(fieldName("etunimi") as any)}
              />
              <TextInput
                id={`suunnittelusopimus_osapuoli${osapuoliNumero}_sukunimi`}
                label="Sukunimi *"
                error={(errors as any)?.suunnitteluSopimus?.["osapuoli" + osapuoliNumero]?.sukunimi}
                disabled={false}
                {...register(fieldName("sukunimi") as any)}
              />
              <TextInput
                id={`suunnittelusopimus_osapuoli${osapuoliNumero}_yritys`}
                label="Organisaatio (jos muu kuin osapuoli)"
                error={(errors as any)?.suunnitteluSopimus?.["osapuoli" + osapuoliNumero]?.yritys}
                disabled={false}
                {...register(fieldName("yritys") as any)}
              />
              <TextInput
                id={`suunnittelusopimus_osapuoli${osapuoliNumero}_puhelinnumero`}
                label="Puhelinnumero *"
                error={(errors as any)?.suunnitteluSopimus?.["osapuoli" + osapuoliNumero]?.puhelinnumero}
                disabled={false}
                {...register(fieldName("puhelinnumero") as any)}
              />
              <TextInput
                id={`suunnittelusopimus_osapuoli${osapuoliNumero}_sahkoposti`}
                label="Sähköposti *"
                error={(errors as any)?.suunnitteluSopimus?.["osapuoli" + osapuoliNumero]?.email}
                disabled={false}
                {...register(fieldName("email") as any)}
              />
            </>
          )}
        </HassuGrid>
      </div>
    </ContentSpacer>
  );
}
