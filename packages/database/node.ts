// Server-only-free entry point for plain Node runtimes (e.g. Fastify api).
// Exposes the SAME Prisma `database` client and generated types as `index.ts`,
// without the `import "server-only"` guard that crashes outside Next RSC.
export * from "./client";
