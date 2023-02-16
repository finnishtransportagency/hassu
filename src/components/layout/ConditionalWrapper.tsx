import React, { FC, ReactNode, ComponentProps } from "react";

type ConditionalWrapperProps<T extends FC> = {
  condition: boolean;
  wrapper: T;
  children?: ReactNode;
  wrapperProps?: Omit<ComponentProps<T>, "children">;
};

function ConditionalWrapper<T extends FC>({ condition, wrapper, children, wrapperProps }: ConditionalWrapperProps<T>) {
  return <>{condition ? wrapper({ children, ...wrapperProps }) : children}</>;
}

export default ConditionalWrapper;
