import { Prisma, type PrismaClient } from "@prisma/client"

import type { PrismaTransactionClient } from "./client"

export type TransactionCapable = Pick<PrismaClient, "$transaction">

export type TransactionCallback<T> = (transaction: PrismaTransactionClient) => Promise<T>

export type SharedTransactionOptions = {
  isolationLevel?: Prisma.TransactionIsolationLevel
  maxWait?: number
  timeout?: number
}

export function getTransactionOptions(
  options: SharedTransactionOptions = {},
): SharedTransactionOptions {
  return {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    maxWait: 5_000,
    timeout: 10_000,
    ...options,
  }
}

export async function runInTransaction<T>(
  database: TransactionCapable,
  callback: TransactionCallback<T>,
  options: SharedTransactionOptions = {},
): Promise<T> {
  return database.$transaction(
    (transaction) => callback(transaction),
    getTransactionOptions(options),
  )
}

export async function runSerializableTransaction<T>(
  database: TransactionCapable,
  callback: TransactionCallback<T>,
  options: Omit<SharedTransactionOptions, "isolationLevel"> = {},
): Promise<T> {
  return runInTransaction(database, callback, {
    ...options,
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  })
}
