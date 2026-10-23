import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const build = spawnSync("npx", ["vite", "build", "--config", "vite.pages.config.ts"], {
  stdio: "inherit",
});
if (build.status) process.exit(build.status ?? 1);

const html = readFileSync("dist-pages/pages/index.html", "utf8")
  .replaceAll("../assets/", "./assets/")
  .replaceAll('href="./favicon.svg"', 'href="./favicon.svg"');
writeFileSync("dist-pages/index.html", html);
writeFileSync("dist-pages/404.html", html);
rmSync("dist-pages/pages", { recursive: true, force: true });
writeFileSync("dist-pages/.nojekyll", "");
