import { api } from "../apiClient";
import { apiTestFixture } from "../apiTestFixture";
import {
  NahtavillaoloVaiheTila,
  ProjektiKayttaja,
  Status,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
} from "../../../../common/graphql/apiModel";
import { expectToMatchSnapshot } from "./util";
import { loadProjektiFromDatabase } from "./tests";
import { UserFixture } from "../../../test/fixture/userFixture";

const { expect } = require("chai");

export async function testNahtavillaOlo(oid: string, projektiPaallikko: string): Promise<void> {
  await api.tallennaProjekti({
    oid,
    nahtavillaoloVaihe: apiTestFixture.nahtavillaoloVaihe([projektiPaallikko]),
  });
  const projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  expectToMatchSnapshot("testNahtavillaOloPerustiedot", projekti.nahtavillaoloVaihe);
}

export async function testNahtavillaOloApproval(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await api.siirraTila({
    oid,
    tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO,
    toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
  });

  const projektiHyvaksyttavaksi = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  expect(projektiHyvaksyttavaksi.nahtavillaoloVaiheJulkaisut).to.have.length(1);
  expect(projektiHyvaksyttavaksi.nahtavillaoloVaiheJulkaisut[0].tila).to.eq(NahtavillaoloVaiheTila.ODOTTAA_HYVAKSYNTAA);

  await api.siirraTila({ oid, tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO, toiminto: TilasiirtymaToiminto.HYVAKSY });
  const projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  expectToMatchSnapshot("testNahtavillaOloAfterApproval", {
    nahtavillaoloVaihe: projekti.nahtavillaoloVaihe,
    nahtavillaoloVaiheJulkaisut: projekti.nahtavillaoloVaiheJulkaisut,
  });
}
