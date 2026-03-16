import { AsyncLocalStorage } from "node:async_hooks"

import { Injectable } from "@nestjs/common"

export type ApiRequestContextValue = {
  requestId: string
  userId?: string | null
  role?: string | null
  method?: string
  path?: string
}

@Injectable()
export class ApiRequestContextService {
  private readonly storage = new AsyncLocalStorage<ApiRequestContextValue>()

  run<T>(context: ApiRequestContextValue, callback: () => T): T {
    return this.storage.run(context, callback)
  }

  get(): ApiRequestContextValue | undefined {
    return this.storage.getStore()
  }

  update(partial: Partial<ApiRequestContextValue>) {
    const current = this.storage.getStore()

    if (!current) {
      return
    }

    Object.assign(current, partial)
  }
}
