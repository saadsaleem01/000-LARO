import type { Config } from "drizzle-kit";

export default {
  schema: "./server/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "laro.sqlite",
  },
} satisfies Config;
