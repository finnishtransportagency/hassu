/**
 * @jest-environment jsdom
 */

 import React from "react";
 import ProjektiTaulu from "@components/projekti/ProjektiTaulu";
 import { VelhoHakuTulos } from "@graphql/apiModel";
 import renderer from "react-test-renderer";
 
 describe("ProjektiTaulu", () => {
   const props = {
     isLoading: false,
     projektit: [
       { __typename: "VelhoHakuTulos", oid: "1234", type: "Tie", name: "Tampereen Tie Projekti" },
     ] as VelhoHakuTulos[],
   };
 
   it("renders ProjektiTaulu unchanged", () => {
     const tree = renderer.create(<ProjektiTaulu {...props} />).toJSON();
     expect(tree).toMatchSnapshot();
   });
 });
 