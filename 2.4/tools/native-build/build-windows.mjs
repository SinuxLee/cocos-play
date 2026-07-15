#!/usr/bin/env zx
// 用法: zx scripts/build-windows.mjs [debug|release]
// 必须在 Windows 上运行（依赖 Visual Studio / MSBuild）
// 注意: zx 在 Windows 上需要能找到 bash（推荐安装 Git for Windows，其自带的 bash.exe 会被 zx 使用）
import { $, argv, cd, fs, path } from 'zx';
import { ccBuild, ensureOutDir, step, timestamp, zipPath } from './common.mjs';
import { OUT_DIR, windows } from './config.mjs';

if (process.platform !== 'win32') {
  throw new Error('build-windows.mjs 必须在 Windows 上运行（需要 MSBuild）');
}

const mode = argv._[0] || argv.mode || 'release';
const debug = mode === 'debug';

await ensureOutDir();
if (argv.clean) await cleanBuildDir();
await ccBuild({ platform: 'win32', debug });

if (!(await fs.pathExists(windows.slnDir))) {
  throw new Error(`未找到 win32 工程目录: ${windows.slnDir}`);
}

const files = await fs.readdir(windows.slnDir);
const sln = files.find((f) => f.endsWith('.sln'));
if (!sln) throw new Error(`未在 ${windows.slnDir} 找到 .sln 文件`);

// Patch the generated .sln to fix two Cocos Creator 2.4 codegen quirks.
const slnPath = path.join(windows.slnDir, sln);
{
  let content = await fs.readFile(slnPath, 'utf8');
  let changed = false;

  // Collect all project GUIDs declared in the file.
  const projectGuids = new Set(
    [...content.matchAll(/^Project\([^)]+\)\s*=\s*"[^"]*"\s*,\s*"[^"]*"\s*,\s*"(\{[^}]+\})"/gim)]
      .map((m) => m[1].toUpperCase())
  );

  // MSB5023: GlobalSection(NestedProjects) may reference a parent GUID that doesn't exist.
  const p1 = content.replace(
    /^(\s*\{[^}]+\}\s*=\s*)(\{[^}]+\})(\s*)$/gm,
    (line, _p, parent) => projectGuids.has(parent.toUpperCase()) ? line : ''
  );
  if (p1 !== content) {
    content = p1;
    changed = true;
    step('已修复 .sln GlobalSection(NestedProjects) 孤立条目 (MSB5023)');
  }

  // MSB5011: ProjectSection(ProjectDependencies) inside a Project block may reference
  // a GUID that doesn't exist. These blocks are optional build-order hints — safe to drop.
  const p2 = content.replace(
    /\r?\n[ \t]*ProjectSection\(ProjectDependencies\)[\s\S]*?[ \t]*EndProjectSection[^\r\n]*/g,
    ''
  );
  if (p2 !== content) {
    content = p2;
    changed = true;
    step('已移除 .sln ProjectSection(ProjectDependencies) 孤立节 (MSB5011)');
  }

  if (changed) await fs.writeFile(slnPath, content, 'utf8');

  // Build a GUID map from the .sln for ProjectGuid injection.
  const slnGuidMap = new Map(
    [...content.matchAll(
      /^Project\("[^"]+"\)\s*=\s*"[^"]+"\s*,\s*"([^"]+\.vcxproj)"\s*,\s*"(\{[^}]+\})"/gim
    )].map(([, rel, guid]) => [
      path.resolve(windows.slnDir, rel.replace(/\//g, path.sep)),
      guid,
    ])
  );

  // Recursively find every .vcxproj under the build tree — some are only referenced
  // via ProjectReference inside other vcxproj files and don't appear directly in the .sln.
  async function findVcxproj(dir) {
    const result = [];
    try {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) result.push(...(await findVcxproj(full)));
        else if (entry.name.endsWith('.vcxproj')) result.push(full);
      }
    } catch { /* skip unreadable dirs */ }
    return result;
  }

  const allVcxproj = await findVcxproj(windows.slnDir);
  let toolsetFixed = 0;

  for (const vcxPath of allVcxproj) {
    let vcx = await fs.readFile(vcxPath, 'utf8');
    let vcxChanged = false;

    // MSB5011: inject missing <ProjectGuid>.
    const guid = slnGuidMap.get(path.resolve(vcxPath));
    if (guid && !vcx.includes('<ProjectGuid>')) {
      vcx = vcx.replace(
        /(<PropertyGroup\s+Label="Globals">)/i,
        `$1\n    <ProjectGuid>${guid}</ProjectGuid>`
      );
      vcxChanged = true;
      step(`已修复 ${path.basename(vcxPath)} 缺失的 <ProjectGuid>`);
    }

    // MSB8020: replace PlatformToolset (handles tags with or without attributes).
    const upgraded = vcx.replace(
      /<PlatformToolset[^>]*>[^<]*<\/PlatformToolset>/g,
      `<PlatformToolset>${windows.toolset}</PlatformToolset>`
    );
    if (upgraded !== vcx) {
      vcx = upgraded;
      vcxChanged = true;
      toolsetFixed++;
    }

    if (vcxChanged) await fs.writeFile(vcxPath, vcx, 'utf8');
  }
  if (toolsetFixed) step(`已升级 ${toolsetFixed} 个 .vcxproj PlatformToolset → ${windows.toolset} (MSB8020)`);
}

step('定位 MSBuild (vswhere)');
const vswhere = 'C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe';
if (!(await fs.pathExists(vswhere))) {
  throw new Error('未找到 vswhere.exe，请确认已安装 Visual Studio Installer');
}

const vswhereArgs = ['-latest', '-requires', 'Microsoft.Component.MSBuild', '-find', 'MSBuild\\**\\Bin\\MSBuild.exe'];
const found = await $`& ${vswhere} ${vswhereArgs}`;
const msbuild = found.stdout.trim().split('\n')[0];
if (!msbuild) throw new Error('vswhere 未能定位到 MSBuild.exe');

step(`MSBuild 编译 (${windows.configuration} / ${windows.platformArch})`);
cd(windows.slnDir);
const msbuildArgs = [sln, `/p:Configuration=${windows.configuration}`, `/p:Platform=${windows.platformArch}`, '/m'];
await $`& ${msbuild} ${msbuildArgs}`;

// Cocos Creator 2.4 win32 output layout: <Configuration>.<platformArch_lower>
const outputDir = path.join(windows.slnDir, `${windows.configuration}.${windows.platformArch.toLowerCase()}`);
if (!(await fs.pathExists(outputDir))) {
  throw new Error(`未找到编译产物目录: ${outputDir}，请核对 WIN_ARCH / WIN_CONFIG 是否与工程一致`);
}

step('清理中间产物');
const intermediateExts = new Set(['.obj', '.ilk', '.idb', '.iobj', '.ipdb', '.pch', '.tlog', '.lastbuildstate', '.cache']);
async function cleanIntermediates(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await cleanIntermediates(full);
      if ((await fs.readdir(full)).length === 0) await fs.rmdir(full);
    } else if (intermediateExts.has(path.extname(entry.name).toLowerCase())) {
      await fs.remove(full);
    }
  }
}
await cleanIntermediates(outputDir);

const ts = timestamp();
const finalZip = path.join(OUT_DIR, `app_win32_${mode}_${ts}.zip`);
await zipPath(outputDir, finalZip);

console.log(`\n✅ 输出: ${finalZip}`);
