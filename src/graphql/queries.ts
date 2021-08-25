/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const listSuunnitelmat = /* GraphQL */ `
  query ListSuunnitelmat {
    listSuunnitelmat {
      id
      name
      location
      type
      contact
      status
      description
      longDescription
    }
  }
`;
export const getSuunnitelmaById = /* GraphQL */ `
  query GetSuunnitelmaById($suunnitelmaId: String!) {
    getSuunnitelmaById(suunnitelmaId: $suunnitelmaId) {
      id
      name
      location
      type
      contact
      status
      description
      longDescription
    }
  }
`;
