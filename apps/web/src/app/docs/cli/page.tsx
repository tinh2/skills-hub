import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CLI Reference — skills-hub.ai",
  description: "Complete reference for the skills-hub CLI. Install, search, publish, and manage skills from your terminal.",
};

export default function CliReferencePage() {
  return (
    <div className="prose mx-auto max-w-3xl dark:prose-invert">
      <h1>CLI Reference</h1>

      <p>
        The <code>skills-hub</code> CLI lets you install, search, publish, and manage skills
        directly from your terminal. Use it standalone or with <code>npx</code> — no global
        install required.
      </p>

      <h2>Installation</h2>
      <p>Run commands directly with npx (no install needed):</p>
      <pre><code>npx skills-hub &lt;command&gt;</code></pre>
      <p>Or install globally:</p>
      <pre><code>npm install -g skills-hub</code></pre>

      <h2>Quick Start</h2>
      <pre><code>{`# Authenticate with GitHub
skills-hub login

# Search for skills
skills-hub search "code review"

# Install a skill
skills-hub install review-code`}</code></pre>

      <h2>Skill Commands</h2>

      <h3>install</h3>
      <p>Install a skill from skills-hub.ai into your project.</p>
      <pre><code>{`skills-hub install <slug>

Options:
  -v, --version <version>   Install a specific version
  -t, --target <target>     Install target: claude-code (default), cursor
  --team <org-slug>         Install as an organization`}</code></pre>
      <p>
        Skills are saved to <code>.claude/skills/</code> for Claude Code
        or <code>.cursor/skills/</code> for Cursor.
      </p>

      <h3>search</h3>
      <p>Search the skill catalog.</p>
      <pre><code>{`skills-hub search <query>

Options:
  -c, --category <slug>     Filter by category
  -s, --sort <field>        Sort: newest, most_installed, highest_rated
  -l, --limit <n>           Max results (default: 20)
  --org <slug>              Search within an organization`}</code></pre>

      <h3>list</h3>
      <p>List locally installed skills.</p>
      <pre><code>skills-hub list</code></pre>

      <h3>info</h3>
      <p>Show detailed information about a skill.</p>
      <pre><code>{`skills-hub info <slug>

Options:
  --json                    Output as JSON`}</code></pre>

      <h3>update</h3>
      <p>Update installed skills to their latest versions.</p>
      <pre><code>{`skills-hub update          # Update all
skills-hub update <slug>   # Update specific skill`}</code></pre>

      <h3>uninstall</h3>
      <p>Remove a locally installed skill.</p>
      <pre><code>skills-hub uninstall &lt;slug&gt;</code></pre>

      <h3>categories</h3>
      <p>List all available skill categories.</p>
      <pre><code>skills-hub categories</code></pre>

      <h3>diff</h3>
      <p>Show the difference between two versions of a skill.</p>
      <pre><code>skills-hub diff &lt;slug&gt; &lt;from-version&gt; &lt;to-version&gt;</code></pre>

      <h2>Publishing</h2>

      <h3>publish</h3>
      <p>Publish a skill from a SKILL.md file. Requires authentication.</p>
      <pre><code>{`skills-hub publish [path]

Options:
  --draft                   Publish as draft (not publicly visible)
  --visibility <v>          public, unlisted, or private
  --org <slug>              Publish under an organization
  --tags <tags>             Comma-separated tags
  --github-repo <url>       Link to source repository`}</code></pre>
      <p>
        If no path is given, the CLI looks for <code>SKILL.md</code> in the current directory.
        See the <Link href="/docs/getting-started">Getting Started guide</Link> for the SKILL.md format.
      </p>

      <h3>version</h3>
      <p>Create a new version of an already-published skill.</p>
      <pre><code>{`skills-hub version <slug> [path]

Options:
  --changelog <text>        Changelog entry for this version`}</code></pre>

      <h3>unpublish</h3>
      <p>Archive a published skill (removes it from public listings).</p>
      <pre><code>skills-hub unpublish &lt;slug&gt;</code></pre>

      <h2>Authentication</h2>

      <h3>login</h3>
      <p>Authenticate with skills-hub.ai. Opens a browser for GitHub OAuth by default.</p>
      <pre><code>{`skills-hub login

Options:
  --api-key <key>           Authenticate with an API key instead`}</code></pre>
      <p>
        API keys can be created in your <Link href="/settings">account settings</Link>.
      </p>

      <h3>logout</h3>
      <p>Log out and clear stored credentials.</p>
      <pre><code>skills-hub logout</code></pre>

      <h3>whoami</h3>
      <p>Show the currently authenticated user.</p>
      <pre><code>skills-hub whoami</code></pre>

      <h2>Organizations</h2>

      <h3>org create</h3>
      <p>Create a new organization.</p>
      <pre><code>{`skills-hub org create <slug>

Options:
  --name <name>             Display name
  --description <text>      Organization description`}</code></pre>

      <h3>org list</h3>
      <p>List organizations you belong to.</p>
      <pre><code>skills-hub org list</code></pre>

      <h3>org info</h3>
      <p>Show organization details.</p>
      <pre><code>{`skills-hub org info <slug>

Options:
  --json                    Output as JSON
  --members                 Include member list`}</code></pre>

      <h3>org invite</h3>
      <p>Invite a user to an organization.</p>
      <pre><code>{`skills-hub org invite <org-slug> <username>

Options:
  --role <role>             admin, publisher, or member (default: member)`}</code></pre>

      <h3>org remove</h3>
      <p>Remove a member from an organization.</p>
      <pre><code>skills-hub org remove &lt;org-slug&gt; &lt;username&gt;</code></pre>

      <h3>org leave</h3>
      <p>Leave an organization.</p>
      <pre><code>skills-hub org leave &lt;org-slug&gt;</code></pre>

      <h3>org sync</h3>
      <p>Sync organization members with a GitHub organization.</p>
      <pre><code>{`skills-hub org sync <org-slug>

Options:
  --github-org <slug>       GitHub org to sync from
  --default-role <role>     Role for new members (default: member)`}</code></pre>

      <h2>Configuration</h2>
      <p>
        Credentials and settings are stored in <code>~/.skills-hub/</code>. Installed skills
        are saved per-project in your AI assistant&apos;s skill directory.
      </p>
      <table>
        <thead>
          <tr>
            <th>Target</th>
            <th>Skill directory</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Claude Code</td>
            <td><code>.claude/skills/</code></td>
          </tr>
          <tr>
            <td>Cursor</td>
            <td><code>.cursor/skills/</code></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
