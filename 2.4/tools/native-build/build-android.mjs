#!/usr/bin/env zx
// 用法: zx scripts/build-android.mjs [debug|release] [versionCode]
// 或:   npm run build:android -- release 108
import { $, argv, cd, fs, path } from 'zx';
import { ccBuild, ensureOutDir, step, timestamp } from './common.mjs';
import { android, OUT_DIR } from './config.mjs';

const mode = argv._[0] || argv.mode || 'release';
const versionCode = argv._[1] || argv.versionCode || '1';
const debug = mode === 'debug';

await ensureOutDir();
if (argv.clean) await cleanBuildDir();
await ccBuild({ platform: 'android', debug });

const gradlewName = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
const gradlewPath = path.join(android.studioProj, gradlewName);
if (!(await fs.pathExists(gradlewPath))) {
  throw new Error(`未找到 ${gradlewName}，请检查工程路径: ${android.studioProj}`);
}

step(`Gradle 编译 Android (${mode})`);
cd(android.studioProj);
if (process.platform !== 'win32') await $`chmod +x ${gradlewName}`;
const gradlew = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
const task = debug ? 'assembleDebug' : 'assembleRelease';
await $`${gradlew} ${task} -PversionCode=${versionCode}`;

const apkDir = path.join(android.studioProj, 'app', 'build', 'outputs', 'apk', debug ? 'debug' : 'release');
const rawApk = path.join(apkDir, debug ? 'app-debug.apk' : 'app-release-unsigned.apk');
const ts = timestamp();
const finalApk = path.join(OUT_DIR, `app_android_${mode}_v${versionCode}_${ts}.apk`);

if (!debug) {
  step('签名并对齐 APK');
  if (!(await fs.pathExists(android.keystorePath))) {
    throw new Error(`未找到签名文件: ${android.keystorePath}，请检查 ANDROID_KEYSTORE_PATH`);
  }
  await $`jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore ${android.keystorePath} -storepass ${android.keystorePwd} -keypass ${android.keyPwd} ${rawApk} ${android.keyAlias}`;
  await $`zipalign -f -v 4 ${rawApk} ${finalApk}`;
} else {
  await fs.copy(rawApk, finalApk);
}

console.log(`\n✅ 输出: ${finalApk}`);
