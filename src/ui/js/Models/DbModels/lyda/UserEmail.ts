export interface UserEmail {
    user_id: number;
    email: string;
    primary: boolean;
    verified: boolean;
    verified_at: Date|null;
}