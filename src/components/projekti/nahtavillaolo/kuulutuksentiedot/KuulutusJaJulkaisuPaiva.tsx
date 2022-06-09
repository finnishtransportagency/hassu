import Section from "@components/layout/Section";
import React from "react";

type Props = {};

export default function KuulutusJaJulkaisuPaiva({}: Props) {
  return (
    <Section noDivider>
      <h4 className="vayla-small-title">Kuulutus ja julkaisupäivä</h4>
      <p>
        Anna päivämäärä, jolle kuulutus päivätään ja nähtävilläolevan suunnitelman materiaalit julkaistaan palvelun
        julkisella puolella.
      </p>
    </Section>
  );
}
