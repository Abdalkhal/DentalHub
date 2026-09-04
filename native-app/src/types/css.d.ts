// CSS module/import type declarations for the Expo template's web files and
// NativeWind's global.css. (NativeWind ships its own types; this covers the
// template's *.module.css usage and side-effect CSS imports.)
declare module "*.css";
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

// Static image imports (Metro bundles these as asset IDs).
declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.webp";
declare module "*.gif";
declare module "*.svg";

