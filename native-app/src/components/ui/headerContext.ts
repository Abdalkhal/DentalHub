import { createContext } from "react";

/**
 * Whether the current screen is shown under a navigation header. The header
 * already pads itself below the phone's status bar; a screen under it must not
 * add that space again (it did, leaving a blank band under every header).
 * Set per screen by the navigators' `screenLayout` (app/_layout, app-tabs).
 */
export const HasHeaderContext = createContext(false);
