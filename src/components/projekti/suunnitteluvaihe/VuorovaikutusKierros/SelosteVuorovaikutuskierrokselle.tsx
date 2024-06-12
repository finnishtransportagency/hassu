import Textarea from "@components/form/Textarea";
import { H4 } from "@components/Headings";
import ContentSpacer from "@components/layout/ContentSpacer";
import Section from "@components/layout/Section2";
import React from "react";
import { useFormContext } from "react-hook-form";

export default function SelosteVuorovaikutuskierrokselle() {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <Section>
      <h2 className="vayla-title">Seloste lähetekirjeeseen</h2>
      <ContentSpacer>
        <p>
          Kirjoita lähetekirjettä varten seloste kutsun uudelleenjulkaisun syistä. Seloste tulee nähtäville viranomaiselle ja kunnille
          lähetettävän lähetekirjeen alkuun. Älä lisää tekstiin linkkejä.
        </p>
        <Textarea
          label={`Kutsun uudelleenlähettämisen syy *`}
          {...register(`vuorovaikutusKierros.selosteVuorovaikutuskierrokselle`)}
          error={(errors as any)?.vuorovaikutusKierros?.selosteVuorovaikutuskierrokselle}
        />
      </ContentSpacer>
    </Section>
  );
}
