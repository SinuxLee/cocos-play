import { $, chalk, fs } from 'zx';
import { BUILD_DIR, CREATOR_PATH, OUT_DIR, PROJECT_PATH } from './config.mjs';

if (process.platform === 'win32') {
  usePowerShell();
  // Fix garbled output on Chinese Windows: set PowerShell console to UTF-8 for every command,
  // and force English output from .NET tooling (MSBuild, vswhere) to avoid GBK mojibake.
  $.prefix = `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; ${$.prefix ?? ''}`;
  process.env.DOTNET_CLI_UI_LANGUAGE = 'en-US';
  process.env.VSLANG = '1033';
}

export function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function step(msg) {
  console.log(chalk.cyan(`\n▶ ${msg}`));
}

export async function ensureOutDir() {
  await fs.ensureDir(OUT_DIR);
  return OUT_DIR;
}

export async function cleanBuildDir() {
  step(`清理构建目录 ${BUILD_DIR}`);
  await fs.remove(BUILD_DIR);
}

// 调用 CocosCreator 2.4 CLI，生成对应平台的 jsb 原生工程
// 2.4 的 --build 参数是分号分隔的 key=value 字符串，不是 JSON
export async function ccBuild({ platform, debug = false }) {
  step(`CocosCreator CLI 构建 platform=${platform} debug=${debug}`);
  const buildPathArg = BUILD_DIR.replace(/\\/g, '/');
  const params = `platform=${platform};debug=${debug};buildPath=${buildPathArg}`;
  if (process.platform === 'win32') {
    // PowerShell requires & to invoke a command from a string path
    await $`& ${CREATOR_PATH} --path ${PROJECT_PATH} --force --build ${params}`;
  } else {
    await $`${CREATOR_PATH} --path ${PROJECT_PATH} --force --build ${params}`;
  }
}

// 跨平台压缩目录：windows 用 Compress-Archive，mac 用 ditto，linux 兜底用 zip
export async function zipPath(srcDir, destZip) {
  step(`打包 ${srcDir} -> ${destZip}`);
  if (process.platform === 'win32') {
    // usePowerShell() is active — call Compress-Archive directly; zx handles quoting.
    await $`Compress-Archive -Path ${srcDir + '\\*'} -DestinationPath ${destZip} -Force`;
  } else if (process.platform === 'darwin') {
    await $`ditto -c -k --sequesterRsrc --keepParent ${srcDir} ${destZip}`;
  } else {
    await $`zip -r ${destZip} ${srcDir}`;
  }
}
