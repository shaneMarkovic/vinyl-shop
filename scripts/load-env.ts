// Side-effect module: load env BEFORE anything that reads process.env.
// Imported first in scripts so it runs before ../db evaluates DATABASE_URL.
import { config } from "dotenv";

config({ path: ".env.local" });
config();
