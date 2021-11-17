import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import Button from "../components/button/Button";

const Template: ComponentStory<typeof Button> = (args) => <Button {...args} />;

const iconOptions = {
  none: undefined,
  "paper-plane": "paper-plane",
  "arrow-left": "arrow-left",
  "arrow-right": "arrow-right",
  "external-link-alt": "external-link-alt",
};

const iconControl = {
  options: iconOptions,
  control: { type: "select" }, // Automatically inferred when 'options' is defined
  required: false,
  defaultValue: undefined,
};

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "HASSU/Buttons/Button",
  component: Button,
  argTypes: {
    onClick: { action: "clicked", control: false },
    startIcon: iconControl,
    endIcon: iconControl,
    link: {
      control: { type: "select" },
      options: ["none", "internal", "external"],
      mapping: { none: undefined, internal: { href: "#" }, external: { href: "#", external: true } },
    },
  },
} as ComponentMeta<typeof Button>;
// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args

export const Primary = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Primary.args = { children: "Primary", primary: true };

export const Secondary = Template.bind({});
Secondary.args = { children: "Secondary" };

export const WithStartIcon = Template.bind({});
WithStartIcon.args = { children: "Send", startIcon: "paper-plane" };
