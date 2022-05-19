import { ProjektiProjektiLuonti } from "../../../src/velho/projektirekisteri";

export const tieProjekti = (nimi: string): ProjektiProjektiLuonti =>
  ({
    ominaisuudet: {
      tila: "tila/tila15", // Aktiivinen
      "liittyva-organisaatio": null,
      vastuuhenkilo: "mikko.haapamaki@cgi.com",
      kuvaus: "testikuvaus",
      "maku-indeksi": null,
      hankekortti: null,
      kustannusarvio: null,
      kunta: null,
      paattyy: "2030-11-01T00:00:00Z",
      maakunta: null,
      vaylamuoto: ["tie"],
      rataosoitteet: null,
      nimi,
      varahenkilo: null,
      vesivaylanumerot: null,
      vaihe: "vaihe/vaihe10", // tie
      "rahoituksen-lahde": null,
      linkki: null,
      alkaa: "2020-01-01T00:00:00Z",
      tilaajaorganisaatio: "organisaatio/org05", // Pirkanmaan ELY-keskus
    },
    "lahdejarjestelman-id": null,
    paattyen: null,
    lahdejarjestelma: null,
    sijainnit: [],
    schemaversio: 6,
    projektijoukko: null,
    alkaen: null,
  } as unknown as ProjektiProjektiLuonti);
