const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_WINDOWS_PYTHON = 'C:\\Users\\prave\\AppData\\Local\\Programs\\Python\\Python310\\python.exe';
let cachedPythonCommand = null;

function isUsablePython(command, args) {
  const probe = spawnSync(command, [...args, '--version'], {
    encoding: 'utf8',
    stdio: 'pipe'
  });

  return !probe.error && probe.status === 0;
}

function resolvePythonCommand() {
  if (cachedPythonCommand) {
    return cachedPythonCommand;
  }

  const candidates = [];
  const repoRootVenv = path.resolve(__dirname, '../../../.venv/Scripts/python.exe');
  const backendVenv = path.resolve(__dirname, '../../.venv/Scripts/python.exe');
  if (fs.existsSync(repoRootVenv)) {
    candidates.push({ command: repoRootVenv, args: [] });
  }
  if (fs.existsSync(backendVenv) && backendVenv !== repoRootVenv) {
    candidates.push({ command: backendVenv, args: [] });
  }
  if (process.env.RESEARCHLENS_PYTHON) {
    candidates.push({ command: process.env.RESEARCHLENS_PYTHON, args: [] });
  }
  if (process.env.PYTHON_EXECUTABLE) {
    candidates.push({ command: process.env.PYTHON_EXECUTABLE, args: [] });
  }
  candidates.push({ command: 'python', args: [] });
  candidates.push({ command: 'py', args: ['-3'] });
  candidates.push({ command: DEFAULT_WINDOWS_PYTHON, args: [] });

  for (const candidate of candidates) {
    if (isUsablePython(candidate.command, candidate.args)) {
      cachedPythonCommand = candidate;
      return candidate;
    }
  }

  throw new Error('Unable to locate a usable Python interpreter for topic modeling');
}

function runPythonJson(scriptPath, payload) {
  const python = resolvePythonCommand();
  const result = spawnSync(python.command, [...python.args, scriptPath], {
    input: JSON.stringify(payload ?? {}),
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 25 * 1024 * 1024
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    throw new Error(stderr || stdout || `Python topic modeling failed with exit code ${result.status}`);
  }

  const raw = (result.stdout || '').trim();
  if (!raw) {
    throw new Error('Python topic modeling returned an empty response');
  }

  try {
    return JSON.parse(raw);
  } catch (parseErr) {
    throw new Error(`Failed to parse Python topic modeling output: ${parseErr.message}`);
  }
}

module.exports = {
  runPythonJson,
  resolvePythonCommand
};