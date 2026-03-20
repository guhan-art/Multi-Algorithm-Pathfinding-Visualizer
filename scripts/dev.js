const { spawn } = require("child_process");

const isWindows = process.platform === "win32";

function pipeWithPrefix(stream, prefix, target) {
  let buffered = "";

  stream.on("data", (chunk) => {
    buffered += chunk.toString();
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() || "";

    for (const line of lines) {
      if (line.length > 0) {
        target.write(`[${prefix}] ${line}\n`);
      } else {
        target.write(`\n`);
      }
    }
  });

  stream.on("end", () => {
    if (buffered.length > 0) {
      target.write(`[${prefix}] ${buffered}\n`);
    }
  });
}

function createProcess(name, prefixPath) {
  const child = spawn(`npm --prefix "${prefixPath}" run dev`, {
    shell: true,
    stdio: ["inherit", "pipe", "pipe"],
    windowsHide: true,
    env: process.env,
  });

  pipeWithPrefix(child.stdout, name, process.stdout);
  pipeWithPrefix(child.stderr, name, process.stderr);

  return child;
}

const children = [
  { name: "backend", proc: createProcess("backend", "backend") },
  { name: "frontend", proc: createProcess("frontend", "frontend") },
];

let shuttingDown = false;

function terminateChild(child) {
  if (!child || child.killed) {
    return;
  }

  if (isWindows) {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });

    killer.on("error", () => {
      try {
        child.kill("SIGTERM");
      } catch {
        // Ignore if process already exited.
      }
    });
    return;
  }

  try {
    child.kill("SIGTERM");
  } catch {
    // Ignore if process already exited.
  }
}

function shutdown(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const entry of children) {
    terminateChild(entry.proc);
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 200);
}

for (const entry of children) {
  entry.proc.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (signal || (typeof code === "number" && code !== 0)) {
      const status = signal ? `signal ${signal}` : `code ${code}`;
      console.error(`[${entry.name}] exited with ${status}. Shutting down the other process...`);
      shutdown(typeof code === "number" ? code : 1);
      return;
    }

    shutdown(0);
  });

  entry.proc.on("error", (err) => {
    if (shuttingDown) {
      return;
    }

    console.error(`[${entry.name}] failed to start: ${err.message}`);
    shutdown(1);
  });
}

process.on("SIGINT", () => {
  shutdown(0);
});

process.on("SIGTERM", () => {
  shutdown(0);
});
