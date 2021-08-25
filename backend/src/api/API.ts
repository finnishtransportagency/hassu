/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CreateSuunnitelmaInput = {
  name: string,
  location?: string | null,
  type?: string | null,
  contact?: string | null,
};

export type Suunnitelma = {
  __typename: "Suunnitelma",
  id: string,
  name: string,
  location?: string | null,
  type?: string | null,
  contact?: string | null,
  status?: Status | null,
  description?: string | null,
  longDescription?: string | null,
};

export enum Status {
  EI_JULKAISTU = "EI_JULKAISTU",
  ALOITUSKUULUTUS = "ALOITUSKUULUTUS",
  SUUNNITTELU = "SUUNNITTELU",
  NAHTAVILLAOLO = "NAHTAVILLAOLO",
  HYVAKSYMISPAATOS = "HYVAKSYMISPAATOS",
  LAINVOIMA = "LAINVOIMA",
  ARKISTOITU = "ARKISTOITU",
}


export type UpdateSuunnitelmaInput = {
  id: string,
  name: string,
  location?: string | null,
  type?: string | null,
  contact?: string | null,
  description?: string | null,
  longDescription?: string | null,
};

export type CreateSuunnitelmaMutationVariables = {
  suunnitelma: CreateSuunnitelmaInput,
};

export type CreateSuunnitelmaMutation = {
  createSuunnitelma?:  {
    __typename: "Suunnitelma",
    id: string,
    name: string,
    location?: string | null,
    type?: string | null,
    contact?: string | null,
    status?: Status | null,
    description?: string | null,
    longDescription?: string | null,
  } | null,
};

export type UpdateSuunnitelmaMutationVariables = {
  suunnitelma: UpdateSuunnitelmaInput,
};

export type UpdateSuunnitelmaMutation = {
  updateSuunnitelma?:  {
    __typename: "Suunnitelma",
    id: string,
    name: string,
    location?: string | null,
    type?: string | null,
    contact?: string | null,
    status?: Status | null,
    description?: string | null,
    longDescription?: string | null,
  } | null,
};

export type ListSuunnitelmatQuery = {
  listSuunnitelmat?:  Array< {
    __typename: "Suunnitelma",
    id: string,
    name: string,
    location?: string | null,
    type?: string | null,
    contact?: string | null,
    status?: Status | null,
    description?: string | null,
    longDescription?: string | null,
  } | null > | null,
};

export type GetSuunnitelmaByIdQueryVariables = {
  suunnitelmaId: string,
};

export type GetSuunnitelmaByIdQuery = {
  getSuunnitelmaById?:  {
    __typename: "Suunnitelma",
    id: string,
    name: string,
    location?: string | null,
    type?: string | null,
    contact?: string | null,
    status?: Status | null,
    description?: string | null,
    longDescription?: string | null,
  } | null,
};
