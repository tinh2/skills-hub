import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),

  DATABASE_URL: z.string().url(),

  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z.string().url(),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().default(7),

  FRONTEND_URL: z.string().url().default("http://localhost:3001"),
  API_URL: z.string().url().default("http://localhost:3000"),

  GITHUB_TOKEN_ENCRYPTION_KEY: z.string().min(32).optional()
    .refine(
      (val) => process.env.NODE_ENV !== "production" || !!val,
      { message: "GITHUB_TOKEN_ENCRYPTION_KEY is required in production" },
    ),

  REDIS_URL: z.string().url().optional(),
  S3_BUCKET_NAME: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error("Invalid environment variables:");
      for (const issue of result.error.issues) {
        console.error(`  ${issue.path.join(".")}: ${issue.message}`);
      }
      process.exit(1);
    }
    _env = result.data;
  }
  return _env;
}
