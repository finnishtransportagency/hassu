import "@mui/material/Typography";
import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface TypographyVariants {
    lead: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    lead?: React.CSSProperties;
    plain?: React.CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    lead: true;
    plain: true;
  }
}
