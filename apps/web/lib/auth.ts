import { auth, currentUser } from "@clerk/nextjs/server";

export type AppUser = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
};

export async function requireAppUser(): Promise<AppUser> {
  const session = await auth();
  if (!session.userId) {
    throw new Error("You must be signed in");
  }

  const user = await currentUser();
  if (!user) {
    throw new Error("You must be signed in");
  }

  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "";

  if (!email) {
    throw new Error("Your account needs an email address");
  }

  return {
    id: user.id,
    email,
    fullName:
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.username ||
      email,
    avatarUrl: user.imageUrl ?? "",
  };
}
