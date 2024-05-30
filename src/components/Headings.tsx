import { Typography, TypographyProps } from "@mui/material";
import { ElementType } from "react";

type HeadingType = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "lead";

type HeadingProps = Omit<TypographyProps, "variant"> & { variant?: HeadingType };

const Heading = ({ children, ...props }: HeadingProps & { component: ElementType<any> }) => <Typography {...props}>{children}</Typography>;

const H1 = ({ variant = "h1", ...props }: HeadingProps) => <Heading component="h1" variant={variant} {...props} />;
const H2 = ({ variant = "h2", ...props }: HeadingProps) => <Heading component="h2" variant={variant} {...props} />;
const H3 = ({ variant = "h3", ...props }: HeadingProps) => <Heading component="h3" variant={variant} {...props} />;
const H4 = ({ variant = "h4", ...props }: HeadingProps) => <Heading component="h4" variant={variant} {...props} />;
const H5 = ({ variant = "h5", ...props }: HeadingProps) => <Heading component="h5" variant={variant} {...props} />;
const H6 = ({ variant = "h6", ...props }: HeadingProps) => <Heading component="h6" variant={variant} {...props} />;

export { H1, H2, H3, H4, H5, H6 };
