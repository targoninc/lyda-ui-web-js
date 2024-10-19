import {Follow} from "./Follow.ts";
import {UserBadge} from "./UserBadge.ts";
import {Usersetting} from "./Usersetting.ts";

export interface User extends Express.User {
    settings?: Usersetting[];
    badges?: UserBadge[];
    follows?: Follow[];
    following?: Follow[];
    id: number;
    username: string;
    mfa_enabled: boolean;
    email: string;
    password_hash: string;
    displayname: string;
    description: string;
    activation: string;
    verified: boolean;
    verification_status: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
    lastlogin: Date;
    secondlastlogin: Date;
    password_updated_at: Date;
    tos_agreed_at: Date;
    ip: string;
}