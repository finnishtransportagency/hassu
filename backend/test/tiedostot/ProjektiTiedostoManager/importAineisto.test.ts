// Contains code generated or recommended by Amazon Q
import sinon from "sinon";
import { expect } from "chai";
import { AineistoTila } from "hassu-common/graphql/apiModel";
import { VelhoError, VelhoUnavailableError } from "hassu-common/error";
import { velho } from "../../../src/velho/velhoClient";
import { fileService } from "../../../src/files/fileService";
import { importAineisto } from "../../../src/tiedostot/ProjektiTiedostoManager";
import { Aineisto } from "../../../src/database/model";
import { PathTuple } from "../../../src/files/ProjektiPath";

const paths: PathTuple = { yllapitoPath: "/yllapito/projekti/1", publicPath: "/public/projekti/1", yllapitoFullPath: "" };

describe("importAineisto", () => {
  beforeEach(() => {
    sinon.stub(fileService, "createAineistoToProjekti").resolves("/yllapito/projekti/1/tiedosto.txt");
  });

  afterEach(() => {
    sinon.restore();
  });

  it("sets tila to VALMIS when Velho returns the document successfully", async () => {
    sinon.stub(velho, "getAineisto").resolves({
      disposition: 'attachment; filename="tiedosto.txt"',
      contents: Buffer.from("content"),
    });
    const aineisto: Aineisto = { dokumenttiOid: "1.2.3", tila: AineistoTila.ODOTTAA_TUONTIA, nimi: "tiedosto.txt", uuid: "uuid-1" };
    await importAineisto(aineisto, "projekti-oid", paths);
    expect(aineisto.tila).to.equal(AineistoTila.VALMIS);
    expect(aineisto.tiedosto).to.equal("/yllapito/projekti/1/tiedosto.txt");
  });

  it("sets tila to EI_LOYDY when Velho returns 404", async () => {
    sinon.stub(velho, "getAineisto").rejects(new VelhoError(404, "Not Found", "Kohdetta ei löydy"));
    const aineisto: Aineisto = { dokumenttiOid: "1.2.3", tila: AineistoTila.ODOTTAA_TUONTIA, nimi: "tiedosto.txt", uuid: "uuid-1" };
    await importAineisto(aineisto, "projekti-oid", paths);
    expect(aineisto.tila).to.equal(AineistoTila.EI_LOYDY);
  });

  it("throws when Velho returns a non-404 error", async () => {
    sinon.stub(velho, "getAineisto").rejects(new VelhoUnavailableError(503, "Service Unavailable"));
    const aineisto: Aineisto = { dokumenttiOid: "1.2.3", tila: AineistoTila.ODOTTAA_TUONTIA, nimi: "tiedosto.txt", uuid: "uuid-1" };
    await expect(importAineisto(aineisto, "projekti-oid", paths)).to.be.rejectedWith(VelhoUnavailableError);
  });
});
