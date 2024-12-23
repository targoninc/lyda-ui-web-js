import {Follow} from "./Follow.ts";
import {UserBadge} from "./UserBadge.ts";
import {Usersetting} from "./Usersetting.ts";
import {Badge} from "./Badge.ts";
import {Subscription} from "../finance/Subscription.ts";

export interface User extends Record<string, any> {
    subscription?: Subscription;
    settings?: Usersetting[];
    badges?: Badge[];
    userBadges?: UserBadge[];
    follows?: Follow[];
    following?: Follow[];
    id: number;
    username: string;
    mfa_enabled: boolean;
    email: string;
    password_hash: string;
    displayname: string;
    description: string;
    activation: string|null;
    password_token: string|null;
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
    has_avatar: boolean;
    has_banner: boolean;
}