import { BadRequestException } from "@nestjs/common"
import { ZodError, type ZodTypeAny } from "zod"

export function parseWithSchema<TSchema extends ZodTypeAny>(
  schema: TSchema,
  value: unknown,
): ReturnType<TSchema["parse"]> {
  try {
    return schema.parse(value)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        message: "Invalid request payload.",
        issues: error.issues,
      })
    }

    throw error
  }
}
