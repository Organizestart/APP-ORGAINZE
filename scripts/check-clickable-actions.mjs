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
  const source = await readFile("src/MainWorkForceApp.jsx", "utf8");
  const buttonCheck = findPassiveControls(source, "button", /onClick=|type="submit"|disabled\b/);
  const selectCheck = findPassiveControls(source, "select", /onChange=|disabled\b/);
  const passiveControls = [
    ...buttonCheck.passive.map((item) => ({ type: "button", ...item })),
    ...selectCheck.passive.map((item) => ({ type: "select", ...item })),
  ];

  if (passiveControls.length) {
    console.error("Clickable action check failed.");
    console.error("These controls look usable, but do not have a wired action, submit handler, or disabled state:");
    passiveControls.slice(0, 20).forEach((item) => {
      console.error(`${item.type} at src/MainWorkForceApp.jsx:${item.line} ${item.tag}`);
    });
    process.exit(1);
  }

  console.log(JSON.stringify({
    clickableActions: "passed",
    checked: {
      buttons: buttonCheck.count,
      dropdowns: selectCheck.count,
    },
    rule: "visible buttons and dropdowns need behavior, submit handling, or a deliberate disabled state",
  }, null, 2));
}

run().catch((error) => {
  console.error("Clickable action check failed.");
  console.error(error.message || error);
  process.exit(1);
});
