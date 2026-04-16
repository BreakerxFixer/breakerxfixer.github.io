import { spawn } from "node:child_process";

const PODMAN_BIN = process.env.PODMAN_BIN || "podman";
const ARCH_IMAGE = process.env.ARCH_IMAGE || "docker.io/library/archlinux:latest";

function runPodman(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PODMAN_BIN, args);
    let out = "";
    let err = "";
    proc.stdout.on("data", (chunk) => (out += chunk.toString()));
    proc.stderr.on("data", (chunk) => (err += chunk.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve({ out: out.trim(), err: err.trim() });
      else reject(new Error(err.trim() || `podman exited with code ${code}`));
    });
  });
}

export async function ensureContainer(session) {
  try {
    await runPodman(["inspect", session.containerName]);
    return;
  } catch (_) {
    // continue create
  }

  await runPodman([
    "run",
    "-d",
    "--name",
    session.containerName,
    "--security-opt",
    "no-new-privileges",
    "--cap-drop",
    "ALL",
    "--pids-limit",
    "256",
    "--memory",
    "768m",
    "--cpus",
    "1.0",
    ARCH_IMAGE,
    "sleep",
    "infinity"
  ]);
}

export async function execCommand(session, command) {
  const { out, err } = await runPodman(["exec", session.containerName, "bash", "-lc", command]);
  return `${out}${err ? `\n${err}` : ""}`.trim();
}

export async function removeContainer(session) {
  try {
    await runPodman(["rm", "-f", session.containerName]);
  } catch (_) {
    // best-effort cleanup
  }
}
