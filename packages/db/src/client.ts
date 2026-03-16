import { PrismaPg } from "@prisma/adapter-pg"
import { type Prisma, PrismaClient } from "@prisma/client"

import { defaultDatabaseUrl } from "./paths"

type DatabaseEnvSource = Record<string, string | undefined>

type GlobalPrismaState = typeof globalThis & {
  __attendeasePrisma: PrismaClient | undefined
}

export type PrismaTransactionClient = Prisma.TransactionClient
export type PrismaClientLike = PrismaClient | PrismaTransactionClient

export type CreatePrismaClientOptions = Omit<Prisma.PrismaClientOptions, "adapter"> & {
  databaseUrl?: string
  env?: DatabaseEnvSource
  preferTestUrl?: boolean
  singleton?: boolean
}

export function resolveDatabaseUrl(
  source: DatabaseEnvSource = process.env,
  options: { preferTestUrl?: boolean } = {},
): string {
  const { preferTestUrl = false } = options
  const primaryUrl = preferTestUrl
    ? (source.TEST_DATABASE_URL ?? source.DATABASE_URL)
    : source.DATABASE_URL
  const fallbackUrl = preferTestUrl ? source.DATABASE_URL : source.TEST_DATABASE_URL
  const resolvedUrl = primaryUrl?.trim() || fallbackUrl?.trim() || defaultDatabaseUrl

  return resolvedUrl
}

export function createPrismaClient(options: CreatePrismaClientOptions = {}): PrismaClient {
  const {
    databaseUrl,
    env,
    preferTestUrl = false,
    singleton: _singleton,
    ...clientOptions
  } = options
  const resolvedDatabaseUrl = databaseUrl ?? resolveDatabaseUrl(env, { preferTestUrl })
  const adapter = new PrismaPg({ connectionString: resolvedDatabaseUrl })

  return new PrismaClient({
    errorFormat: "minimal",
    ...clientOptions,
    adapter,
  })
}

export function getPrismaClient(options: CreatePrismaClientOptions = {}): PrismaClient {
  const globalPrismaState = globalThis as GlobalPrismaState
  const shouldUseSingleton =
    options.singleton !== false &&
    options.databaseUrl === undefined &&
    options.env === undefined &&
    options.preferTestUrl !== true &&
    process.env.NODE_ENV !== "test"

  if (!shouldUseSingleton) {
    return createPrismaClient(options)
  }

  if (!globalPrismaState.__attendeasePrisma) {
    globalPrismaState.__attendeasePrisma = createPrismaClient(options)
  }

  return globalPrismaState.__attendeasePrisma
}

export async function disconnectPrismaClient(client: PrismaClient): Promise<void> {
  const globalPrismaState = globalThis as GlobalPrismaState

  if (globalPrismaState.__attendeasePrisma === client) {
    globalPrismaState.__attendeasePrisma = undefined
  }

  await client.$disconnect()
}
