import { api } from "../apiClient";
import {
  AloitusKuulutus,
  AloitusKuulutusJulkaisu,
  HyvaksymisPaatosVaiheJulkaisu,
  KuulutusJulkaisuTila,
  NahtavillaoloVaiheJulkaisu,
  NykyinenKayttaja,
  Projekti,
  ProjektiJulkinen,
  ProjektiKayttaja,
  Status,
  TallennaProjektiInput,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  VuorovaikutusKierrosJulkaisu,
} from "hassu-common/graphql/apiModel";

import { expectToMatchSnapshot } from "./util";
import { asetaAika, loadProjektiFromDatabase, tallennaEULogo, testPublicAccessToProjekti } from "./tests";
import { UserFixture } from "../../../test/fixture/userFixture";
import {
  cleanupAloituskuulutusTimestamps,
  cleanupHyvaksymisPaatosVaiheTimestamps,
  cleanupNahtavillaoloTimestamps,
} from "../../../commonTestUtil/cleanUpFunctions";
import { dateToString, parseDate } from "../../../src/util/dateUtil";

import { expect } from "chai"; //

export enum UudelleelleenkuulutettavaVaihe {
  ALOITUSKUULUTUS,
  NAHTAVILLAOLO,
  HYVAKSYMISPAATOSVAIHE,
  JATKOPAATOS_1,
  JATKOPAATOS_2,
}

type ProjektinSiivoaja = (projekti: Projekti) => Partial<Projekti>;
type ProjektiJulkinenSiivoaja = (projekti: ProjektiJulkinen) => Partial<ProjektiJulkinen>;
type JulkaisuKey = keyof Pick<
  Projekti,
  | "aloitusKuulutusJulkaisu"
  | "nahtavillaoloVaiheJulkaisu"
  | "hyvaksymisPaatosVaiheJulkaisu"
  | "jatkoPaatos1VaiheJulkaisu"
  | "jatkoPaatos2VaiheJulkaisu"
>;

type LuonnosKey = keyof Pick<
  Projekti,
  "aloitusKuulutus" | "nahtavillaoloVaihe" | "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe"
>;

type SaamePDFKey =
  | keyof Pick<AloitusKuulutusJulkaisu, "aloituskuulutusSaamePDFt">
  | keyof Pick<NahtavillaoloVaiheJulkaisu, "nahtavillaoloSaamePDFt">
  | keyof Pick<VuorovaikutusKierrosJulkaisu, "vuorovaikutusSaamePDFt">
  | keyof Pick<HyvaksymisPaatosVaiheJulkaisu, "hyvaksymisPaatosVaiheSaamePDFt">;

export type UudelleelleenkuulutettavaVaiheenTiedot = {
  initialStatus: Status;
  status: Status;
  publicStatus: Status;
  tilasiirtymaTyyppi: TilasiirtymaTyyppi;
  julkaisuKey: JulkaisuKey;
  luonnosKey: LuonnosKey;
  luonnoksenSiivoaja: ProjektinSiivoaja;
  julkaisunSiivoaja: ProjektinSiivoaja;
  julkaisuJulkinenSiivoaja: ProjektiJulkinenSiivoaja;
};

const uudelleenKuulutusTiedotVaiheelle: Record<UudelleelleenkuulutettavaVaihe, UudelleelleenkuulutettavaVaiheenTiedot> = {
  [UudelleelleenkuulutettavaVaihe.ALOITUSKUULUTUS]: {
    initialStatus: Status.SUUNNITTELU,
    status: Status.SUUNNITTELU,
    publicStatus: Status.ALOITUSKUULUTUS,
    tilasiirtymaTyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    julkaisuKey: "aloitusKuulutusJulkaisu",
    luonnosKey: "aloitusKuulutus",
    luonnoksenSiivoaja: ({ aloitusKuulutus }) => ({
      aloitusKuulutus: cleanupAloituskuulutusTimestamps(aloitusKuulutus) as Projekti["aloitusKuulutus"],
    }),
    julkaisunSiivoaja: ({ aloitusKuulutusJulkaisu }) => ({
      aloitusKuulutusJulkaisu: cleanupAloituskuulutusTimestamps(aloitusKuulutusJulkaisu) as Projekti["aloitusKuulutusJulkaisu"],
    }),
    julkaisuJulkinenSiivoaja: ({ aloitusKuulutusJulkaisu }) => ({
      aloitusKuulutusJulkaisu,
    }),
  },
  [UudelleelleenkuulutettavaVaihe.NAHTAVILLAOLO]: {
    initialStatus: Status.NAHTAVILLAOLO,
    status: Status.NAHTAVILLAOLO,
    tilasiirtymaTyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO,
    publicStatus: Status.NAHTAVILLAOLO,
    julkaisuKey: "nahtavillaoloVaiheJulkaisu",
    luonnosKey: "nahtavillaoloVaihe",
    luonnoksenSiivoaja: ({ nahtavillaoloVaihe }) => ({
      nahtavillaoloVaihe: cleanupNahtavillaoloTimestamps(nahtavillaoloVaihe) as Projekti["nahtavillaoloVaihe"],
    }),
    julkaisunSiivoaja: ({ nahtavillaoloVaiheJulkaisu }) => ({
      nahtavillaoloVaiheJulkaisu: cleanupNahtavillaoloTimestamps(nahtavillaoloVaiheJulkaisu) as Projekti["nahtavillaoloVaiheJulkaisu"],
    }),
    julkaisuJulkinenSiivoaja: ({ nahtavillaoloVaihe }) => ({
      nahtavillaoloVaihe: cleanupNahtavillaoloTimestamps(nahtavillaoloVaihe),
    }),
  },
  [UudelleelleenkuulutettavaVaihe.HYVAKSYMISPAATOSVAIHE]: {
    initialStatus: Status.HYVAKSYTTY,
    status: Status.HYVAKSYTTY,
    publicStatus: Status.HYVAKSYTTY,
    tilasiirtymaTyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
    julkaisuKey: "hyvaksymisPaatosVaiheJulkaisu",
    luonnosKey: "hyvaksymisPaatosVaihe",
    luonnoksenSiivoaja: ({ hyvaksymisPaatosVaihe }) => ({
      hyvaksymisPaatosVaihe: cleanupHyvaksymisPaatosVaiheTimestamps(hyvaksymisPaatosVaihe) as Projekti["hyvaksymisPaatosVaihe"],
    }),
    julkaisunSiivoaja: ({ hyvaksymisPaatosVaiheJulkaisu }) => ({
      hyvaksymisPaatosVaiheJulkaisu: cleanupHyvaksymisPaatosVaiheTimestamps(
        hyvaksymisPaatosVaiheJulkaisu
      ) as Projekti["hyvaksymisPaatosVaiheJulkaisu"],
    }),
    julkaisuJulkinenSiivoaja: ({ hyvaksymisPaatosVaihe }) => ({
      hyvaksymisPaatosVaihe: cleanupHyvaksymisPaatosVaiheTimestamps(hyvaksymisPaatosVaihe),
    }),
  },
  [UudelleelleenkuulutettavaVaihe.JATKOPAATOS_1]: {
    initialStatus: Status.JATKOPAATOS_1,
    status: Status.JATKOPAATOS_1,
    publicStatus: Status.JATKOPAATOS_1,
    tilasiirtymaTyyppi: TilasiirtymaTyyppi.JATKOPAATOS_1,
    julkaisuKey: "jatkoPaatos1VaiheJulkaisu",
    luonnosKey: "jatkoPaatos1Vaihe",
    luonnoksenSiivoaja: ({ jatkoPaatos1Vaihe }) => ({
      jatkoPaatos1Vaihe: cleanupHyvaksymisPaatosVaiheTimestamps(jatkoPaatos1Vaihe) as Projekti["jatkoPaatos1Vaihe"],
    }),
    julkaisunSiivoaja: ({ jatkoPaatos1VaiheJulkaisu }) => ({
      jatkoPaatos1VaiheJulkaisu: cleanupHyvaksymisPaatosVaiheTimestamps(jatkoPaatos1VaiheJulkaisu) as Projekti["jatkoPaatos1VaiheJulkaisu"],
    }),
    julkaisuJulkinenSiivoaja: ({ jatkoPaatos1Vaihe }) => ({
      jatkoPaatos1Vaihe: cleanupHyvaksymisPaatosVaiheTimestamps(jatkoPaatos1Vaihe),
    }),
  },
  [UudelleelleenkuulutettavaVaihe.JATKOPAATOS_2]: {
    initialStatus: Status.JATKOPAATOS_2,
    status: Status.JATKOPAATOS_2,
    publicStatus: Status.JATKOPAATOS_2,
    tilasiirtymaTyyppi: TilasiirtymaTyyppi.JATKOPAATOS_2,
    julkaisuKey: "jatkoPaatos2VaiheJulkaisu",
    luonnosKey: "jatkoPaatos2Vaihe",
    luonnoksenSiivoaja: ({ jatkoPaatos2Vaihe }) => ({
      jatkoPaatos2Vaihe: cleanupHyvaksymisPaatosVaiheTimestamps(jatkoPaatos2Vaihe) as Projekti["jatkoPaatos2Vaihe"],
    }),
    julkaisunSiivoaja: ({ jatkoPaatos2VaiheJulkaisu }) => ({
      jatkoPaatos2VaiheJulkaisu: cleanupHyvaksymisPaatosVaiheTimestamps(jatkoPaatos2VaiheJulkaisu) as Projekti["jatkoPaatos2VaiheJulkaisu"],
    }),
    julkaisuJulkinenSiivoaja: ({ jatkoPaatos2Vaihe }) => ({
      jatkoPaatos2Vaihe: cleanupHyvaksymisPaatosVaiheTimestamps(jatkoPaatos2Vaihe),
    }),
  },
};

export async function testUudelleenkuulutus(
  oid: string,
  siirtymaTyyppi: UudelleelleenkuulutettavaVaihe,
  projektiPaallikko: ProjektiKayttaja,
  muokkaaja: NykyinenKayttaja,
  userFixture: UserFixture,
  kuulutusPaiva: string,
  saame?: SaamePDFKey
): Promise<void> {
  const {
    status,
    tilasiirtymaTyyppi,
    julkaisuKey,
    luonnoksenSiivoaja,
    luonnosKey,
    julkaisuJulkinenSiivoaja,
    julkaisunSiivoaja,
    initialStatus,
    publicStatus,
  } = uudelleenKuulutusTiedotVaiheelle[siirtymaTyyppi];

  userFixture.loginAsAdmin();
  await asetaUudelleenkuulutettavaksi(oid, initialStatus, julkaisuKey, tilasiirtymaTyyppi);
  userFixture.logout();

  await testPublicAccessToProjekti(
    oid,
    publicStatus,
    userFixture,
    `${luonnosKey}JulkinenAfterAsetaUudelleenkuulutettavaksi`,
    julkaisuJulkinenSiivoaja
  );

  userFixture.loginAs(muokkaaja);
  await talletaSyytUudelleenkuulutukselleJaLahetaHyvaksyttavaksi(
    oid,
    status,
    tilasiirtymaTyyppi,
    luonnosKey,
    luonnoksenSiivoaja,
    kuulutusPaiva,
    saame
  );
  userFixture.logout();

  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await hyvaksyUudelleenkuulutus(oid, status, julkaisuKey, tilasiirtymaTyyppi, julkaisunSiivoaja);

  await tarkistaProjektinTiedot(oid, status, luonnoksenSiivoaja, julkaisunSiivoaja);

  userFixture.logout();

  asetaAika(kuulutusPaiva);
  await testPublicAccessToProjekti(
    oid,
    publicStatus,
    userFixture,
    `${luonnosKey}JulkinenAfterHyvaksyUudelleenKuulutus`,
    julkaisuJulkinenSiivoaja
  );
}

async function asetaUudelleenkuulutettavaksi(
  oid: string,
  initialStatus: Status,
  julkaisuKey: JulkaisuKey,
  tilasiirtymaTyyppi: TilasiirtymaTyyppi
) {
  const projektiUudelleenkuulutettavaksi = await loadProjektiFromDatabase(oid, initialStatus);
  expect(projektiUudelleenkuulutettavaksi[julkaisuKey]).to.be.an("object");
  expect(projektiUudelleenkuulutettavaksi[julkaisuKey]?.tila).to.eq(KuulutusJulkaisuTila.HYVAKSYTTY);

  await api.siirraTila({ oid, tyyppi: tilasiirtymaTyyppi, toiminto: TilasiirtymaToiminto.UUDELLEENKUULUTA });
}

async function talletaSyytUudelleenkuulutukselleJaLahetaHyvaksyttavaksi(
  oid: string,
  status: Status,
  tilasiirtymaTyyppi: TilasiirtymaTyyppi,
  luonnosKey: LuonnosKey,
  luonnoksenSiivoaja: ProjektinSiivoaja,
  kuulutusPaiva: string,
  saamePdfKey?: SaamePDFKey
) {
  const projekti = await loadProjektiFromDatabase(oid, status);
  expectToMatchSnapshot("testVaiheAfterSiirraUudelleenkuulutettavaksi", luonnoksenSiivoaja(projekti));

  const input: TallennaProjektiInput = {
    oid,
    versio: projekti.versio,
    [luonnosKey]: {
      kuulutusPaiva,
      kuulutusVaihePaattyyPaiva: dateToString(parseDate(kuulutusPaiva).add(1, "month")),
      uudelleenKuulutus: {
        selosteKuulutukselle: { SUOMI: "Kuulutetaan uudelleen kuulutusteksti ..." },
        selosteLahetekirjeeseen: { SUOMI: "Kuulutetaan uudelleen lähetekirjeteksti ..." },
      },
    },
  };
  if (saamePdfKey) {
    const uploadedIlmoitus = await tallennaEULogo("saameilmoitus.pdf");
    const uploadedKuulutus = await tallennaEULogo("saamekuulutus.pdf");
    input[luonnosKey] = {
      ...input[luonnosKey],
      [saamePdfKey]: {
        POHJOISSAAME: { kuulutusPDFPath: uploadedKuulutus, kuulutusIlmoitusPDFPath: uploadedIlmoitus },
      },
    };
  }
  await api.tallennaJaSiirraTilaa(input, { oid, toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI, tyyppi: tilasiirtymaTyyppi });
}

async function hyvaksyUudelleenkuulutus(
  oid: string,
  status: Status,
  julkaisuKey: JulkaisuKey,
  tilasiirtymaTyyppi: TilasiirtymaTyyppi,
  julkaisunSiivoaja: ProjektinSiivoaja
) {
  const projekti = await loadProjektiFromDatabase(oid, status);
  expect(projekti[julkaisuKey]).to.be.an("object");
  expect(projekti[julkaisuKey]?.tila).to.eq(KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);

  expectToMatchSnapshot("testJulkaisuAfterUudelleenkuulutus", julkaisunSiivoaja(projekti));

  await api.siirraTila({ oid, tyyppi: tilasiirtymaTyyppi, toiminto: TilasiirtymaToiminto.HYVAKSY });
}

async function tarkistaProjektinTiedot(
  oid: string,
  status: Status,
  luonnoksenSiivoaja: ProjektinSiivoaja,
  julkaisunSiivoaja: ProjektinSiivoaja
) {
  const projekti = await loadProjektiFromDatabase(oid, status);
  expectToMatchSnapshot("testJulkaisuAfterUudelleenkuulutus", julkaisunSiivoaja(projekti));
  expectToMatchSnapshot("testLuonnosAfterUudelleenkuulutus", luonnoksenSiivoaja(projekti));
}
