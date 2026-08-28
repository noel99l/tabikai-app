import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
const url = readFileSync(".env.local","utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1];
const sql = neon(url);
const [ev] = await sql`SELECT reminder_sent_at FROM events WHERE id='ba926509-4ebd-4e96-9f34-fe5ada47983d'`;
if (ev?.reminder_sent_at) {
  const notif = await sql`SELECT title, body FROM notifications WHERE type='event_reminder' AND link='/events/ba926509-4ebd-4e96-9f34-fe5ada47983d'`;
  console.log("SENT at", ev.reminder_sent_at, JSON.stringify(notif));
  process.exit(0);
}
process.exit(1);
