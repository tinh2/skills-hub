"use client";

interface GenerateSectionProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  generating: boolean;
  error: string;
  onGenerate: () => void;
}

export function GenerateSection({
  prompt,
  onPromptChange,
  generating,
  error,
  onGenerate,
}: GenerateSectionProps) {
  return (
    <section aria-label="AI generation" className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <h2 className="mb-3 text-sm font-semibold">Generate with AI</h2>

      <div className="mb-3">
        <label htmlFor="ai-prompt" className="mb-1 block text-sm text-[var(--muted)]">
          Describe what your skill should do
        </label>
        <textarea
          id="ai-prompt"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
          rows={3}
          placeholder="A skill that reviews pull requests for security vulnerabilities and generates a summary report..."
        />
      </div>

      <div aria-live="polite" aria-atomic="true">
        {error && (
          <p role="alert" className="mb-3 text-sm text-[var(--error)]">{error}</p>
        )}
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={generating || !prompt.trim()}
        className="min-h-[44px] rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {generating ? (
          <span className="flex items-center gap-2">
            <span className="loading-spinner" aria-hidden="true" />
            Generating...
          </span>
        ) : (
          "Generate All Fields"
        )}
      </button>
    </section>
  );
}
