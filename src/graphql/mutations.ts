/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createSuunnitelma = /* GraphQL */ `
  mutation CreateSuunnitelma($suunnitelma: CreateSuunnitelmaInput!) {
    createSuunnitelma(suunnitelma: $suunnitelma) {
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
export const updateSuunnitelma = /* GraphQL */ `
  mutation UpdateSuunnitelma($suunnitelma: UpdateSuunnitelmaInput!) {
    updateSuunnitelma(suunnitelma: $suunnitelma) {
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
