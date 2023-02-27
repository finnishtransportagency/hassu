import { api } from "../apiClient";
import { AineistoInput, Projekti, VelhoToimeksianto } from "../../../../common/graphql/apiModel";
import { assertIsDefined } from "../../../src/util/assertions";
import { pickAineistotFromToimeksiannotByName } from "./tests";
import { expect } from "chai";

export async function paivitaVuorovaikutusAineisto(projekti: Projekti, velhoToimeksiannot: VelhoToimeksianto[]): Promise<void> {
  const { oid, versio } = projekti;
  const kierros = projekti?.vuorovaikutusKierros;
  assertIsDefined(kierros);
  const { suunnitelmaluonnokset, kysymyksetJaPalautteetViimeistaan, ...rest } = kierros;
  assertIsDefined(kysymyksetJaPalautteetViimeistaan);
  assertIsDefined(suunnitelmaluonnokset);
  const suunnitelmaluonnoksetInput: AineistoInput[] = suunnitelmaluonnokset.map((aineisto) => {
    const { dokumenttiOid, nimi, kategoriaId, jarjestys } = aineisto;
    return { dokumenttiOid, nimi, kategoriaId, jarjestys };
  });

  const velhoAineistos = pickAineistotFromToimeksiannotByName(velhoToimeksiannot, "T340 Tutkitut vaihtoehdot.txt");
  expect(velhoAineistos.length).to.be.greaterThan(0);
  const velhoAineisto = velhoAineistos[0];
  suunnitelmaluonnoksetInput.push({ dokumenttiOid: velhoAineisto.oid, nimi: velhoAineisto.tiedosto });
  await api.paivitaPerustiedot({
    oid,
    versio,
    vuorovaikutusKierros: {
      ...rest,
      kysymyksetJaPalautteetViimeistaan,
      suunnitelmaluonnokset: suunnitelmaluonnoksetInput,
    },
  });
}
