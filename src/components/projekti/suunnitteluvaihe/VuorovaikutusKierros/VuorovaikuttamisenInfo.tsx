import React, { ReactElement } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import { examineJulkaisuPaiva } from "src/util/dateUtils";
import { VuorovaikutusKierros, VuorovaikutusKierrosTila } from "@services/api";

interface Props {
  vuorovaikutus: VuorovaikutusKierros | undefined;
  eiOleJulkaistu: boolean;
}

export default function VuorovaikuttamisenInfo({ vuorovaikutus, eiOleJulkaistu }: Props): ReactElement {
  const julkinen = vuorovaikutus?.tila === VuorovaikutusKierrosTila.JULKINEN;
  console.log("julkinen" + julkinen);
  console.log("vuorovaikutus?.vuorovaikutusJulkaisuPaiva" + vuorovaikutus?.vuorovaikutusJulkaisuPaiva);
  console.log("eiOleJulkaistu" + eiOleJulkaistu);
  if (eiOleJulkaistu) {
    return (
      <p className="mb-8">
        Tällä välilehdellä luodaan virallinen kutsu suunnitelman vuorovaikutukseen. Kutsussa näkyy tieto vuorovaikutustilaisuuksista, linkki
        järjestelmän julkisella puolella esiteltäviin suunnitelmaluonnoksiin ja -aineistoihin sekä yhteyshenkilöt.
      </p>
    );
  }

  let { julkaisuPaiva, published } = examineJulkaisuPaiva(julkinen, vuorovaikutus?.vuorovaikutusJulkaisuPaiva);
  console.log("julkaisuPaiva" + julkaisuPaiva);
  console.log("published" + published);


  if (published) {
    return <Notification type={NotificationType.INFO_GREEN}>Vuorovaikutus on julkaistu {julkaisuPaiva}.</Notification>;
  }



  return (
    <Notification type={NotificationType.WARN}>
      Vuorovaikutusta ei ole vielä julkaistu palvelun julkisella puolella. Julkaisu {julkaisuPaiva}.
      {!vuorovaikutus?.esittelyaineistot?.length && !vuorovaikutus?.suunnitelmaluonnokset?.length
        ? " Huomaathan, että suunnitelma-aineistot tulee vielä lisätä."
        : ""}
    </Notification>
  );
}
