import { defineMcpTool } from '@nuxtjs/mcp-toolkit/server'

export default defineMcpTool({
  description: 'List all developers (code reviewers) with their names, Slack IDs, and GitLab IDs.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async () => {
    return await queryDevelopers()
  },
})
