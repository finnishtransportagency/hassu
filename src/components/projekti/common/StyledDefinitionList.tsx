import ContentSpacer from "@components/layout/ContentSpacer";
import { Fragment, FunctionComponent } from "react";

export type Definition = { term: string; definition: JSX.Element | string };
export type DefinitionList = Definition[];

export const StyledDefinitionList: FunctionComponent<{ definitions: DefinitionList }> = ({ definitions }) => {
  return (
    <ContentSpacer as="dl" sx={{ dt: { fontWeight: 700 }, dd: { marginBottom: 7 } }} gap={4}>
      {definitions.map(({ term, definition }) => (
        <Fragment key={term}>
          <dt>{term}</dt>
          <dd>{definition}</dd>
        </Fragment>
      ))}
    </ContentSpacer>
  );
};
