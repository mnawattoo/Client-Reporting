import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in.");
  }
}

/** Server-only helper: returns the signed-in user's session or throws. Every
 * server action / route handler that touches agency data should call this
 * first and scope its Prisma queries by the returned agencyId — that scoping
 * is what keeps this safe to later turn into a real multi-tenant SaaS. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session;
}
