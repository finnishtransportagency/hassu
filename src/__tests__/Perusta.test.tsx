/**
 * @jest-environment jsdom
 */

 import React from "react";
 import Perusta from "@pages/yllapito/perusta";
 import { VelhoHakuTulos } from "@services/api";
 import renderer from "react-test-renderer";

 jest.mock("next/router", () => ({
   useRouter() {
     return {
       query: {
         projektinimi: "tampere",
       },
     };
   },
 }));

 jest.mock("@services/api", () => ({
   getVelhoSuunnitelmasByName: () => {
     const hakuTulos: VelhoHakuTulos[] = [
       { __typename: "VelhoHakuTulos", oid: "1234", nimi: "Tampereen tie Hanke", tyyppi: "Tie" },
     ];
     const promise = new Promise((resolve) => {
       resolve(hakuTulos);
     });
     return promise as Promise<VelhoHakuTulos[]>;
   },
 }));

 describe("ProjektiTaulu", () => {
   it("renders 'Perusta' page unchanged", () => {
     const tree = renderer.create(<Perusta />).toJSON();
     expect(tree).toMatchSnapshot();
   });
 });
