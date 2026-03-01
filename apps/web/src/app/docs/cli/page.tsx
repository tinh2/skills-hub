import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CLI Reference — skills-hub.ai",
  description: "Complete reference for the skills-hub CLI. Install, search, publish, and manage skills from your terminal.",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-[var(--accent)] p-4 text-sm leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-sm">{children}</code>;
}

export default function CliReferencePage() {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <h1 className="mb-4 text-3xl font-bold">CLI Reference</h1>

      <p className="mb-6 leading-relaxed text-[var(--muted)]">
        The <InlineCode>skills-hub</InlineCode> CLI lets you install, search, publish, and manage skills
        directly from your terminal. Use it standalone or with <InlineCode>npx</InlineCode> — no global
        install required.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">Installation</h2>
        <p className="mb-3 text-[var(--muted)]">Run commands directly with npx (no install needed):</p>
        <CodeBlock>npx @skills-hub-ai/cli &lt;command&gt;</CodeBlock>
        <p className="mb-3 mt-4 text-[var(--muted)]">Or install globally:</p>
        <CodeBlock>npm install -g @skills-hub-ai/cli  # provides the "skills-hub" command</CodeBlock>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">Quick Start</h2>
        <CodeBlock>{`# Authenticate with GitHub
skills-hub login

# Search for skills
skills-hub search "code review"

# Install a skill
skills-hub install review-code`}</CodeBlock>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">Skill Commands</h2>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">install</h3>
          <p className="mb-3 text-[var(--muted)]">Install a skill from skills-hub.ai into your project.</p>
          <CodeBlock>{`skills-hub install <slug>

Options:
  -v, --version <version>   Install a specific version
  -t, --target <target>     Install target: claude-code (default), cursor
  --team <org-slug>         Install as an organization`}</CodeBlock>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Skills are saved to <InlineCode>.claude/skills/</InlineCode> for Claude Code
            or <InlineCode>.cursor/skills/</InlineCode> for Cursor.
          </p>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">search</h3>
          <p className="mb-3 text-[var(--muted)]">Search the skill catalog.</p>
          <CodeBlock>{`skills-hub search <query>

Options:
  -c, --category <slug>     Filter by category
  -s, --sort <field>        Sort: newest, most_installed, highest_rated
  -l, --limit <n>           Max results (default: 20)
  --org <slug>              Search within an organization`}</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">list</h3>
          <p className="mb-3 text-[var(--muted)]">List locally installed skills.</p>
          <CodeBlock>skills-hub list</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">info</h3>
          <p className="mb-3 text-[var(--muted)]">Show detailed information about a skill.</p>
          <CodeBlock>{`skills-hub info <slug>

Options:
  --json                    Output as JSON`}</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">update</h3>
          <p className="mb-3 text-[var(--muted)]">Update installed skills to their latest versions.</p>
          <CodeBlock>{`skills-hub update          # Update all
skills-hub update <slug>   # Update specific skill`}</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">uninstall</h3>
          <p className="mb-3 text-[var(--muted)]">Remove a locally installed skill.</p>
          <CodeBlock>skills-hub uninstall &lt;slug&gt;</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">categories</h3>
          <p className="mb-3 text-[var(--muted)]">List all available skill categories.</p>
          <CodeBlock>skills-hub categories</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">diff</h3>
          <p className="mb-3 text-[var(--muted)]">Show the difference between two versions of a skill.</p>
          <CodeBlock>skills-hub diff &lt;slug&gt; &lt;from-version&gt; &lt;to-version&gt;</CodeBlock>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">Publishing</h2>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">publish</h3>
          <p className="mb-3 text-[var(--muted)]">Publish a skill from a SKILL.md file. Requires authentication.</p>
          <CodeBlock>{`skills-hub publish [path]

Options:
  --draft                   Publish as draft (not publicly visible)
  --visibility <v>          public, unlisted, or private
  --org <slug>              Publish under an organization
  --tags <tags>             Comma-separated tags
  --github-repo <url>       Link to source repository`}</CodeBlock>
          <p className="mt-3 text-sm text-[var(--muted)]">
            If no path is given, the CLI looks for <InlineCode>SKILL.md</InlineCode> in the current directory.
            See the <Link href="/docs/getting-started" className="text-[var(--primary)] hover:underline">Getting Started guide</Link> for the SKILL.md format.
          </p>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">version</h3>
          <p className="mb-3 text-[var(--muted)]">Create a new version of an already-published skill.</p>
          <CodeBlock>{`skills-hub version <slug> [path]

Options:
  --changelog <text>        Changelog entry for this version`}</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">unpublish</h3>
          <p className="mb-3 text-[var(--muted)]">Archive a published skill (removes it from public listings).</p>
          <CodeBlock>skills-hub unpublish &lt;slug&gt;</CodeBlock>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">Authentication</h2>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">login</h3>
          <p className="mb-3 text-[var(--muted)]">Authenticate with skills-hub.ai. Opens a browser for GitHub OAuth by default.</p>
          <CodeBlock>{`skills-hub login

Options:
  --api-key <key>           Authenticate with an API key instead`}</CodeBlock>
          <p className="mt-3 text-sm text-[var(--muted)]">
            API keys can be created in your <Link href="/settings" className="text-[var(--primary)] hover:underline">account settings</Link>.
          </p>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">logout</h3>
          <p className="mb-3 text-[var(--muted)]">Log out and clear stored credentials.</p>
          <CodeBlock>skills-hub logout</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">whoami</h3>
          <p className="mb-3 text-[var(--muted)]">Show the currently authenticated user.</p>
          <CodeBlock>skills-hub whoami</CodeBlock>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">Organizations</h2>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">org create</h3>
          <p className="mb-3 text-[var(--muted)]">Create a new organization.</p>
          <CodeBlock>{`skills-hub org create <slug>

Options:
  --name <name>             Display name
  --description <text>      Organization description`}</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">org list</h3>
          <p className="mb-3 text-[var(--muted)]">List organizations you belong to.</p>
          <CodeBlock>skills-hub org list</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">org info</h3>
          <p className="mb-3 text-[var(--muted)]">Show organization details.</p>
          <CodeBlock>{`skills-hub org info <slug>

Options:
  --json                    Output as JSON
  --members                 Include member list`}</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">org invite</h3>
          <p className="mb-3 text-[var(--muted)]">Invite a user to an organization.</p>
          <CodeBlock>{`skills-hub org invite <org-slug> <username>

Options:
  --role <role>             admin, publisher, or member (default: member)`}</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">org remove</h3>
          <p className="mb-3 text-[var(--muted)]">Remove a member from an organization.</p>
          <CodeBlock>skills-hub org remove &lt;org-slug&gt; &lt;username&gt;</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">org leave</h3>
          <p className="mb-3 text-[var(--muted)]">Leave an organization.</p>
          <CodeBlock>skills-hub org leave &lt;org-slug&gt;</CodeBlock>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold">org sync</h3>
          <p className="mb-3 text-[var(--muted)]">Sync organization members with a GitHub organization.</p>
          <CodeBlock>{`skills-hub org sync <org-slug>

Options:
  --github-org <slug>       GitHub org to sync from
  --default-role <role>     Role for new members (default: member)`}</CodeBlock>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Configuration</h2>
        <p className="mb-4 leading-relaxed text-[var(--muted)]">
          Credentials and settings are stored in <InlineCode>~/.skills-hub/</InlineCode>. Installed skills
          are saved per-project in your AI assistant&apos;s skill directory.
        </p>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--accent)]">
                <th className="px-4 py-3 text-left font-semibold">Target</th>
                <th className="px-4 py-3 text-left font-semibold">Skill directory</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)]">
                <td className="px-4 py-3">Claude Code</td>
                <td className="px-4 py-3"><InlineCode>.claude/skills/</InlineCode></td>
              </tr>
              <tr>
                <td className="px-4 py-3">Cursor</td>
                <td className="px-4 py-3"><InlineCode>.cursor/skills/</InlineCode></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
