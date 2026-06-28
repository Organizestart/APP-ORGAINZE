import { spawn } from "node:child_process";

const basePort = Number(process.env.COMMAND_BOUNDARY_PORT || 8807);
const timeoutMs = 14000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForHealth(port) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/command/health`);
      const body = await response.json();
      if (!response.ok || !body.ready) throw new Error(`Unexpected health response: ${response.status}`);
      return body;
    } catch (error) {
      lastError = error;
      await wait(300);
    }
  }
  throw new Error(lastError?.message || "Command service did not become healthy.");
}

async function startService(name, port, env) {
  const service = spawn(process.execPath, ["server/AdminReviewServer.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
      COMMAND_PORT: String(port),
      OPENAI_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  service.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  service.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  service.on("exit", (code) => {
    if (code !== null && code !== 0) {
      output += `\n${name} exited with ${code}`;
    }
  });
  const health = await waitForHealth(port).catch((error) => {
    service.kill("SIGTERM");
    throw new Error(`${name} failed health check: ${error.message}\n${output.trim()}`);
  });
  return {
    health,
    async stop() {
      service.kill("SIGTERM");
      await wait(120);
    },
  };
}

async function postCommand(port, path, headers = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: "{}",
  });
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  return { response, body };
}

async function run() {
  const disabled = await startService("production disabled service", basePort, {
    NODE_ENV: "production",
    COMMAND_SERVICE_ENABLED: "false",
    COMMAND_ADMIN_TOKEN: "",
  });
  try {
    assert(disabled.health.enabled === false, "Production service should report disabled when COMMAND_SERVICE_ENABLED is false.");
    const { response, body } = await postCommand(basePort, "/api/command/test");
    assert(response.status === 403, `Disabled production command should return 403, got ${response.status}.`);
    assert(body.error === "command_disabled", `Disabled production command returned wrong error: ${body.error}`);
  } finally {
    await disabled.stop();
  }

  const token = "local-command-boundary-token";
  const enabled = await startService("production token service", basePort + 1, {
    NODE_ENV: "production",
    COMMAND_SERVICE_ENABLED: "true",
    COMMAND_ADMIN_TOKEN: token,
  });
  try {
    assert(enabled.health.enabled === true, "Production service should report enabled when explicitly enabled.");
    const missingToken = await postCommand(basePort + 1, "/api/command/test");
    assert(missingToken.response.status === 401, `Missing token should return 401, got ${missingToken.response.status}.`);
    assert(missingToken.body.error === "admin_token_required", `Missing token returned wrong error: ${missingToken.body.error}`);

    const badOrigin = await postCommand(basePort + 1, "/api/command/test", {
      "x-command-admin-token": token,
      origin: "https://not-allowed.example",
    });
    assert(badOrigin.response.status === 403, `Bad origin should return 403, got ${badOrigin.response.status}.`);
    assert(badOrigin.body.error === "origin_blocked", `Bad origin returned wrong error: ${badOrigin.body.error}`);

    const allowed = await postCommand(basePort + 1, "/api/command/test", {
      "x-command-admin-token": token,
      origin: "http://127.0.0.1:5174",
    });
    assert(allowed.response.ok, `Valid production token should allow command test, got ${allowed.response.status}.`);
    const renderedHome = (allowed.body.tests || []).find((test) => test.name === "Rendered home route smoke");
    assert(renderedHome?.status === "passed", "Production token command test did not return passing rendered home smoke.");
  } finally {
    await enabled.stop();
  }

  console.log(JSON.stringify({
    commandProductionBoundary: "passed",
    scenarios: [
      "production disabled blocks command endpoints",
      "production enabled requires admin token",
      "production enabled blocks disallowed origins",
      "production enabled allows valid platform-admin token path",
    ],
  }, null, 2));
}

run().catch((error) => {
  console.error("Command production boundary check failed.");
  console.error(error.message || error);
  process.exit(1);
});
