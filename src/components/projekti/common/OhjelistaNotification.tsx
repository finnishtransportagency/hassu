import React, { ReactNode, VFC } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import { H3 } from "@components/Headings";
import { Vaihe } from "@services/api";
import { KatsoTarkemmatASHAOhjeetLink } from "./KatsoTarkemmatASHAOhjeetLink";
import useCurrentUser from "src/hooks/useCurrentUser";

type Props = { children: ReactNode; vaihe?: Vaihe };

const vaiheenVelhoToimeenpide: Record<Vaihe, string> = {
  ALOITUSKUULUTUS: "Kuuluttaminen suunnittelun ja maastotöiden aloittamisesta",
  SUUNNITTELU: "Suunnittelun aikainen vuorovaikutus",
  NAHTAVILLAOLO: "Valmiin suunnittelman nähtävillä olo ja lausuntojen pyytäminen",
  HYVAKSYMISPAATOS: "Kuulutus päätöksen nähtäville asettamisesta",
  JATKOPAATOS: "Kuulutus suunnitelman voimassaolon jatkamisesta",
  JATKOPAATOS2: "Kuulutus suunnitelman voimassaolon jatkamisesta",
};

const UspaInaktiivinenText: VFC<{ vaihe: Vaihe }> = ({ vaihe }) => (
  <>Vie lopuksi sähköpostilla saamasi {vaihe === Vaihe.SUUNNITTELU ? "kutsu ja lähetekirje" : "kuulutus ja ilmoitus"} USPA:an.</>
);

const AshaKuulutusToimenpideTeksti: VFC<{ vaihe: Vaihe }> = ({ vaihe }) => (
  <>
    Ennen {vaihe === Vaihe.SUUNNITTELU ? "kutsun" : "kuulutuksen"} täyttämistä tarkista, että asialla on auki asianhallintajärjestelmässä
    oikea toimenpide, joka on nimeltään {vaiheenVelhoToimeenpide[vaihe]}. {vaihe === Vaihe.SUUNNITTELU ? "Kutsun" : "Kuulutuksen"} julkaisu
    ei ole mahdollista, jos asianhallintajärjestelmässä on väärä toimenpide auki. <KatsoTarkemmatASHAOhjeetLink />
  </>
);

export const OhjelistaNotification: VFC<Props> = ({ children, vaihe }) => {
  const { data: nykyinenKayttaja } = useCurrentUser();
  return (
    <Notification closable type={NotificationType.INFO} hideIcon>
      <div>
        <H3 variant="h4">Ohjeet</H3>
        <ul className="list-disc block pl-5">
          {vaihe && nykyinenKayttaja?.features?.asianhallintaIntegraatio && (
            <>
              <li>
                <strong>Tämä kohta koskee vain Väylävirastoa:</strong> <AshaKuulutusToimenpideTeksti vaihe={vaihe} />
              </li>
              <li>
                <strong>Tämä kohta koskee ELY-keskusta:</strong> <UspaInaktiivinenText vaihe={vaihe} />
              </li>
            </>
          )}
          {children}
        </ul>
      </div>
    </Notification>
  );
};
