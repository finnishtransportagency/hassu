import { AloitusKuulutusJulkaisu, KuulutusJulkaisuTila, Kieli, UudelleenKuulutus } from "@services/api";
import React, { ReactElement, VoidFunctionComponent } from "react";
import Notification, { NotificationType } from "@components/notification/Notification";
import capitalize from "lodash/capitalize";
import replace from "lodash/replace";
import lowerCase from "lodash/lowerCase";
import AloituskuulutusPDFEsikatselu from "./AloituskuulutusPDFEsikatselu";
import AloituskuulutusTiedostot from "./AloituskuulutusTiedostot";
import IlmoituksenVastaanottajat from "./IlmoituksenVastaanottajat";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";
import Section from "@components/layout/Section";
import { kuntametadata } from "../../../../common/kuntametadata";
import useTranslation from "next-translate/useTranslation";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import ExtLink from "@components/ExtLink";
import SectionContent from "@components/layout/SectionContent";
import { formatDate } from "../../../util/dateUtils";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { formatNimi } from "../../../util/userUtil";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";

interface Props {
  projekti?: ProjektiLisatiedolla;
  aloituskuulutusjulkaisu?: AloitusKuulutusJulkaisu | null;
  isLoadingProjekti: boolean;
}

export default function AloituskuulutusLukunakyma({ aloituskuulutusjulkaisu, projekti, isLoadingProjekti }: Props): ReactElement {
  const { lang } = useTranslation();
  if (!aloituskuulutusjulkaisu || !projekti) {
    return <></>;
  }

  let { kuulutusPaiva, published } = examineKuulutusPaiva(aloituskuulutusjulkaisu?.kuulutusPaiva);

  let aloitusKuulutusHref: string | undefined;
  if (published) {
    aloitusKuulutusHref = window.location.protocol + "//" + window.location.host + "/suunnitelma/" + projekti.oid + "/aloituskuulutus";
  }

  const { ensisijainenKieli, toissijainenKieli } = aloituskuulutusjulkaisu.kielitiedot || {};

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  return (
    <>
      <Section>
        {!epaaktiivinen && (
          <>
            {!published && aloituskuulutusjulkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY && (
              <Notification type={NotificationType.WARN}>Kuulutusta ei ole vielä julkaistu. Kuulutuspäivä {kuulutusPaiva}</Notification>
            )}
            {published && aloituskuulutusjulkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY && (
              <Notification type={NotificationType.INFO_GREEN}>
                Aloituskuulutus on julkaistu {kuulutusPaiva}. Projekti näytetään kuulutuspäivästä lasketun määräajan jälkeen palvelun
                julkisella puolella suunnittelussa olevana. Kuulutusvaihe päättyy{" "}
                <FormatDate date={aloituskuulutusjulkaisu.siirtyySuunnitteluVaiheeseen} />.
              </Notification>
            )}
            {aloituskuulutusjulkaisu.tila !== KuulutusJulkaisuTila.HYVAKSYTTY && (
              <Notification type={NotificationType.WARN}>
                Aloituskuulutus on hyväksyttävänä projektipäälliköllä. Jos kuulutusta tarvitsee muokata, ota yhteys projektipäällikköön.
              </Notification>
            )}
          </>
        )}
        {aloituskuulutusjulkaisu.suunnitteluSopimus && (
          <Notification type={NotificationType.INFO_GRAY}>
            Hankkeesta on tehty suunnittelusopimus kunnan kanssa
            <br />
            <br />
            {capitalize(kuntametadata.nameForKuntaId(aloituskuulutusjulkaisu.suunnitteluSopimus.kunta, lang))}
            <br />
            {formatNimi(aloituskuulutusjulkaisu.suunnitteluSopimus)}, puh. {aloituskuulutusjulkaisu.suunnitteluSopimus.puhelinnumero},{" "}
            {aloituskuulutusjulkaisu.suunnitteluSopimus.email ? replace(aloituskuulutusjulkaisu.suunnitteluSopimus.email, "@", "[at]") : ""}
          </Notification>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Kuulutuspäivä</p>
          <p className="vayla-label md:col-span-3">Kuulutusvaihe päättyy</p>
          <p className="md:col-span-1 mb-0">{kuulutusPaiva}</p>
          <p className="md:col-span-3 mb-0">
            <FormatDate date={aloituskuulutusjulkaisu.siirtyySuunnitteluVaiheeseen} />
          </p>
        </div>
        {aloituskuulutusjulkaisu.uudelleenKuulutus && (
          <UudelleenKuulutusSisalto
            uudelleenKuulutus={aloituskuulutusjulkaisu.uudelleenKuulutus}
            ensisijainenKieli={ensisijainenKieli}
            toissijainenKieli={toissijainenKieli}
          />
        )}
        {ensisijainenKieli && (
          <div>
            <p className="vayla-label">Tiivistetty hankkeen sisällönkuvaus ensisijaisella kielellä ({lowerCase(ensisijainenKieli)})</p>
            <p>{aloituskuulutusjulkaisu.hankkeenKuvaus?.[ensisijainenKieli]}</p>
          </div>
        )}
        {toissijainenKieli && (
          <div className="content">
            <p className="vayla-label">Tiivistetty hankkeen sisällönkuvaus toissijaisella kielellä ({lowerCase(toissijainenKieli)})</p>
            <p>{aloituskuulutusjulkaisu.hankkeenKuvaus?.[toissijainenKieli]}</p>
          </div>
        )}
        <div>
          <p className="vayla-label">Kuulutuksessa esitettävät yhteystiedot</p>
          {aloituskuulutusjulkaisu.yhteystiedot?.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {replace(yhteystietoVirkamiehelleTekstiksi(yhteystieto), "@", "[at]")}
            </p>
          ))}
        </div>
      </Section>
      <Section>
        {aloituskuulutusjulkaisu.tila !== KuulutusJulkaisuTila.HYVAKSYTTY && (
          <AloituskuulutusPDFEsikatselu oid={projekti.oid} aloituskuulutusjulkaisu={aloituskuulutusjulkaisu} />
        )}
        {aloituskuulutusjulkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY && (
          <AloituskuulutusTiedostot aloituskuulutusjulkaisu={aloituskuulutusjulkaisu} oid={projekti.oid} epaaktiivinen={epaaktiivinen} />
        )}
        <SectionContent>
          <p className="vayla-label">Kuulutus julkisella puolella</p>
          {epaaktiivinen ? (
            <p>
              Kuulutus on ollut nähtävillä palvelun julkisella puolella {formatDate(aloituskuulutusjulkaisu.kuulutusPaiva)}—
              {formatDate(aloituskuulutusjulkaisu.siirtyySuunnitteluVaiheeseen)} välisen ajan.
            </p>
          ) : (
            <>
              {!published && <p>Linkki julkiselle puolelle muodostetaan kuulutuspäivänä. Kuulutuspäivä on {kuulutusPaiva}.</p>}
              {published && (
                <p>
                  <ExtLink href={aloitusKuulutusHref}>Kuulutus palvelun julkisella puolella</ExtLink>
                </p>
              )}
            </>
          )}
        </SectionContent>
      </Section>

      <IlmoituksenVastaanottajat isLoading={isLoadingProjekti} aloituskuulutusjulkaisu={aloituskuulutusjulkaisu} />
    </>
  );
}

const UudelleenKuulutusSisalto: VoidFunctionComponent<{
  ensisijainenKieli: Kieli | null | undefined;
  toissijainenKieli: Kieli | null | undefined;
  uudelleenKuulutus: UudelleenKuulutus;
}> = ({ uudelleenKuulutus, ensisijainenKieli, toissijainenKieli }) => (
  <Section>
    <p className="vayla-small-title">Uudelleenkuuluttamisen seloste</p>
    {uudelleenKuulutus.selosteLahetekirjeeseen && (
      <>
        {ensisijainenKieli && (
          <div>
            <p className="vayla-label">Seloste lähetekirjeeseen ensisijaisella kielellä ({lowerCase(ensisijainenKieli)})</p>
            <p>{uudelleenKuulutus.selosteLahetekirjeeseen?.[ensisijainenKieli]}</p>
          </div>
        )}
        {toissijainenKieli && (
          <div>
            <p className="vayla-label">Seloste lähetekirjeeseen toissijaisella kielellä ({lowerCase(toissijainenKieli)})</p>
            <p>{uudelleenKuulutus.selosteLahetekirjeeseen?.[toissijainenKieli]}</p>
          </div>
        )}
      </>
    )}
    {uudelleenKuulutus.selosteKuulutukselle && (
      <>
        {ensisijainenKieli && (
          <div>
            <p className="vayla-label">Seloste kuulutukselle ensisijaisella kielellä ({lowerCase(ensisijainenKieli)})</p>
            <p>{uudelleenKuulutus.selosteKuulutukselle?.[ensisijainenKieli]}</p>
          </div>
        )}
        {toissijainenKieli && (
          <div>
            <p className="vayla-label">Seloste kuulutukselle toissijaisella kielellä ({lowerCase(toissijainenKieli)})</p>
            <p>{uudelleenKuulutus.selosteKuulutukselle?.[toissijainenKieli]}</p>
          </div>
        )}
      </>
    )}
  </Section>
);
