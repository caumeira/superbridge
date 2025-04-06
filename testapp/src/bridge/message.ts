import { defineBridgeMessage } from "superbridge";

export const $getBody = defineBridgeMessage<void, string>("$getBodyId");
