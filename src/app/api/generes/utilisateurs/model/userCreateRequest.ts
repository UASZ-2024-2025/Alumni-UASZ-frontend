import { RoleName } from './roleName';

export interface UserCreateRequest {
    lastName: string;
    firstName: string;
    email: string;
    phone?: string;
    role: RoleName;
}
