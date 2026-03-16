import { Prisma } from "@prisma/client"
import { describe, expect, it, vi } from "vitest"

import { getTransactionOptions, runInTransaction, runSerializableTransaction } from "./transactions"

describe("transaction helpers", () => {
  it("provides safe default transaction options", () => {
    expect(getTransactionOptions()).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 5_000,
      timeout: 10_000,
    })
  })

  it("passes merged options to the transaction boundary", async () => {
    const transactionClient = {
      marker: "transaction-client",
    }

    const database = {
      $transaction: vi.fn(async (callback, options) => {
        return {
          result: await callback(transactionClient),
          options,
        }
      }),
    }

    const outcome = await runInTransaction(database as never, async (transaction) => transaction, {
      timeout: 20_000,
    })

    expect(database.$transaction).toHaveBeenCalledTimes(1)
    expect(outcome).toEqual({
      result: transactionClient,
      options: {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 5_000,
        timeout: 20_000,
      },
    })
  })

  it("uses serializable isolation when requested", async () => {
    const database = {
      $transaction: vi.fn(async (_callback, options) => options),
    }

    const options = await runSerializableTransaction(database as never, async () => undefined, {
      maxWait: 3_000,
    })

    expect(options).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 3_000,
      timeout: 10_000,
    })
  })
})
