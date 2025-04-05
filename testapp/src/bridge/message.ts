import { defineBridgeMessage } from "superbridge";

export const $getBodyId = defineBridgeMessage<void, string>("$getBodyId");
