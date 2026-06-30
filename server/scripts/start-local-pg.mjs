import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";

const pg = new EmbeddedPostgres({
  databaseDir: path.resolve("local-pgdata"),
  user: "motion",
  password: "motion",
  port: 5433,
  persistent: true,
});

await pg.initialise();
await pg.start();
await pg.createDatabase("motion_story").catch(() => {});
console.log("Local Postgres running on port 5433, db=motion_story");
console.log("DATABASE_URL=postgres://motion:motion@localhost:5433/motion_story");

process.on("SIGINT", async () => {
  await pg.stop();
  process.exit(0);
});
