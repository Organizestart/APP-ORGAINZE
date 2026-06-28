import { spawn } from "node:child_process";

const port = Number(process.env.COMMAND_SMOKE_PORT || 8797);
const timeoutMs = 12000;
const service = spawn(process.execPath, ["server/protected-admin-review-service.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    COMMAND_PORT: String(port),
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
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

function stop(exitCode) {
  service.kill("SIGTERM");
  setTimeout(() => process.exit(exitCode), 120);
}

async function waitForHealth() {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/command/health`);
      const body = await response.json();
      if (!response.ok || !body.ready) throw new Error(`Unexpected health response: ${response.status}`);
      console.log(JSON.stringify({
        ready: body.ready,
        configured: body.configured,
        model: body.model,
        message: body.message,
      }, null, 2));
      const testResponse = await fetch(`http://127.0.0.1:${port}/api/command/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const testBody = await testResponse.json();
      if (!testResponse.ok) throw new Error(`Unexpected test response: ${testResponse.status}`);
      const dashboardCheck = (testBody.tests || []).find((test) => test.name === "Dashboard action wiring");
      if (!dashboardCheck) throw new Error("Dashboard action wiring check was not returned.");
      if (dashboardCheck.status !== "passed") throw new Error(`Dashboard action wiring check ${dashboardCheck.status}: ${dashboardCheck.detail}`);
      const homeRouteCheck = (testBody.tests || []).find((test) => test.name === "Rendered home route smoke");
      if (!homeRouteCheck) throw new Error("Rendered home route smoke check was not returned.");
      if (homeRouteCheck.status !== "passed") throw new Error(`Rendered home route smoke check ${homeRouteCheck.status}: ${homeRouteCheck.detail}`);
      console.log(JSON.stringify({
        commandTests: testBody.tests.length,
        dashboardActionWiring: dashboardCheck.status,
        renderedHomeRouteSmoke: homeRouteCheck.status,
      }, null, 2));
      return stop(0);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  console.error("Command service smoke check failed.");
  console.error(lastError?.message || "No response from service.");
  if (output.trim()) console.error(output.trim());
  return stop(1);
}

service.on("exit", (code) => {
  if (code !== null && code !== 0) {
    console.error("Command service exited before health check.");
    if (output.trim()) console.error(output.trim());
    process.exit(code);
  }
});

waitForHealth();
