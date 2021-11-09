/**
 * @jest-environment jsdom
 */

import React from "react";
import ProjektiTaulu from "@components/projekti/ProjektiTaulu";
import { ProjektiTyyppi, VelhoHakuTulos } from "@services/api";
import renderer from "react-test-renderer";
import { componentWithTranslation } from "../test-utils";

describe("ProjektiTaulu", () => {
  const props = {
    isLoading: false,
    projektit: [
      {
        __typename: "VelhoHakuTulos",
        oid: "1234",
        tyyppi: "TIE" as ProjektiTyyppi.TIE,
        nimi: "Tampereen Tie Projekti",
      },
    ] as VelhoHakuTulos[],
  };

  it("renders ProjektiTaulu unchanged", async () => {
    const tree = renderer.create(await componentWithTranslation(<ProjektiTaulu {...props} />)).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
