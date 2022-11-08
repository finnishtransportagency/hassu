import { HyvaksymisPaatosVaiheJulkaisu, Kieli } from "@services/api";
import React, { ReactElement } from "react";
import replace from "lodash/replace";
import { examineKuulutusPaiva } from "src/util/aloitusKuulutusUtil";
import FormatDate from "@components/FormatDate";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import ExtLink from "@components/ExtLink";
import useTranslation from "next-translate/useTranslation";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { splitFilePath } from "../../../../util/fileUtil";
import { Link } from "@mui/material";
import lowerCase from "lodash/lowerCase";
import IlmoituksenVastaanottajatLukutila from "../../common/IlmoituksenVastaanottajatLukutila";
import ButtonFlatWithIcon from "@components/button/ButtonFlat";
import { ProjektiTestCommand } from "../../../../../common/testUtil.dev";
import { formatDate } from "src/util/dateUtils";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import { formatNimi } from "../../../../util/userUtil";

interface Props {
  jatkoPaatos1VaiheJulkaisu?: HyvaksymisPaatosVaiheJulkaisu | null;
  projekti: ProjektiLisatiedolla;
}

export default function HyvaksymisKuulutusLukunakyma({ jatkoPaatos1VaiheJulkaisu, projekti }: Props): ReactElement {
  const { t } = useTranslation("common");
  const getPdft = (kieli: Kieli | undefined | null) => {
    if (!jatkoPaatos1VaiheJulkaisu || !jatkoPaatos1VaiheJulkaisu.hyvaksymisPaatosVaihePDFt || !kieli) {
      return undefined;
    }
    return jatkoPaatos1VaiheJulkaisu?.hyvaksymisPaatosVaihePDFt[kieli];
  };
  const ensisijaisetPDFt = getPdft(jatkoPaatos1VaiheJulkaisu?.kielitiedot?.ensisijainenKieli);
  const toissijaisetPDFt = getPdft(jatkoPaatos1VaiheJulkaisu?.kielitiedot?.toissijainenKieli);

  if (!jatkoPaatos1VaiheJulkaisu || !projekti) {
    return <></>;
  }

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);

  let { kuulutusPaiva, published } = examineKuulutusPaiva(jatkoPaatos1VaiheJulkaisu.kuulutusPaiva);
  let hyvaksymisPaatosVaiheHref: string | undefined;
  if (published) {
    hyvaksymisPaatosVaiheHref = window.location.protocol + "//" + window.location.host + "/suunnitelma/" + projekti.oid + "/jatkaminen1";
  }

  return (
    <>
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Kuulutuspäivä</p>
          <p className="vayla-label md:col-span-3">Kuulutusvaihe päättyy</p>
          <p className="md:col-span-1 mb-0">{kuulutusPaiva}</p>
          <p className="md:col-span-1 mb-0">
            <FormatDate date={jatkoPaatos1VaiheJulkaisu.kuulutusVaihePaattyyPaiva} />
          </p>
          {process.env.ENVIRONMENT != "prod" && (
            <div className="md:col-span-2 mb-0">
              <ButtonFlatWithIcon
                icon="history"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.assign(ProjektiTestCommand.oid(projekti.oid).jatkopaatos1Menneisyyteen());
                }}
              >
                Siirrä päivän verran menneisyyteen (TESTAAJILLE)
              </ButtonFlatWithIcon>
              <ButtonFlatWithIcon
                icon="history"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.assign(ProjektiTestCommand.oid(projekti.oid).jatkopaatos1VuosiMenneisyyteen());
                }}
              >
                Siirrä vuoden verran menneisyyteen (TESTAAJILLE)
              </ButtonFlatWithIcon>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Päätöksen päivä</p>
          <p className="vayla-label md:col-span-3">Päätöksen asianumero</p>
          <p className="md:col-span-1 mb-0">
            <FormatDate date={projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm} />
          </p>
          <p className="md:col-span-3 mb-0">{projekti.kasittelynTila?.hyvaksymispaatos?.asianumero}</p>
        </div>
        <p>Päätös ja sen liitteet löytyvät Päätös ja sen liitteenä oleva aineisto -välilehdeltä.</p>
      </Section>
      <Section>
        <h4 className="vayla-label">Muutoksenhaku</h4>
        <p>
          Päätökseen voi valittamalla hakea muutosta {t(`hallinto-oikeus-ablatiivi.${jatkoPaatos1VaiheJulkaisu.hallintoOikeus}`)} 30 päivän
          kuluessa päätöksen tiedoksiannosta. Valitusosoituksen tiedosto löytyy Päätös ja sen liitteenä oleva aineisto -välilehdeltä.
        </p>
      </Section>
      <Section>
        <SectionContent>
          <p className="vayla-label">Kuulutuksen yhteyshenkilöt</p>
          <p></p>
          {jatkoPaatos1VaiheJulkaisu.yhteystiedot?.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {formatNimi(yhteystieto)}, puh. {yhteystieto.puhelinnumero},{" "}
              {yhteystieto?.sahkoposti ? replace(yhteystieto?.sahkoposti, "@", "[at]") : ""} ({yhteystieto.organisaatio})
            </p>
          ))}
        </SectionContent>
        {epaaktiivinen ? (
          <SectionContent>
            <p className="vayla-label">Kuulutus julkisella puolella</p>
            <p>
              Kuulutus on ollut nähtävillä julkisella puolella {formatDate(jatkoPaatos1VaiheJulkaisu.kuulutusPaiva)}—
              {formatDate(jatkoPaatos1VaiheJulkaisu.kuulutusVaihePaattyyPaiva)} välisen ajan.
            </p>
          </SectionContent>
        ) : (
          <SectionContent>
            <p className="vayla-label">Kuulutus julkisella puolella</p>
            {!published && <p>Linkki julkiselle puolelle muodostetaan kuulutuspäivänä. Kuulutuspäivä on {kuulutusPaiva}.</p>}
            {published && (
              <p>
                <ExtLink href={hyvaksymisPaatosVaiheHref}>Kuulutus palvelun julkisella puolella</ExtLink>
              </p>
            )}
          </SectionContent>
        )}
        {epaaktiivinen ? (
          <SectionContent>
            <p className="vayla-label">Ladattavat kuulutukset ja julkaisut</p>
            <p>Kuulutukset löytyvät asianhallinnasta.</p>
          </SectionContent>
        ) : (
          <SectionContent>
            <p className="vayla-label">Ladattavat kuulutukset ja ilmoitukset</p>
            <p>Kuulutus ja ilmoitus ensisijaisella kielellä ({lowerCase(jatkoPaatos1VaiheJulkaisu.kielitiedot?.ensisijainenKieli)})</p>
            {ensisijaisetPDFt && (
              <div className="flex flex-col mb-4">
                <div>
                  <Link underline="none" href={ensisijaisetPDFt.hyvaksymisKuulutusPDFPath} target="_blank">
                    {splitFilePath(ensisijaisetPDFt.hyvaksymisKuulutusPDFPath).fileName}
                  </Link>
                </div>
                <div>
                  <Link underline="none" href={ensisijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath} target="_blank">
                    {splitFilePath(ensisijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath).fileName}
                  </Link>
                </div>
                <div>
                  <Link
                    underline="none"
                    href={ensisijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath}
                    target="_blank"
                  >
                    {splitFilePath(ensisijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath).fileName}
                  </Link>
                </div>
                <div>
                  <Link underline="none" href={ensisijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath} target="_blank">
                    {splitFilePath(ensisijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath).fileName}
                  </Link>
                </div>
                <div>
                  <Link underline="none" href={ensisijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath} target="_blank">
                    {splitFilePath(ensisijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath).fileName}
                  </Link>
                </div>
              </div>
            )}

            {jatkoPaatos1VaiheJulkaisu.kielitiedot?.toissijainenKieli && (
              <div className="content mb-4">
                <p>Kuulutus ja ilmoitus toissijaisella kielellä ({lowerCase(jatkoPaatos1VaiheJulkaisu.kielitiedot?.toissijainenKieli)})</p>
                {toissijaisetPDFt && (
                  <div className="flex flex-col">
                    <div>
                      <Link underline="none" href={toissijaisetPDFt.hyvaksymisKuulutusPDFPath} target="_blank">
                        {splitFilePath(toissijaisetPDFt.hyvaksymisKuulutusPDFPath).fileName}
                      </Link>
                    </div>
                    <div>
                      <Link underline="none" href={toissijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath} target="_blank">
                        {splitFilePath(toissijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath).fileName}
                      </Link>
                    </div>
                    <div>
                      <Link
                        underline="none"
                        href={toissijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath}
                        target="_blank"
                      >
                        {splitFilePath(toissijaisetPDFt.ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath).fileName}
                      </Link>
                    </div>
                    <div>
                      <Link underline="none" href={toissijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath} target="_blank">
                        {splitFilePath(toissijaisetPDFt.hyvaksymisIlmoitusLausunnonantajillePDFPath).fileName}
                      </Link>
                    </div>
                    <div>
                      <Link underline="none" href={toissijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath} target="_blank">
                        {splitFilePath(toissijaisetPDFt.hyvaksymisIlmoitusMuistuttajillePDFPath).fileName}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionContent>
        )}
      </Section>
      <Section>
        <IlmoituksenVastaanottajatLukutila
          ilmoituksenVastaanottajat={jatkoPaatos1VaiheJulkaisu.ilmoituksenVastaanottajat}
          julkaisunTila={jatkoPaatos1VaiheJulkaisu.tila}
          epaaktiivinen={epaaktiivinen}
        />
      </Section>
    </>
  );
}
