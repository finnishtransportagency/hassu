import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import Autocomplete, { Props } from "../components/form/Autocomplete";

type AutocompleteType<T> = typeof Autocomplete extends (props: any) => infer R ? (props: Props<T>) => R : never;

const Template =
  <T extends unknown>(): ComponentStory<AutocompleteType<T>> =>
  (args) =>
    (
      <div style={{ width: "300px" }}>
        <Autocomplete {...args} />
        <p></p>
      </div>
    );

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "HASSU/Form/Autocomplete",
  component: Autocomplete,
  args: { label: "Autocomplete" },
  argTypes: { onSelect: { action: "selected" } },
  // parameters: { actions: { argTypesRegex: "^on.*" } },
} as ComponentMeta<typeof Autocomplete>;
// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args

export const Default = Template<string>().bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Default.args = {
  getOptionLabel: (name) => name,
  options: [
    "Ingram",
    "Allan",
    "Maureen",
    "Kata",
    "Cindra",
    "Robinson",
    "Sheeree",
    "Mella",
    "Herve",
    "Dmitri",
    "Constancy",
    "Thane",
    "Brena",
    "Gerladina",
    "Zulema",
    "Danyelle",
    "Ricky",
    "Prudy",
    "Marcelline",
    "Jolyn",
    "Alexandre",
    "Dareen",
    "Zacherie",
    "Brianna",
    "Denny",
    "Thea",
    "Louis",
    "Evin",
    "Evangelin",
  ],
  initialOption: "Ingram",
};

export const DataFetching = Template<{ label: string }>().bind({});
DataFetching.args = {
  getOptionLabel: ({ label }) => label,
  options: async (query) => {
    if (query) {
      return await new Promise<{ label: string }[]>((resolve) => {
        setTimeout(() => resolve([{ label: query }, { label: query + " 123" }, { label: query + " 456" }]), 500);
      });
    } else {
      return [];
    }
  },
  optionFetchDelay: 500,
  initialOption: { label: "Haku" },
};
