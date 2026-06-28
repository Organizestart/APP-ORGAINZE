import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const distAssetsDir = path.join(process.cwd(), "dist", "assets");
const budgets = {
  javascriptBytes: 900 * 1024,
  cssBytes: 180 * 1024,
};

function formatKb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

async function run() {
  const files = await readdir(distAssetsDir);
  const assets = [];
  for (const file of files) {
    const fullPath = path.join(distAssetsDir, file);
    const info = await stat(fullPath);
    assets.push({ file, bytes: info.size });
  }

  const largestJs = assets
    .filter((asset) => asset.file.endsWith(".js"))
    .sort((a, b) => b.bytes - a.bytes)[0];
  const largestCss = assets
    .filter((asset) => asset.file.endsWith(".css"))
    .sort((a, b) => b.bytes - a.bytes)[0];

  if (!largestJs || !largestCss) {
    throw new Error("Build assets were not found. Run npm run build first.");
  }

  const failures = [];
  if (largestJs.bytes > budgets.javascriptBytes) {
    failures.push(`Largest app script is ${formatKb(largestJs.bytes)}; budget is ${formatKb(budgets.javascriptBytes)}.`);
  }
  if (largestCss.bytes > budgets.cssBytes) {
    failures.push(`Largest app design file is ${formatKb(largestCss.bytes)}; budget is ${formatKb(budgets.cssBytes)}.`);
  }
  if (failures.length) {
    throw new Error(failures.join(" "));
  }

  console.log(JSON.stringify({
    performanceBudget: "passed",
    largestJavaScript: { file: largestJs.file, size: formatKb(largestJs.bytes) },
    largestCss: { file: largestCss.file, size: formatKb(largestCss.bytes) },
    budgets: {
      javascript: formatKb(budgets.javascriptBytes),
      css: formatKb(budgets.cssBytes),
    },
  }, null, 2));
}

run().catch((error) => {
  console.error("Performance budget check failed.");
  console.error(error.message || error);
  process.exit(1);
});
