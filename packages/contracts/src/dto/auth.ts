export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthUserDto {
  id: string;
  email: string;
  name: string | null;
}

export interface SessionPayload {
  sub: string;
  email: string;
  name?: string | null;
  iat?: number;
  exp?: number;
}
