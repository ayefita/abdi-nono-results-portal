import { writeFileSync } from "node:fs";

// One place to point the app at the deployed site.
// Set SITE_URL when the Netlify address exists, for example:
// SITE_URL=https://abdi-nono-results.netlify.app npm run sync
const siteUrl = process.env.SITE_URL || "https://placeholder.abdinono.invalid";

const config = {
  appId: "school.abdinono.results",
  appName: "ANMPS",
  webDir: "www",
  server: {
    url: siteUrl,
    androidScheme: "https",
    errorPath: "offline.html",
    allowNavigation: ["*"],
  },
  android: {
    backgroundColor: "#083c2b",
    allowMixedContent: false,
  },
};

writeFileSync(new URL("./capacitor.config.json", import.meta.url), JSON.stringify(config, null, 2) + "\n");
console.log("SITE_URL", siteUrl);
