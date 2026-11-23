import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const res = join(root, "android/app/src/main/res");
if (!existsSync(res)) {
  console.log("Android project is not generated yet. Run npm run add:android first.");
  process.exit(0);
}

const icon = join(root, "../public/icon-512.png");
const splash = "/tmp/anmps-icons/splash.png";
const densities = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

const { createRequire } = await import("node:module");
let sharp = null;
try {
  sharp = createRequire(import.meta.url)("sharp");
} catch {
  sharp = null;
}

for (const [folder, size] of Object.entries(densities)) {
  const dir = join(res, folder);
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, "ic_launcher.png");
  const round = join(dir, "ic_launcher_round.png");
  if (sharp) {
    await sharp(icon).resize(size, size).png().toFile(dest);
    await sharp(icon).resize(size, size).png().toFile(round);
  } else {
    copyFileSync(icon, dest);
    copyFileSync(icon, round);
  }
}

if (existsSync(splash)) {
  const drawable = join(res, "drawable");
  mkdirSync(drawable, { recursive: true });
  copyFileSync(splash, join(drawable, "splash.png"));
}
console.log("Applied ANMPS icon and splash.");
