import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspace = resolve(root, '..');
const backendCwd = resolve(root, 'backend');
const jdkHome = resolve(workspace, '.tools', 'jdk-21.0.2');
const mavenHome = resolve(workspace, '.tools', 'apache-maven-3.9.11');
const isWindows = process.platform === 'win32';
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function backendHealthy() {
  try {
    const response = await fetch('http://127.0.0.1:8080/api/health', {
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function stopTree(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

export async function startLocalBackend() {
  if (await backendHealthy()) {
    console.log('[有数] 后端接口已运行，直接复用。');
    return () => {};
  }

  const env = { ...process.env };
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') || 'PATH';
  if (existsSync(jdkHome) && existsSync(mavenHome)) {
    env.JAVA_HOME = jdkHome;
    env[pathKey] = [resolve(jdkHome, 'bin'), resolve(mavenHome, 'bin'), env[pathKey]]
      .filter(Boolean)
      .join(delimiter);
  }

  const maven = existsSync(mavenHome)
    ? resolve(mavenHome, 'bin', isWindows ? 'mvn.cmd' : 'mvn')
    : (isWindows ? 'mvn.cmd' : 'mvn');
  let stopping = false;
  let spawnError;

  console.log('[有数] 正在启动后端接口，就绪后再开放页面...');
  const backend = isWindows
    ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/c', maven, 'spring-boot:run'], {
        cwd: backendCwd,
        env,
        stdio: 'inherit',
      })
    : spawn(maven, ['spring-boot:run'], { cwd: backendCwd, env, stdio: 'inherit' });

  backend.on('error', (error) => {
    spawnError = error;
  });

  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await backendHealthy()) {
      ready = true;
      break;
    }
    if (spawnError || backend.exitCode !== null || backend.signalCode !== null) break;
    await sleep(1000);
  }

  if (!ready) {
    stopTree(backend);
    throw new Error(`后端启动失败：${spawnError?.message || '请查看 Maven/Spring Boot 启动日志'}`);
  }

  console.log('[有数] 后端接口已就绪。');
  backend.on('exit', (code) => {
    if (!stopping) {
      console.error(`[有数] 后端意外退出（代码 ${code ?? '未知'}），页面服务一并停止。`);
      process.exit(1);
    }
  });

  return () => {
    stopping = true;
    stopTree(backend);
  };
}
