import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import Notification, { NotificationType } from "../components/notification/Notification";

const iconOptions = {
  none: undefined,
  "exclamation-triangle": "exclamation-triangle",
  "info-circle": "info-circle",
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

const Template: ComponentStory<typeof Notification> = (args) => (
  <div style={{ width: "600px" }}>
    <Notification {...args} />
  </div>
);

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "HASSU/Notification",
  component: Notification,
  argTypes: {
    icon: iconControl,
  },
} as ComponentMeta<typeof Notification>;
// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args

export const Default = Template.bind({});
Default.args = {
  children: "Ohjeet",
  type: NotificationType.DEFAULT,
};

export const Info = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Info.args = {
  children: "Ohjeet",
  type: NotificationType.INFO,
};

export const InfoGreen = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
InfoGreen.args = {
  children: "Ohjeet",
  type: NotificationType.INFO_GREEN,
};

export const Warn = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Warn.args = {
  children:
    "Aloituskuulutusta ei ole vielä julkaistu palvelun julkisella puolella. Kuulutuspäivä on 08.11.2021. Voit edelleen tehdä muutoksia projektin tietoihin. Tallennetut muutokset huomioidaan kuulutuksessa.",
  type: NotificationType.WARN,
};

export const Error = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Error.args = { children: "Ohjeet", type: NotificationType.ERROR };
