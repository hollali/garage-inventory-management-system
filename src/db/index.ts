import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

export const db = drizzle(pool as unknown as import("pg").Pool, { schema });

export type DB = typeof db;
