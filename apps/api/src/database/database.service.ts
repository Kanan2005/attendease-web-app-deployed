import { disconnectPrismaClient, getPrismaClient } from "@attendease/db"
import { Injectable, type OnModuleDestroy } from "@nestjs/common"

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly prisma = getPrismaClient({
    preferTestUrl: process.env.NODE_ENV === "test",
  })

  async onModuleDestroy() {
    await disconnectPrismaClient(this.prisma)
  }
}
