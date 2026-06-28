import { readFile } from "node:fs/promises";

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function compactTag(tag) {
  return tag.replace(/\s+/g, " ").trim().slice(0, 240);
}

function findPassiveControls(source, controlName, allowedPattern) {
  const matches = [...source.matchAll(new RegExp(`<${controlName}\\b[\\s\\S]*?>`, "g"))];
  const passive = matches
    .filter((match) => !allowedPattern.test(match[0]))
    .map((match) => ({
      line: lineNumber(source, match.index),
      tag: compactTag(match[0]),
    }));
  return { count: matches.length, passive };
}

async function run() {
  const files = [
    "src/WorkForceAppScreens.jsx",
    "src/DashboardActionPath.jsx",
  ];
  const checks = await Promise.all(files.map(async (file) => {
    const source = await readFile(file, "utf8");
    return {
      file,
      buttons: findPassiveControls(source, "button", /onClick=|type="submit"|disabled\b/),
      selects: findPassiveControls(source, "select", /onChange=|disabled\b/),
    };
  }));
  const passiveControls = checks.flatMap((check) => [
    ...check.buttons.passive.map((item) => ({ file: check.file, type: "button", ...item })),
    ...check.selects.passive.map((item) => ({ file: check.file, type: "select", ...item })),
  ]);

  if (passiveControls.length) {
    console.error("Clickable action check failed.");
    console.error("These controls look usable, but do not have a wired action, submit handler, or disabled state:");
    passiveControls.slice(0, 20).forEach((item) => {
      console.error(`${item.type} at ${item.file}:${item.line} ${item.tag}`);
    });
    process.exit(1);
  }

  console.log(JSON.stringify({
    clickableActions: "passed",
    checked: {
      buttons: checks.reduce((sum, check) => sum + check.buttons.count, 0),
      dropdowns: checks.reduce((sum, check) => sum + check.selects.count, 0),
    },
    rule: "visible buttons and dropdowns need behavior, submit handling, or a deliberate disabled state",
  }, null, 2));
}

run().catch((error) => {
  console.error("Clickable action check failed.");
  console.error(error.message || error);
  process.exit(1);
});
