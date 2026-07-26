"use client";

import { ClerkProvider as ClerkNextProvider } from "@clerk/nextjs";

type AppClerkProviderProps = {
  children: React.ReactNode;
};

export function AppClerkProvider({ children }: AppClerkProviderProps) {
  return (
    <ClerkNextProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/sign-in"
    >
      {children}
    </ClerkNextProvider>
  );
}
