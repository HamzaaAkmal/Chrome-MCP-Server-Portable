#!/usr/bin/env node
/**
 * Standalone Installer for Chrome MCP Bridge
 * This is a self-contained executable that:
 * 1. Registers the Native Messaging host
 * 2. Adds itself to Windows startup
 * 3. Starts the server
 * 
 * Users just need to download and run this once.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync, spawn } from 'child_process';
import { EXTENSION_ID, HOST_NAME, DESCRIPTION } from './scripts/constant';

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message: string): void {
  log(`✓ ${message}`, 'green');
}

function logError(message: string): void {
  log(`✗ ${message}`, 'red');
}

function logInfo(message: string): void {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message: string): void {
  log(`⚠ ${message}`, 'yellow');
}

/**
 * Get the path to the current executable
 */
function getExecutablePath(): string {
  // When running as pkg executable, process.execPath points to the bundled exe
  // When running as node script, we use __dirname
  if ((process as any).pkg) {
    return process.execPath;
  }
  return path.join(__dirname, 'index.js');
}

/**
 * Get the installation directory
 */
function getInstallDir(): string {
  const appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appDataPath, 'ChromeMCPBridge');
}

/**
 * Ensure installation directory exists and copy executable there
 */
async function ensureInstallation(): Promise<string> {
  const installDir = getInstallDir();
  const executablePath = getExecutablePath();
  const targetPath = path.join(installDir, 'chrome-mcp-bridge.exe');

  // Create installation directory
  if (!fs.existsSync(installDir)) {
    fs.mkdirSync(installDir, { recursive: true });
    logSuccess(`Created installation directory: ${installDir}`);
  }

  // Copy executable to installation directory if running from different location
  if ((process as any).pkg && executablePath !== targetPath) {
    try {
      fs.copyFileSync(executablePath, targetPath);
      logSuccess(`Installed executable to: ${targetPath}`);
    } catch (err: any) {
      logWarning(`Could not copy to install dir: ${err.message}`);
    }
  }

  // Create logs directory
  const logsDir = path.join(installDir, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  return installDir;
}

/**
 * Create batch file wrapper for Native Messaging
 */
function createBatchWrapper(installDir: string): string {
  const batchPath = path.join(installDir, 'run_host.bat');
  const exePath = path.join(installDir, 'chrome-mcp-bridge.exe');
  const logsDir = path.join(installDir, 'logs');

  const batchContent = `@echo off
setlocal enabledelayedexpansion

set "LOG_DIR=${logsDir.replace(/\\/g, '\\\\')}"
set "EXE_PATH=${exePath.replace(/\\/g, '\\\\')}"

if not exist "%LOG_DIR%" md "%LOG_DIR%"

set "timestamp=%date:~-4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "timestamp=%timestamp: =0%"
set "LOG_FILE=%LOG_DIR%\\host_%timestamp%.log"

echo [%date% %time%] Starting Chrome MCP Bridge... >> "%LOG_FILE%" 2>&1
"%EXE_PATH%" --native-messaging >> "%LOG_FILE%" 2>&1
`;

  fs.writeFileSync(batchPath, batchContent);
  logSuccess(`Created batch wrapper: ${batchPath}`);
  return batchPath;
}

/**
 * Register Native Messaging host for Chrome
 */
function registerNativeMessagingHost(installDir: string): void {
  const batchPath = path.join(installDir, 'run_host.bat');
  
  // Create manifest
  const manifest = {
    name: HOST_NAME,
    description: DESCRIPTION,
    path: batchPath,
    type: 'stdio',
    allowed_origins: [`chrome-extension://${EXTENSION_ID}/`],
  };

  // Chrome manifest path
  const chromeManifestDir = path.join(
    process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
    'Google',
    'Chrome',
    'NativeMessagingHosts'
  );

  // Create directory if it doesn't exist
  if (!fs.existsSync(chromeManifestDir)) {
    fs.mkdirSync(chromeManifestDir, { recursive: true });
  }

  const manifestPath = path.join(chromeManifestDir, `${HOST_NAME}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  logSuccess(`Created manifest: ${manifestPath}`);

  // Register in Windows Registry
  try {
    const registryKey = `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`;
    const escapedPath = manifestPath.replace(/\\/g, '\\\\');
    execSync(`reg add "${registryKey}" /ve /t REG_SZ /d "${escapedPath}" /f`, { stdio: 'pipe' });
    logSuccess('Registered in Windows Registry');
  } catch (err: any) {
    logWarning(`Registry registration warning: ${err.message}`);
  }

  // Also register for Edge (Chromium-based)
  try {
    const edgeManifestDir = path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'Microsoft',
      'Edge',
      'NativeMessagingHosts'
    );
    
    if (!fs.existsSync(edgeManifestDir)) {
      fs.mkdirSync(edgeManifestDir, { recursive: true });
    }
    
    const edgeManifestPath = path.join(edgeManifestDir, `${HOST_NAME}.json`);
    fs.writeFileSync(edgeManifestPath, JSON.stringify(manifest, null, 2));
    logSuccess(`Created Edge manifest: ${edgeManifestPath}`);

    const edgeRegistryKey = `HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\${HOST_NAME}`;
    execSync(`reg add "${edgeRegistryKey}" /ve /t REG_SZ /d "${edgeManifestPath.replace(/\\/g, '\\\\')}" /f`, { stdio: 'pipe' });
    logSuccess('Registered Edge in Windows Registry');
  } catch (err: any) {
    logWarning(`Edge registration skipped: ${err.message}`);
  }
}

/**
 * Add to Windows Startup
 */
function addToStartup(installDir: string): void {
  const exePath = path.join(installDir, 'chrome-mcp-bridge.exe');
  const startupKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
  
  try {
    // Add to registry startup
    execSync(`reg add "${startupKey}" /v "ChromeMCPBridge" /t REG_SZ /d "\\"${exePath}\\" --background" /f`, { stdio: 'pipe' });
    logSuccess('Added to Windows startup');
  } catch (err: any) {
    logWarning(`Could not add to startup: ${err.message}`);
  }
}

/**
 * Create desktop shortcut
 */
function createDesktopShortcut(installDir: string): void {
  const exePath = path.join(installDir, 'chrome-mcp-bridge.exe');
  const desktopPath = path.join(os.homedir(), 'Desktop');
  const shortcutPath = path.join(desktopPath, 'Chrome MCP Bridge.lnk');

  try {
    // Use PowerShell to create shortcut
    const psScript = `
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")
$Shortcut.TargetPath = "${exePath.replace(/\\/g, '\\\\')}"
$Shortcut.Arguments = "--background"
$Shortcut.Description = "Chrome MCP Bridge Server"
$Shortcut.WorkingDirectory = "${installDir.replace(/\\/g, '\\\\')}"
$Shortcut.Save()
`;
    execSync(`powershell -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { stdio: 'pipe' });
    logSuccess(`Created desktop shortcut: ${shortcutPath}`);
  } catch (err: any) {
    logWarning(`Could not create desktop shortcut: ${err.message}`);
  }
}

/**
 * Show completion message
 */
function showCompletionMessage(): void {
  console.log('');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('     Chrome MCP Bridge - Installation Complete!', 'green');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  console.log('');
  logInfo('The server is now ready to use.');
  console.log('');
  log('Next steps:', 'yellow');
  console.log('  1. Open Chrome and go to your extension');
  console.log('  2. Click the extension icon to connect');
  console.log('  3. The server will start automatically');
  console.log('');
  log('MCP Configuration for VS Code:', 'yellow');
  console.log('  Add this to your VS Code MCP settings:');
  console.log('');
  console.log('  {');
  console.log('    "chrome-mcp": {');
  console.log('      "url": "http://127.0.0.1:12306/mcp",');
  console.log('      "type": "streamableHttp"');
  console.log('    }');
  console.log('  }');
  console.log('');
  log('═══════════════════════════════════════════════════════════', 'cyan');
}

/**
 * Run in native messaging mode (called by Chrome)
 */
async function runNativeMessaging(): Promise<void> {
  // Import and start the native messaging host using require for pkg compatibility
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serverInstance = require('./server').default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nativeMessagingHostInstance = require('./native-messaging-host').default;

  try {
    serverInstance.setNativeHost(nativeMessagingHostInstance);
    nativeMessagingHostInstance.setServer(serverInstance);
    nativeMessagingHostInstance.start();
  } catch (error) {
    process.exit(1);
  }

  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
  process.on('uncaughtException', () => process.exit(1));
}

/**
 * Run as background server
 */
async function runBackground(): Promise<void> {
  logInfo('Starting Chrome MCP Bridge in background mode...');
  
  // Just keep the process alive - Chrome will connect when needed
  // The actual server starts when Chrome extension connects via Native Messaging
  
  process.on('SIGINT', () => {
    logInfo('Shutting down...');
    process.exit(0);
  });

  // Keep alive
  setInterval(() => {}, 1000 * 60 * 60);
}

/**
 * Main installer function
 */
async function runInstaller(): Promise<void> {
  console.log('');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('     Chrome MCP Bridge - One-Click Installer', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  console.log('');

  try {
    // Step 1: Create installation directory
    logInfo('Step 1: Setting up installation directory...');
    const installDir = await ensureInstallation();

    // Step 2: Create batch wrapper
    logInfo('Step 2: Creating launcher scripts...');
    createBatchWrapper(installDir);

    // Step 3: Register Native Messaging host
    logInfo('Step 3: Registering Native Messaging host...');
    registerNativeMessagingHost(installDir);

    // Step 4: Add to startup
    logInfo('Step 4: Adding to Windows startup...');
    addToStartup(installDir);

    // Step 5: Create desktop shortcut
    logInfo('Step 5: Creating desktop shortcut...');
    createDesktopShortcut(installDir);

    // Done!
    showCompletionMessage();

  } catch (error: any) {
    logError(`Installation failed: ${error.message}`);
    console.log('');
    log('Please try running as Administrator if you encounter permission issues.', 'yellow');
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--native-messaging')) {
    // Called by Chrome for Native Messaging
    await runNativeMessaging();
  } else if (args.includes('--background')) {
    // Run as background service
    await runBackground();
  } else if (args.includes('--uninstall')) {
    // Uninstall
    logInfo('Uninstalling Chrome MCP Bridge...');
    try {
      execSync('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "ChromeMCPBridge" /f', { stdio: 'pipe' });
      execSync(`reg delete "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}" /f`, { stdio: 'pipe' });
      logSuccess('Uninstalled successfully');
    } catch (err) {
      logWarning('Some registry entries could not be removed');
    }
  } else {
    // Run installer
    await runInstaller();
    
    // Wait for user to see the message
    console.log('');
    log('Press any key to exit...', 'cyan');
    
    // On Windows, wait for keypress
    if (process.platform === 'win32') {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      await new Promise<void>((resolve) => {
        process.stdin.setRawMode?.(true);
        process.stdin.resume();
        process.stdin.once('data', () => {
          rl.close();
          resolve();
        });
      });
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
