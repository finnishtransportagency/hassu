import React, { ReactNode, VFC } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import { ExternalStyledLink } from "@components/StyledLink";
import { H3 } from "@components/Headings";
import { Vaihe } from "@services/api";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";

type Props = { children: ReactNode; vaihe?: Vaihe; projekti: ProjektiLisatiedolla };

const vaiheenVelhoToimeenpide: Record<Vaihe, string> = {
  ALOITUSKUULUTUS: "Kuuluttaminen suunnittelun ja maastotöiden aloittamisesta",
  SUUNNITTELU: "Suunnittelun aikainen vuorovaikutus",
  NAHTAVILLAOLO: "Valmiin suunnittelman nähtävillä olo ja lausuntojen pyytäminen",
  HYVAKSYMISPAATOS: "Kuulutus päätöksen nähtäville asettamisesta",
  JATKOPAATOS: "Kuulutus suunnitelman voimassaolon jatkamisesta",
  JATKOPAATOS2: "Kuulutus suunnitelman voimassaolon jatkamisesta",
};

const ashaOhjeistusLink = <ExternalStyledLink href="/">asianhallinnan ohjeistuksesta</ExternalStyledLink>;

const AshaKuulutusToimenpideTeksti: VFC<{ vaihe: Vaihe }> = ({ vaihe }) => (
  <>
    Ennen {vaihe === Vaihe.SUUNNITTELU ? "kutsun" : "kuulutuksen"} täyttämistä tarkista, että asialla on auki asianhallintajärjestelmässä
    oikea toimenpide, joka on nimeltään {vaiheenVelhoToimeenpide[vaihe]}. {vaihe === Vaihe.SUUNNITTELU ? "Kutsun" : "Kuulutuksen"} julkaisu
    ei ole mahdollista, jos asianhallintajärjestelmässä on väärä toimenpide auki. Katso tarkemmat ohjeet {ashaOhjeistusLink}.
  </>
);

export const OhjelistaNotification: VFC<Props> = ({ children, vaihe, projekti }) => {
  return (
    <Notification closable type={NotificationType.INFO} hideIcon>
      <div>
        <H3 variant="h4">Ohjeet</H3>
        <ul className="list-disc block pl-5">
          {vaihe && projekti.asianhallinta.aktiivinen && (
            <>
              <li>
                <strong>Tämä kohta koskee vain Väylävirastoa:</strong> <AshaKuulutusToimenpideTeksti vaihe={vaihe} />
              </li>
              <li>
                <strong>Tämä kohta koskee ELY-keskusta:</strong>{" "}
                {vaihe === Vaihe.SUUNNITTELU
                  ? "Vie lopuksi sähköpostilla saamasi kutsu USPA:an."
                  : "Vie lopuksi sähköpostilla saamasi kuulutus ja ilmoitus kuulutuksesta USPA:an."}
              </li>
            </>
          )}
          {children}
        </ul>
      </div>
    </Notification>
  );
};
