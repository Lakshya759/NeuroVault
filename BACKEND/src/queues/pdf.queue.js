import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
});
const redisUrl = process.env.REDIS_URL;

console.log("Redis URL diagnostics:", {
    exists: !!redisUrl,
    startsWithRediss: redisUrl?.startsWith("rediss://"),
    endsWithQuote: redisUrl?.endsWith('"'),
    length: redisUrl?.length,
    hostname: (() => {
        try {
            return new URL(redisUrl).hostname;
        } catch {
            return "INVALID URL";
        }
    })()
});

export const pdfQueue = new Queue("pdf-processing", {
    connection
});