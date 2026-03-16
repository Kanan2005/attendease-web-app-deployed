import "dotenv/config"

import { defineConfig } from "prisma/config"

const defaultDatabaseUrl = "postgresql://attendease:attendease@localhost:5432/attendease"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? defaultDatabaseUrl,
  },
})
