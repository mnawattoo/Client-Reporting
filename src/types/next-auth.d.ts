import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    agencyId?: string;
    agencyName?: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      agencyId: string;
      agencyName: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    agencyId?: string;
    agencyName?: string;
  }
}
