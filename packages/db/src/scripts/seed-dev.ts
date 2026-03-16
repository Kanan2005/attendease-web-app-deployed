import { disconnectPrismaClient, getPrismaClient } from "../client"
import { seedDevelopmentData } from "../seed"

async function main(): Promise<void> {
  const prisma = getPrismaClient({
    singleton: false,
    preferTestUrl: process.argv.includes("--prefer-test-url"),
  })

  try {
    const result = await seedDevelopmentData(prisma)
    console.log(JSON.stringify(result, null, 2))
  } finally {
    await disconnectPrismaClient(prisma)
  }
}

main().catch((error: unknown) => {
  console.error("Failed to seed development data.")
  console.error(error)
  process.exitCode = 1
})
