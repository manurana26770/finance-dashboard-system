import { Role, StatusValue } from '@prisma/client';

export type AuthenticatedUser = {
  id: number;
  sub: number;
  email: string;
  role: Role;
  status: StatusValue;
  sessionVersion: number;
};