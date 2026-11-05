import type { InteractionUser } from "./InteractionUser.ts";

export interface InteractionUsersResponse {
    users: InteractionUser[];
    total: number;
}
