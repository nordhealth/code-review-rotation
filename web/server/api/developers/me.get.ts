defineRouteMeta({
  openAPI: {
    summary: 'Get current user linked developer profile',
    tags: ['Developers'],
    responses: {
      200: {
        description: 'Developer slug for the current user',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                developerSlug: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
      401: { description: 'Unauthorized' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.developerSlug) {
    return { developerSlug: user.developerSlug }
  }

  const dbUser = await queryUserByEmail(user.email)
  if (dbUser?.developerId) {
    const developer = await queryDeveloperById(dbUser.developerId)
    return { developerSlug: developer?.slug ?? null }
  }

  return { developerSlug: null }
})
