/**
 * Granular rate limit configs for sensitive route groups.
 * Pass as the second argument to a Fastify route handler.
 * e.g. app.post("/endpoint", authRateLimit, async (req) => { ... })
 */
export const authRateLimit = { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } };
export const writeRateLimit = { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } };
export const searchRateLimit = { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } };
export const sandboxRateLimit = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };
export const agentRateLimit = { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } };
