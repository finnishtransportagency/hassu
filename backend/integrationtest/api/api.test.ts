/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { runAsVaylaUser } from "../util/users";
import { api } from "./apiClient";
import { setupLocalDatabase } from "../util/databaseUtil";
import * as log from "loglevel";
import { AloitusKuulutus, KuulutusTyyppi, SuunnitteluSopimus } from "../../../common/graphql/apiModel";
import fs from "fs";

const { expect } = require("chai");

async function loadProjektiFromDatabase(oid: string) {
  const savedProjekti = await api.lataaProjekti(oid);
  expect(savedProjekti.tallennettu).to.be.true;
  return savedProjekti;
}

describe("Api", () => {
  beforeEach("Initialize test database", async () => await setupLocalDatabase());

  it("should search, load and save a project", async function () {
    if (process.env.SKIP_VELHO_TESTS) {
      this.skip();
    }
    const user = runAsVaylaUser();

    const oid = await searchProjectsFromVelhoAndPickFirst();
    const projekti = await api.lataaProjekti(oid);
    await expect(projekti.tallennettu).to.be.undefined;
    log.info(JSON.stringify(projekti, null, 2));

    const kayttoOikeudet = projekti.kayttoOikeudet?.map((value) => ({
      rooli: value.rooli,
      kayttajatunnus: value.kayttajatunnus,
      puhelinnumero: "123",
    }));

    await api.tallennaProjekti({
      oid,
      kayttoOikeudet,
    });
    await loadProjektiFromDatabase(oid);

    const newNote = "uusi muistiinpano";
    const suunnitteluSopimus: SuunnitteluSopimus = {
      __typename: "SuunnitteluSopimus",
      email: "Joku.Jossain@vayla.fi",
      puhelinnumero: "123",
      etunimi: "Joku",
      sukunimi: "Jossain",
      kunta: "Nokia",
    };

    const aloitusKuulutus: AloitusKuulutus = {
      __typename: "AloitusKuulutus",
      kuulutusPaiva: "2022-01-02",
      hankkeenKuvaus: "Lorem Ipsum",
      hankkeenKuvausRuotsi: "På Svenska",
      hankkeenKuvausSaame: "Saameksi",
      siirtyySuunnitteluVaiheeseen: "2022-01-01",
      elyKeskus: "Pirkanmaa",
      yhteystiedot: [user.uid as string],
    };

    await api.tallennaProjekti({
      oid,
      muistiinpano: newNote,
      aloitusKuulutus,
      suunnitteluSopimus,
    });

    const updatedProjekti = await loadProjektiFromDatabase(oid);
    expect(updatedProjekti.muistiinpano).to.be.equal(newNote);
    expect(updatedProjekti.aloitusKuulutus).eql(aloitusKuulutus);
    expect(updatedProjekti.suunnitteluSopimus).eql(suunnitteluSopimus);

    const pdf = await api.lataaKuulutusPDF(oid, KuulutusTyyppi.ALOITUSKUULUTUS);
    expect(pdf.nimi).to.be.equal("aloituskuulutus.pdf");
    expect(pdf.sisalto).not.to.be.empty;
    expect(pdf.sisalto.length).to.be.greaterThan(50000);
    fs.mkdirSync(".report", { recursive: true });
    fs.writeFileSync(".report/" + pdf.nimi, Buffer.from(pdf.sisalto, "base64"));
  });
});

async function searchProjectsFromVelhoAndPickFirst(): Promise<string> {
  const searchResult = await api.getVelhoSuunnitelmasByName("tampere");
  // tslint:disable-next-line:no-unused-expression
  expect(searchResult).not.to.be.empty;

  const oid = searchResult.pop()?.oid;
  if (!oid) {
    fail("No suitable projekti found from Velho");
  }
  return oid;
}
