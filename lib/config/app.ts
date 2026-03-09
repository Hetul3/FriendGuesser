import { getPublicEnv } from "@/lib/env/public";

const env = getPublicEnv();

export const appConfig = {
  name: "FriendGuesser",
  shortName: "FG",
  description:
    "Friends-only hide-and-seek guessing game with room codes, clue photos, and private location reveal.",
  appUrl: env.NEXT_PUBLIC_APP_URL,
} as const;
