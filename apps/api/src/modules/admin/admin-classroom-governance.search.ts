import type { Prisma } from "@attendease/db"

export function buildClassroomSearchWhere(query: string): Prisma.CourseOfferingWhereInput[] {
  const trimmed = query.trim()

  return [
    {
      code: {
        contains: trimmed,
        mode: "insensitive",
      },
    },
    {
      displayTitle: {
        contains: trimmed,
        mode: "insensitive",
      },
    },
    {
      semester: {
        is: {
          OR: [
            {
              code: {
                contains: trimmed,
                mode: "insensitive",
              },
            },
            {
              title: {
                contains: trimmed,
                mode: "insensitive",
              },
            },
          ],
        },
      },
    },
    {
      academicClass: {
        is: {
          OR: [
            {
              code: {
                contains: trimmed,
                mode: "insensitive",
              },
            },
            {
              title: {
                contains: trimmed,
                mode: "insensitive",
              },
            },
          ],
        },
      },
    },
    {
      section: {
        is: {
          OR: [
            {
              code: {
                contains: trimmed,
                mode: "insensitive",
              },
            },
            {
              title: {
                contains: trimmed,
                mode: "insensitive",
              },
            },
          ],
        },
      },
    },
    {
      subject: {
        is: {
          OR: [
            {
              code: {
                contains: trimmed,
                mode: "insensitive",
              },
            },
            {
              title: {
                contains: trimmed,
                mode: "insensitive",
              },
            },
          ],
        },
      },
    },
    {
      primaryTeacher: {
        is: {
          displayName: {
            contains: trimmed,
            mode: "insensitive",
          },
        },
      },
    },
  ]
}
