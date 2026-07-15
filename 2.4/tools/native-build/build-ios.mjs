#!/usr/bin/env zx
// 用法: zx scripts/build-ios.mjs --target=ios [debug|release]
//       zx scripts/build-ios.mjs --target=mac  [debug|release]
// 必须在 macOS 上运行（依赖 Xcode 命令行工具 / xcodebuild）
import { $, argv, cd, fs, path } from 'zx';
import { ccBuild, ensureOutDir, step, timestamp } from './common.mjs';
import { ios, mac, OUT_DIR } from './config.mjs';

if (process.platform !== 'darwin') {
  throw new Error('build-ios.mjs 必须在 macOS 上运行（需要 Xcode）');
}

const target = argv.target || 'ios'; // ios | mac
const mode = argv._[0] || argv.mode || 'release';
const debug = mode === 'debug';
const cfg = target === 'mac' ? mac : ios;

await ensureOutDir();
if (argv.clean) await cleanBuildDir();
await ccBuild({ platform: target, debug });

if (!(await fs.pathExists(cfg.xcodeProj))) {
  throw new Error(`未找到 Xcode 工程目录: ${cfg.xcodeProj}`);
}

cd(cfg.xcodeProj);
const ts = timestamp();
const archivePath = path.join(OUT_DIR, `${target}_${mode}_${ts}.xcarchive`);
const exportPath = path.join(OUT_DIR, `${target}_${mode}_${ts}`);

step(`xcodebuild archive (${target} / ${mode})`);
const projFlags = cfg.workspace
  ? ['-workspace', cfg.workspace]
  : ['-project', `${cfg.scheme}.xcodeproj`];
await $`xcodebuild ${projFlags} -scheme ${cfg.scheme} -configuration ${debug ? 'Debug' : 'Release'} -archivePath ${archivePath} archive`;

step('xcodebuild exportArchive');
if (!(await fs.pathExists(cfg.exportOptionsPlist))) {
  throw new Error(`未找到 exportOptions plist: ${cfg.exportOptionsPlist}（需要在 Xcode 里导出一份模板）`);
}
await $`xcodebuild -exportArchive -archivePath ${archivePath} -exportOptionsPlist ${cfg.exportOptionsPlist} -exportPath ${exportPath}`;

console.log(`\n✅ 输出目录: ${exportPath}`);
console.log('若需公证 (仅 mac 分发 App Store 外场景需要):');
console.log('  xcrun notarytool submit <ipa/app 或 zip 包> --keychain-profile "YOUR_PROFILE" --wait');
