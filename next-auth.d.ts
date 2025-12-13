import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      plan: "free" | "pro";
    } & DefaultSession["user"];
  }

  interface User {
    plan: "free" | "pro";
  }
}
