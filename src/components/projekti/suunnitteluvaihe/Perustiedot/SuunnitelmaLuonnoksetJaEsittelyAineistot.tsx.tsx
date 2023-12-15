import Section from "@components/layout/Section2";
import { AineistoInput, VuorovaikutusKierros } from "@services/api";
import { AineistotSaavutettavuusOhje } from "@components/projekti/common/AineistotSaavutettavuusOhje";
import ContentSpacer from "@components/layout/ContentSpacer";
import ButtonFlat from "@components/button/ButtonFlat";
import { useProjekti } from "src/hooks/useProjekti";
import { Key, useState } from "react";
import { SuunnittelunPerustiedotFormValues } from ".";
import { useFieldArray, useFormContext } from "react-hook-form";
import find from "lodash/find";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import HassuAccordion from "@components/HassuAccordion";
import AineistoTable, { SuunnitteluVaiheAineistoTyyppi } from "../komponentit/AineistoTable";
import Button from "@components/button/Button";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";

interface Props {
  vuorovaikutus: VuorovaikutusKierros | null | undefined;
}

export default function SuunnitelmaLuonnoksetJaEsittelyAineistot({ vuorovaikutus }: Props) {
  const { data: projekti } = useProjekti();
  const [expandedEsittelyAineisto, setExpandedEsittelyAineisto] = useState<Key[]>([]);
  const [expandedSuunnitelmaLuonnokset, setExpandedSuunnitelmaLuonnokset] = useState<Key[]>([]);
  const [esittelyAineistoDialogOpen, setEsittelyAineistoDialogOpen] = useState(false);
  const [suunnitelmaLuonnoksetDialogOpen, setSuunnitelmaLuonnoksetDialogOpen] = useState(false);

  const { control, watch, setValue } = useFormContext<SuunnittelunPerustiedotFormValues>();

  const esittelyaineistotFieldArray = useFieldArray({ name: "vuorovaikutusKierros.esittelyaineistot", control });
  const poistetutEsittelyaineistotFieldArray = useFieldArray({ name: "vuorovaikutusKierros.poistetutEsittelyaineistot", control });
  const suunnitelmaluonnoksetFieldArray = useFieldArray({ name: "vuorovaikutusKierros.suunnitelmaluonnokset", control });
  const poistetutSuunnitelmaluonnoksetFieldArray = useFieldArray({ name: "vuorovaikutusKierros.poistetutSuunnitelmaluonnokset", control });

  const esittelyaineistot = watch("vuorovaikutusKierros.esittelyaineistot");
  const suunnitelmaluonnokset = watch("vuorovaikutusKierros.suunnitelmaluonnokset");

  const poistetutEsittelyaineistot = watch("vuorovaikutusKierros.poistetutEsittelyaineistot");
  const poistetutSuunnitelmaluonnokset = watch("vuorovaikutusKierros.poistetutSuunnitelmaluonnokset");

  const areAineistoKategoriesExpanded = !!expandedEsittelyAineisto.length || !!expandedSuunnitelmaLuonnokset.length;

  return (
    <Section noDivider>
      <h4 className="vayla-small-title">Suunnitelmaluonnokset ja esittelyaineistot</h4>
      <p>
        Kansalaiselle järjestelmän julkisella puolella esiteltävät suunnitelmaluonnokset ja esittelylyaineistot tuodaan Projektivelhosta.
        Suunnitelmaluonnokset ja aineistot julkaistaan palvelun julkisella puolella kutsun julkaisupäivänä. Suunnitelmaluonnoksia ja
        esittelyaineistoja on mahdollista päivittää myös kutsun julkaisun jälkeen.
      </p>
      <AineistotSaavutettavuusOhje />
      <ContentSpacer>
        <h5 className="vayla-smallest-title">Suunnitelmaluonnokset ja esittelyaineistot</h5>
        <p>Aineistoille tulee valita kategoria / otsikko, jonka alla ne esitetään palvelun julkisella puolella.</p>
        <p>Aineistojen järjestys kunkin otsikon alla määräytyy listan järjestyksen mukaan.</p>
        <ButtonFlat
          type="button"
          onClick={() => {
            if (areAineistoKategoriesExpanded) {
              setExpandedEsittelyAineisto([]);
              setExpandedSuunnitelmaLuonnokset([]);
            } else {
              setExpandedEsittelyAineisto([0]);
              setExpandedSuunnitelmaLuonnokset([0]);
            }
          }}
          iconComponent={
            <span className="fa-layers">
              <FontAwesomeIcon icon="chevron-down" transform={`down-6`} flip={areAineistoKategoriesExpanded ? "vertical" : undefined} />
              <FontAwesomeIcon icon="chevron-up" transform={`up-6`} flip={areAineistoKategoriesExpanded ? "vertical" : undefined} />
            </span>
          }
        >
          {areAineistoKategoriesExpanded ? "Sulje" : "Avaa"} kaikki kategoriat
        </ButtonFlat>
        <HassuAccordion
          expandedState={[expandedEsittelyAineisto, setExpandedEsittelyAineisto]}
          items={[
            {
              title: `Esittelyaineisto (${esittelyaineistot?.length || 0})`,
              content: (
                <>
                  {projekti?.oid && !!esittelyaineistot?.length ? (
                    <AineistoTable
                      aineistoTyyppi={SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT}
                      vuorovaikutus={vuorovaikutus}
                      esittelyaineistotFieldArray={esittelyaineistotFieldArray}
                      poistetutEsittelyaineistotFieldArray={poistetutEsittelyaineistotFieldArray}
                      poistetutSuunnittelmaluonnoksetFieldArray={poistetutSuunnitelmaluonnoksetFieldArray}
                      suunnittelmaluonnoksetFieldArray={suunnitelmaluonnoksetFieldArray}
                    />
                  ) : (
                    <p>Ei aineistoa. Aloita aineistojen tuonti painamalla Tuo Aineistoja -painiketta.</p>
                  )}
                </>
              ),
            },
          ]}
        />
        <Button type="button" id="select_esittelyaineistot_button" onClick={() => setEsittelyAineistoDialogOpen(true)}>
          Tuo Aineistoja
        </Button>
        <HassuAccordion
          expandedState={[expandedSuunnitelmaLuonnokset, setExpandedSuunnitelmaLuonnokset]}
          items={[
            {
              title: `Suunnitelmaluonnokset (${suunnitelmaluonnokset?.length || 0})`,
              content: (
                <>
                  {projekti?.oid && !!suunnitelmaluonnokset?.length ? (
                    <AineistoTable
                      aineistoTyyppi={SuunnitteluVaiheAineistoTyyppi.SUUNNITELMALUONNOKSET}
                      vuorovaikutus={vuorovaikutus}
                      esittelyaineistotFieldArray={esittelyaineistotFieldArray}
                      poistetutEsittelyaineistotFieldArray={poistetutEsittelyaineistotFieldArray}
                      poistetutSuunnittelmaluonnoksetFieldArray={poistetutSuunnitelmaluonnoksetFieldArray}
                      suunnittelmaluonnoksetFieldArray={suunnitelmaluonnoksetFieldArray}
                    />
                  ) : (
                    <p>Ei aineistoa. Aloita aineistojen tuonti painamalla Tuo Aineistoja -painiketta.</p>
                  )}
                </>
              ),
            },
          ]}
        />
        <Button type="button" id="select_suunnitelmaluonnokset_button" onClick={() => setSuunnitelmaLuonnoksetDialogOpen(true)}>
          Tuo Aineistoja
        </Button>
      </ContentSpacer>
      <AineistojenValitseminenDialog
        open={esittelyAineistoDialogOpen}
        infoText="Valitse tiedostot,
        jotka haluat tuoda suunnitteluvaiheeseen."
        onClose={() => setEsittelyAineistoDialogOpen(false)}
        onSubmit={(aineistot) => {
          const { poistetutEa, lisatytEa, lisatytSl, poistetutSl } = aineistot
            .map<AineistoInput>((velhoAineisto) => ({
              dokumenttiOid: velhoAineisto.oid,
              nimi: velhoAineisto.tiedosto,
            }))
            .reduce<{
              lisatytEa: AineistoInput[];
              poistetutEa: AineistoInput[];
              lisatytSl: AineistoInput[];
              poistetutSl: AineistoInput[];
            }>(
              (acc, velhoAineisto) => {
                if (!find(acc.lisatytEa, { dokumenttiOid: velhoAineisto.dokumenttiOid })) {
                  acc.lisatytEa.push({ ...velhoAineisto, jarjestys: acc.lisatytEa.length });
                }
                acc.lisatytSl = acc.lisatytSl.filter((poistettu) => poistettu.dokumenttiOid !== velhoAineisto.dokumenttiOid);
                acc.poistetutEa = acc.poistetutEa.filter((poistettu) => poistettu.dokumenttiOid !== velhoAineisto.dokumenttiOid);
                acc.poistetutSl = acc.poistetutSl.filter((poistettu) => poistettu.dokumenttiOid !== velhoAineisto.dokumenttiOid);
                return acc;
              },
              {
                lisatytEa: esittelyaineistot || [],
                poistetutEa: poistetutEsittelyaineistot || [],
                lisatytSl: suunnitelmaluonnokset || [],
                poistetutSl: poistetutSuunnitelmaluonnokset || [],
              }
            );
          setValue("vuorovaikutusKierros.poistetutEsittelyaineistot", poistetutEa, { shouldDirty: true });
          setValue("vuorovaikutusKierros.esittelyaineistot", lisatytEa, { shouldDirty: true });
          setValue("vuorovaikutusKierros.poistetutSuunnitelmaluonnokset", poistetutSl, { shouldDirty: true });
          setValue("vuorovaikutusKierros.suunnitelmaluonnokset", lisatytSl, { shouldDirty: true });
        }}
      />
      <AineistojenValitseminenDialog
        open={suunnitelmaLuonnoksetDialogOpen}
        infoText="Valitse tiedostot,
        jotka haluat tuoda suunnitteluvaiheeseen."
        onClose={() => setSuunnitelmaLuonnoksetDialogOpen(false)}
        onSubmit={(aineistot) => {
          const { poistetutEa, lisatytEa, lisatytSl, poistetutSl } = aineistot
            .map<AineistoInput>((velhoAineisto) => ({
              dokumenttiOid: velhoAineisto.oid,
              nimi: velhoAineisto.tiedosto,
            }))
            .reduce<{
              lisatytEa: AineistoInput[];
              poistetutEa: AineistoInput[];
              lisatytSl: AineistoInput[];
              poistetutSl: AineistoInput[];
            }>(
              (acc, velhoAineisto) => {
                if (!find(acc.lisatytSl, { dokumenttiOid: velhoAineisto.dokumenttiOid })) {
                  acc.lisatytSl.push({ ...velhoAineisto, jarjestys: acc.lisatytSl.length });
                }
                acc.lisatytEa = acc.lisatytEa.filter((poistettu) => poistettu.dokumenttiOid !== velhoAineisto.dokumenttiOid);
                acc.poistetutEa = acc.poistetutEa.filter((poistettu) => poistettu.dokumenttiOid !== velhoAineisto.dokumenttiOid);
                acc.poistetutSl = acc.poistetutSl.filter((poistettu) => poistettu.dokumenttiOid !== velhoAineisto.dokumenttiOid);
                return acc;
              },
              {
                lisatytEa: esittelyaineistot || [],
                poistetutEa: poistetutEsittelyaineistot || [],
                lisatytSl: suunnitelmaluonnokset || [],
                poistetutSl: poistetutSuunnitelmaluonnokset || [],
              }
            );
          setValue("vuorovaikutusKierros.poistetutEsittelyaineistot", poistetutEa, { shouldDirty: true });
          setValue("vuorovaikutusKierros.esittelyaineistot", lisatytEa, { shouldDirty: true });
          setValue("vuorovaikutusKierros.poistetutSuunnitelmaluonnokset", poistetutSl, { shouldDirty: true });
          setValue("vuorovaikutusKierros.suunnitelmaluonnokset", lisatytSl, { shouldDirty: true });
        }}
      />
    </Section>
  );
}
