import { Command } from "commander";
import { createServer } from "node:http";
import open from "open";
import { saveConfig, getConfig } from "../lib/config.js";

export const loginCommand = new Command("login")
  .description("Authenticate with skills-hub.ai via GitHub")
  .option("--api-key <key>", "Authenticate with an API key instead of GitHub")
  .action(async (options) => {
    if (options.apiKey) {
      saveConfig({ apiKey: options.apiKey });
      console.log("API key saved. You are now authenticated.");
      return;
    }

    console.log("Opening GitHub login in your browser...");

    // Start local server to receive OAuth callback
    const port = 9876;
    const server = createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost:${port}`);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code) {
        res.writeHead(400);
        res.end("Missing code parameter");
        return;
      }

      try {
        const config = getConfig();
        const tokenRes = await fetch(`${config.apiUrl}/api/v1/auth/github/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state: state || "" }),
        });

        if (!tokenRes.ok) throw new Error("Auth failed");

        const data = await tokenRes.json() as { accessToken: string; user: { username: string } };
        saveConfig({ accessToken: data.accessToken });

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h1>Authenticated!</h1><p>You can close this tab.</p>");

        console.log(`\nLogged in as ${data.user.username}`);
        server.close();
        process.exit(0);
      } catch (err) {
        res.writeHead(500);
        res.end("Authentication failed");
        console.error("Login failed:", err instanceof Error ? err.message : err);
        server.close();
        process.exit(1);
      }
    });

    server.listen(port, () => {
      const config = getConfig();
      open(`${config.apiUrl}/api/v1/auth/github?redirect_uri=http://localhost:${port}`);
    });
  });
