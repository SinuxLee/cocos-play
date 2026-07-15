import dotenv from 'dotenv';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..'); // 项目根目录（脚本所在仓库的上一级）
const PKG_ROOT = path.resolve(__dirname, '.'); // cocos-native-build 包根目录（package.json / .env 所在处）

dotenv.config({ path: process.env.CC_ENV_FILE || path.join(PKG_ROOT, '.env') });

export const PROJECT_PATH = process.env.CC_PROJECT_PATH || ROOT;
export const BUILD_DIR = path.join(PROJECT_PATH, 'build');
export const OUT_DIR = path.join(PROJECT_PATH, 'release_pkg');

// CocosCreator 2.4 可执行文件路径，按当前运行脚本的系统给默认值
export const CREATOR_PATH =
  process.env.CC_CREATOR_PATH ||
  (os.platform() === 'darwin'
    ? '/Applications/CocosCreator/2.4.15/CocosCreator.app/Contents/MacOS/CocosCreator'
    : 'D:\\CocosCreator\\2.4.13\\CocosCreator.exe');

export const android = {
  studioProj: path.join(BUILD_DIR, 'jsb-android', 'frameworks', 'runtime-src', 'proj.android-studio'),
  keystorePath: process.env.ANDROID_KEYSTORE_PATH || path.join(PROJECT_PATH, 'release.keystore'),
  keystorePwd: process.env.ANDROID_KEYSTORE_PWD || '',
  keyAlias: process.env.ANDROID_KEY_ALIAS || '',
  keyPwd: process.env.ANDROID_KEY_PWD || '',
};

export const ios = {
  xcodeProj: path.join(BUILD_DIR, 'jsb-ios', 'frameworks', 'runtime-src', 'proj.ios_mac', 'ios'),
  scheme: process.env.IOS_SCHEME || 'YourGame',
  workspace: process.env.IOS_WORKSPACE || '', // 若使用 CocoaPods，填 xxx.xcworkspace 的文件名
  exportOptionsPlist: process.env.IOS_EXPORT_PLIST || path.join(PROJECT_PATH, 'ExportOptions.plist'),
};

export const mac = {
  xcodeProj: path.join(BUILD_DIR, 'jsb-mac', 'frameworks', 'runtime-src', 'proj.ios_mac', 'mac'),
  scheme: process.env.MAC_SCHEME || 'YourGame',
  workspace: process.env.MAC_WORKSPACE || '',
  exportOptionsPlist: process.env.MAC_EXPORT_PLIST || path.join(PROJECT_PATH, 'ExportOptionsMac.plist'),
};

export const windows = {
  slnDir: path.join(BUILD_DIR, 'jsb-link', 'frameworks', 'runtime-src', 'proj.win32'),
  configuration: process.env.WIN_CONFIG || 'Release',
  platformArch: process.env.WIN_ARCH || 'Win32',
  // v142 = VS 2019, v143 = VS 2022. Cocos Creator 2.4 generates v100 (VS 2010) which must be upgraded.
  toolset: process.env.WIN_TOOLSET || 'v142',
};
