import { HyvaksymisPaatosVaiheJulkaisu, Kieli, Status } from "@services/api";
import React, { ReactElement } from "react";
import capitalize from "lodash/capitalize";
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
import IlmoituksenVastaanottajatLukutila from "./IlmoituksenVastaanottajatLukutila";
import ButtonFlatWithIcon from "@components/button/ButtonFlat";
import { ProjektiTestCommand } from "../../../../../common/testUtil.dev";
import { formatDate } from "src/util/dateUtils";

interface Props {
  hyvaksymisPaatosVaiheJulkaisu?: HyvaksymisPaatosVaiheJulkaisu | null;
  projekti: ProjektiLisatiedolla;
}

export default function HyvaksymisKuulutusLukunakyma({ hyvaksymisPaatosVaiheJulkaisu, projekti }: Props): ReactElement {
  const { t } = useTranslation("common");
  const getPdft = (kieli: Kieli | undefined | null) => {
    if (!hyvaksymisPaatosVaiheJulkaisu || !hyvaksymisPaatosVaiheJulkaisu.hyvaksymisPaatosVaihePDFt || !kieli) {
      return undefined;
    }
    return hyvaksymisPaatosVaiheJulkaisu?.hyvaksymisPaatosVaihePDFt[kieli];
  };
  const ensisijaisetPDFt = getPdft(hyvaksymisPaatosVaiheJulkaisu?.kielitiedot?.ensisijainenKieli);
  const toissijaisetPDFt = getPdft(hyvaksymisPaatosVaiheJulkaisu?.kielitiedot?.toissijainenKieli);

  if (!hyvaksymisPaatosVaiheJulkaisu || !projekti) {
    return <></>;
  }

  const epaaktiivinen = projekti.status === Status.EPAAKTIIVINEN;

  let { kuulutusPaiva, published } = examineKuulutusPaiva(hyvaksymisPaatosVaiheJulkaisu.kuulutusPaiva);
  let hyvaksymisPaatosVaiheHref: string | undefined;
  if (published) {
    hyvaksymisPaatosVaiheHref =
      window.location.protocol + "//" + window.location.host + "/suunnitelma/" + projekti.oid + "/hyvaksymispaatos";
  }

  return (
    <>
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Kuulutuspäivä</p>
          <p className="vayla-label md:col-span-3">Kuulutusvaihe päättyy</p>
          <p className="md:col-span-1 mb-0">{kuulutusPaiva}</p>
          <p className="md:col-span-1 mb-0">
            <FormatDate date={hyvaksymisPaatosVaiheJulkaisu.kuulutusVaihePaattyyPaiva} />
          </p>
          {process.env.ENVIRONMENT != "prod" && (
            <div className="md:col-span-2 mb-0">
              <ButtonFlatWithIcon
                icon="history"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.assign(ProjektiTestCommand.oid(projekti.oid).hyvaksymispaatosMenneisyyteen());
                }}
              >
                Siirrä päivän verran menneisyyteen (TESTAAJILLE)
              </ButtonFlatWithIcon>
              <ButtonFlatWithIcon
                icon="history"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.assign(ProjektiTestCommand.oid(projekti.oid).hyvaksymispaatosVuosiMenneisyyteen());
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
          Päätökseen voi valittamalla hakea muutosta {t(`hallinto-oikeus-ablatiivi.${hyvaksymisPaatosVaiheJulkaisu.hallintoOikeus}`)} 30
          päivän kuluessa päätöksen tiedoksiannosta. Valitusosoituksen tiedosto löytyy Päätös ja sen liitteenä oleva aineisto -välilehdeltä.
        </p>
      </Section>
      <Section>
        <SectionContent>
          <p className="vayla-label">Kuulutuksen yhteyshenkilöt</p>
          <p></p>
          {hyvaksymisPaatosVaiheJulkaisu.yhteystiedot?.map((yhteystieto, index) => (
            <p style={{ margin: 0 }} key={index}>
              {capitalize(yhteystieto.etunimi)} {capitalize(yhteystieto.sukunimi)}, puh. {yhteystieto.puhelinnumero},{" "}
              {yhteystieto?.sahkoposti ? replace(yhteystieto?.sahkoposti, "@", "[at]") : ""} ({yhteystieto.organisaatio})
            </p>
          ))}
        </SectionContent>
        {epaaktiivinen ? (
          <SectionContent>
            <p className="vayla-label">Kuulutus julkisella puolella</p>
            <p>
              Kuulutus on ollut nähtävillä julkisella puolella {formatDate(hyvaksymisPaatosVaiheJulkaisu.kuulutusPaiva)}—
              {formatDate(hyvaksymisPaatosVaiheJulkaisu.kuulutusVaihePaattyyPaiva)} välisen ajan.
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
            <p>Kuulutus ja ilmoitus ensisijaisella kielellä ({lowerCase(hyvaksymisPaatosVaiheJulkaisu.kielitiedot?.ensisijainenKieli)})</p>
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

            {hyvaksymisPaatosVaiheJulkaisu.kielitiedot?.toissijainenKieli && (
              <div className="content mb-4">
                <p>
                  Kuulutus ja ilmoitus toissijaisella kielellä ({lowerCase(hyvaksymisPaatosVaiheJulkaisu.kielitiedot?.toissijainenKieli)})
                </p>
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
        <IlmoituksenVastaanottajatLukutila hyvaksymisPaatosVaiheJulkaisu={hyvaksymisPaatosVaiheJulkaisu} />
      </Section>
    </>
  );
}
