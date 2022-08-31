import { describe, it } from "mocha";
import { ProjektiFixture } from "../fixture/projektiFixture";
import cloneDeep from "lodash/cloneDeep";
import { projektiAdapter } from "../../src/projekti/adapter/projektiAdapter";
import { findPublishedAloitusKuulutusJulkaisu } from "../../src/projekti/adapter/common";

import { IllegalArgumentError } from "../../src/error/IllegalArgumentError";

const { expect } = require("chai");

describe("projektiAdapter", () => {
  let fixture: ProjektiFixture;

  beforeEach(() => {
    fixture = new ProjektiFixture();
  });

  it("should prevent suunnitteluvaihe publishing without valid aloituskuulutusjulkaisu", async () => {
    const projekti = cloneDeep(fixture.dbProjekti2);

    projekti.aloitusKuulutusJulkaisut = undefined;
    projekti.suunnitteluVaihe = undefined;

    // Validate that there is an error if trying to publish suunnitteluvaihe before there is a published aloituskuulutusjulkaisu
    expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        suunnitteluVaihe: { hankkeenKuvaus: fixture.hankkeenKuvausSuunnitteluVaiheessa, julkinen: true },
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should allow suunnitteluvaihe publishing with a valid aloituskuulutusjulkaisu", async () => {
    const projekti = cloneDeep(fixture.dbProjekti2);

    expect(findPublishedAloitusKuulutusJulkaisu(projekti.aloitusKuulutusJulkaisut)).to.not.be.empty;
    expect(projekti.suunnitteluVaihe).to.be.undefined;

    const result = await projektiAdapter.adaptProjektiToSave(projekti, {
      oid: projekti.oid,
      suunnitteluVaihe: { hankkeenKuvaus: fixture.hankkeenKuvausSuunnitteluVaiheessa, julkinen: true },
    });
    expect(result.projekti.suunnitteluVaihe.julkinen).to.be.true;
  });

  it("should prevent saving vuorovaikutus without saved suunnitteluvaihe", async () => {
    const projekti = cloneDeep(fixture.dbProjekti2);
    projekti.suunnitteluVaihe = undefined;

    // Validate that there is an error if trying to publish suunnitteluvaihe before there is a published aloituskuulutusjulkaisu
    expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        suunnitteluVaihe: {
          hankkeenKuvaus: fixture.hankkeenKuvausSuunnitteluVaiheessa,
          vuorovaikutus: fixture.vuorovaikutus,
        },
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should allow saving vuorovaikutus with saved suunnitteluvaihe", async () => {
    const projekti = cloneDeep(fixture.dbProjekti2);
    projekti.suunnitteluVaihe = { hankkeenKuvaus: fixture.hankkeenKuvausSuunnitteluVaiheessa };

    const result = await projektiAdapter.adaptProjektiToSave(projekti, {
      oid: projekti.oid,
      suunnitteluVaihe: {
        hankkeenKuvaus: fixture.hankkeenKuvausSuunnitteluVaiheessa,
        vuorovaikutus: fixture.vuorovaikutus,
      },
    });
    expect(result.projekti.suunnitteluVaihe).not.to.be.undefined;
  });
});
