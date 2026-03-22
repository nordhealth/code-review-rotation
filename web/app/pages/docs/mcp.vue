<script setup lang="ts">
useHead({ title: 'MCP Server | Nord Review' })

const docsContainer = useTemplateRef<HTMLElement>('docsContainer')

function openExternalLinksInNewTab() {
  docsContainer.value?.querySelectorAll<HTMLAnchorElement>('a[href^="http"]').forEach((link) => {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  })
}

useMutationObserver(docsContainer, () => openExternalLinksInNewTab(), { childList: true, subtree: true })

onMounted(async () => {
  await nextTick()
  openExternalLinksInNewTab()
})

const content = `
## What is MCP?

[Model Context Protocol](https://modelcontextprotocol.io) (MCP) is an open standard that lets AI assistants connect to external tools and data sources. Nord Review exposes an MCP server so AI agents can query your rotation data directly.

## Available Tools

### get-current-reviewers

Get current code review assignments. Returns the latest rotation for each team, showing who reviews whom.

**Parameters** (all optional):

| Parameter | Type | Description |
|-----------|------|-------------|
| \`teamId\` | string | Filter by team ID |
| \`developerId\` | string | Filter assignments where this developer is a target or reviewer |
| \`squadId\` | string | Filter assignments by squad ID |
| \`mode\` | \`devs\` \\| \`teams\` | Filter by rotation mode |

### list-teams

List all teams with their member count and rotation settings. No parameters.

### list-developers

List all developers with their names, Slack IDs, and GitLab IDs. No parameters.

## Setup

### 1. Generate an API Key

Go to **API Keys** in the sidebar and create a new key. Copy it — you will only see it once.

### 2. Configure Your MCP Client

Add the server to your MCP client configuration. The endpoint is:

\`\`\`
POST /mcp
Authorization: Bearer <your-api-key>
\`\`\`

#### Claude Code

Add to \`~/.claude/settings.json\`:

\`\`\`json
{
  "mcpServers": {
    "nord-review": {
      "type": "url",
      "url": "https://nordreview.nordhealth.com/mcp",
      "headers": {
        "authorization": "Bearer rl_your_api_key_here"
      }
    }
  }
}
\`\`\`

#### Cursor

Add to \`.cursor/mcp.json\` in your project:

\`\`\`json
{
  "mcpServers": {
    "nord-review": {
      "url": "https://nordreview.nordhealth.com/mcp",
      "headers": {
        "authorization": "Bearer rl_your_api_key_here"
      }
    }
  }
}
\`\`\`

#### Windsurf

Add to \`~/.codeium/windsurf/mcp_config.json\`:

\`\`\`json
{
  "mcpServers": {
    "nord-review": {
      "serverUrl": "https://nordreview.nordhealth.com/mcp",
      "headers": {
        "authorization": "Bearer rl_your_api_key_here"
      }
    }
  }
}
\`\`\`

## Example Prompts

Once connected, you can ask your AI assistant things like:

- *"Who are the current code reviewers for our team?"*
- *"Which teams are configured in Nord Review?"*
- *"Who is reviewing my code this week?"*
- *"List all developers and their Slack IDs"*

## Security

- Each user generates their own API key — keys are never shared
- Keys are hashed (SHA-256) before storage; the plaintext is shown only once
- The MCP endpoint is read-only — no mutations are possible
- Revoke a key anytime from the API Keys page
`
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="MCP Server" description="Connect AI assistants to your rotation data." />

    <div ref="docsContainer" class="mcp-docs prose prose-sm dark:prose-invert max-w-none max-w-3xl">
      <MDC :value="content" />
    </div>
  </div>
</template>

<style scoped>
/* Links */
.mcp-docs :deep(a) {
  text-decoration: none;
}

.mcp-docs :deep(a[href^='#'])::before {
  content: '#';
  opacity: 0.4;
  margin-right: 0.3em;
  color: var(--color-muted-foreground);
  transition: opacity 0.15s;
}

.mcp-docs :deep(:hover > a[href^='#'])::before,
.mcp-docs :deep(a[href^='#']:hover)::before {
  opacity: 0.75;
}

.mcp-docs :deep(p a),
.mcp-docs :deep(li a),
.mcp-docs :deep(td a) {
  color: var(--color-primary-text);
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: color-mix(in oklch, var(--color-primary-text) 40%, transparent);
  text-underline-offset: 3px;
  transition: text-decoration-color 0.15s;
}

.mcp-docs :deep(p a:hover),
.mcp-docs :deep(li a:hover),
.mcp-docs :deep(td a:hover) {
  text-decoration-color: var(--color-primary-text);
}

/* Offset for sticky header */
.mcp-docs :deep([id]) {
  scroll-margin-top: 5rem;
}

/* Section headings — add dividers above h2 */
.mcp-docs :deep(h2) {
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
  margin-top: 2rem;
}

.mcp-docs :deep(h2:first-child) {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}

/* Tool name headings */
.mcp-docs :deep(h3) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-foreground);
  background-color: var(--color-muted);
  padding: 0.35em 0.6em;
  border-radius: 0.375rem;
  border: 1px solid var(--color-border);
  display: inline-block;
}

/* Client headings (h4) */
.mcp-docs :deep(h4) {
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-foreground);
  margin-top: 1.75rem;
  margin-bottom: 0.5rem;
}

/* Inline code */
.mcp-docs :deep(code) {
  padding: 0.15em 0.4em;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  background-color: var(--color-muted);
  color: var(--color-foreground);
}

/* Code blocks */
.mcp-docs :deep(pre) {
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background-color: var(--color-muted) !important;
}

.mcp-docs :deep(pre code) {
  padding: 0;
  background-color: transparent;
  border: none;
  font-size: 0.8125rem;
  line-height: 1.7;
}

/* Table */
.mcp-docs :deep(table) {
  font-size: 0.8125rem;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.mcp-docs :deep(thead) {
  background-color: var(--color-muted);
}

.mcp-docs :deep(th),
.mcp-docs :deep(td) {
  padding: 0.625rem 1rem;
}

.mcp-docs :deep(th) {
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-foreground);
  border-bottom: 2px solid var(--color-border);
}

.mcp-docs :deep(td) {
  border-bottom: 1px solid var(--color-border);
}

.mcp-docs :deep(tr:last-child td) {
  border-bottom: none;
}

/* Lists */
.mcp-docs :deep(ul) {
  list-style: none;
  padding-left: 0;
}

.mcp-docs :deep(li) {
  position: relative;
  padding-left: 1.25rem;
}

.mcp-docs :deep(li::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0.625em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--color-muted-foreground);
}
</style>
