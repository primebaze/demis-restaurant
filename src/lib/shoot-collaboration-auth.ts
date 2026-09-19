import {
  isShareUnlocked as unlocked,
  signShareSession as sign,
  shareCookieName as name,
  shareCookiePath as path,
} from "./shoot-share-auth";
export {
  SHARE_SESSION_SECONDS,
  shareJson,
  validShareToken,
} from "./shoot-share-auth";
export const isShareUnlocked = (token: string, version: number) =>
  unlocked(token, version, "editor");
export const signShareSession = (token: string, version: number) =>
  sign(token, version, "editor");
export const shareCookieName = (token: string) => name(token, "editor");
export const shareCookiePath = (token: string) => path(token, "editor");
