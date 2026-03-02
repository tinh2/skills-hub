"use client";

import { useState, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Token types for colored terminal output                            */
/* ------------------------------------------------------------------ */

type TokenColor = "command" | "prompt" | "success" | "warning" | "muted" | "purple" | "star" | "plain";

type Token = { text: string; color: TokenColor };
type Line = Token[];

const COLORS: Record<TokenColor, string> = {
  command: "#e2e8f0",
  prompt: "#8b5cf6",
  success: "#22c55e",
  warning: "#f59e0b",
  muted: "#64748b",
  purple: "#8b5cf6",
  star: "#f59e0b",
  plain: "#cbd5e1",
};

/* ------------------------------------------------------------------ */
/*  Scene definitions                                                  */
/* ------------------------------------------------------------------ */

type Scene = {
  label: string;
  lines: Line[];
  duration: number; // ms to display this scene
};

const SCENES: Scene[] = [
  {
    label: "Search",
    duration: 4500,
    lines: [
      [{ text: "$ ", color: "prompt" }, { text: 'skills-hub search "code review"', color: "command" }],
      [],
      [
        { text: "  review-code", color: "purple" },
        { text: "       AI-powered code review", color: "plain" },
        { text: "      ★ 4.8", color: "star" },
        { text: "  ↓ 2.3k", color: "muted" },
      ],
      [
        { text: "  security-scan", color: "purple" },
        { text: "     Find vulnerabilities fast", color: "plain" },
        { text: "      ★ 4.6", color: "star" },
        { text: "  ↓ 1.8k", color: "muted" },
      ],
      [
        { text: "  test-generator", color: "purple" },
        { text: "    Auto-generate unit tests", color: "plain" },
        { text: "       ★ 4.5", color: "star" },
        { text: "  ↓ 1.2k", color: "muted" },
      ],
    ],
  },
  {
    label: "Install",
    duration: 4500,
    lines: [
      [{ text: "$ ", color: "prompt" }, { text: "skills-hub install review-code", color: "command" }],
      [],
      [{ text: "✓ ", color: "success" }, { text: "Installed ", color: "plain" }, { text: "review-code@1.2.0", color: "purple" }],
      [{ text: "✓ ", color: "success" }, { text: "+ lint-check@2.0.1", color: "plain" }, { text: " (dependency)", color: "muted" }],
      [{ text: "✓ ", color: "success" }, { text: "+ test-coverage@1.1.0", color: "plain" }, { text: " (dependency)", color: "muted" }],
      [],
      [{ text: "→ ", color: "purple" }, { text: "Saved to ~/.claude/skills/review-code/", color: "muted" }],
    ],
  },
  {
    label: "Use",
    duration: 4000,
    lines: [
      [{ text: "> ", color: "prompt" }, { text: "/review-code", color: "command" }],
      [],
      [{ text: "Analyzing ", color: "plain" }, { text: "src/auth.ts", color: "purple" }, { text: " ...", color: "muted" }],
      [],
      [{ text: "Found ", color: "plain" }, { text: "2 issues", color: "warning" }, { text: ", 3 suggestions", color: "success" }],
      [{ text: "  ⚠ ", color: "warning" }, { text: "Missing input validation on line 42", color: "plain" }],
      [{ text: "  ⚠ ", color: "warning" }, { text: "Token expiry not checked", color: "plain" }],
    ],
  },
  {
    label: "MCP",
    duration: 4000,
    lines: [
      [{ text: "$ ", color: "prompt" }, { text: "claude mcp add skills-hub -- npx @skills-hub-ai/mcp", color: "command" }],
      [],
      [{ text: "✓ ", color: "success" }, { text: "Added skills-hub MCP server", color: "plain" }],
      [{ text: "✓ ", color: "success" }, { text: "3 skills available as prompts", color: "plain" }],
      [],
      [
        { text: "Works in: ", color: "muted" },
        { text: "Claude Code", color: "purple" },
        { text: " · ", color: "muted" },
        { text: "Cursor", color: "purple" },
        { text: " · ", color: "muted" },
        { text: "Windsurf", color: "purple" },
        { text: " · ", color: "muted" },
        { text: "Copilot", color: "purple" },
      ],
    ],
  },
  {
    label: "Publish",
    duration: 4000,
    lines: [
      [{ text: "$ ", color: "prompt" }, { text: "skills-hub publish", color: "command" }],
      [],
      [{ text: "✓ ", color: "success" }, { text: "Published ", color: "plain" }, { text: "my-skill@1.0.0", color: "purple" }],
      [{ text: "✓ ", color: "success" }, { text: "Quality score: ", color: "plain" }, { text: "92/100", color: "success" }],
      [],
      [{ text: "→ ", color: "purple" }, { text: "https://skills-hub.ai/skills/my-skill", color: "purple" }],
    ],
  },
];

const LINE_STAGGER = 150; // ms between each line appearing

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function TerminalLine({ tokens, delay, visible }: { tokens: Token[]; delay: number; visible: boolean }) {
  if (tokens.length === 0) {
    return <div className="h-5" style={{ opacity: visible ? 1 : 0 }} />;
  }

  return (
    <div
      className="terminal-line whitespace-pre"
      style={{
        animationDelay: `${delay}ms`,
        opacity: visible ? undefined : 0,
      }}
    >
      {tokens.map((token, i) => (
        <span key={i} style={{ color: COLORS[token.color] }}>
          {token.text}
        </span>
      ))}
    </div>
  );
}

function SceneIndicator({ scenes, activeIndex }: { scenes: Scene[]; activeIndex: number }) {
  return (
    <div className="flex items-center justify-center gap-3 pt-4">
      {scenes.map((scene, i) => (
        <button
          key={scene.label}
          aria-label={`Show ${scene.label} demo`}
          aria-current={i === activeIndex ? "step" : undefined}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all"
          style={{
            color: i === activeIndex ? "#8b5cf6" : "#64748b",
            background: i === activeIndex ? "rgba(139, 92, 246, 0.1)" : "transparent",
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full transition-all"
            style={{
              background: i === activeIndex ? "#8b5cf6" : "#4a5568",
            }}
          />
          {scene.label}
        </button>
      ))}
    </div>
  );
}

export function TerminalDemo() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const advanceScene = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setSceneIndex((prev) => (prev + 1) % SCENES.length);
      setTransitioning(false);
    }, 400); // fade-out duration
  }, []);

  useEffect(() => {
    const scene = SCENES[sceneIndex];
    if (!scene) return;
    const timer = setTimeout(advanceScene, scene.duration);
    return () => clearTimeout(timer);
  }, [sceneIndex, advanceScene]);

  const scene = SCENES[sceneIndex];
  if (!scene) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <div
        className="overflow-hidden rounded-xl border border-[#2a2a2e]"
        style={{
          background: "#0f0f13",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(139, 92, 246, 0.05)",
        }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-[#2a2a2e] px-4 py-3">
          <span className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
          <span className="ml-2 text-xs" style={{ color: "#64748b" }}>
            Terminal
          </span>
        </div>

        {/* Terminal content */}
        <div
          className="px-5 py-4 transition-opacity duration-300"
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
            fontSize: "13px",
            lineHeight: "1.7",
            minHeight: "220px",
            opacity: transitioning ? 0 : 1,
          }}
        >
          {scene.lines.map((tokens, i) => (
            <TerminalLine
              key={`${sceneIndex}-${i}`}
              tokens={tokens}
              delay={i * LINE_STAGGER}
              visible={!transitioning}
            />
          ))}
        </div>
      </div>

      {/* Scene indicators */}
      <SceneIndicator scenes={SCENES} activeIndex={sceneIndex} />

      {/* Animation styles */}
      <style jsx global>{`
        .terminal-line {
          opacity: 0;
          transform: translateY(4px);
          animation: terminalReveal 0.3s ease-out forwards;
        }

        @keyframes terminalReveal {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .terminal-line {
            opacity: 1;
            transform: none;
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
