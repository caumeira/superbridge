import { initializeRemoteSerializer } from "./serializer";
import { once } from "../utils/once";

export const initializeShared = once(() => {
  initializeRemoteSerializer();
});
