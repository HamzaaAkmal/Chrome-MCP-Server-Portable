# Chrome MCP Server - Complete Setup and Usage Guide

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Starting the Server](#starting-the-server)
- [Using Chrome MCP](#using-chrome-mcp)
- [Troubleshooting](#troubleshooting)
- [Git Workflow](#git-workflow)

---

## 🔧 Prerequisites

Before starting, ensure you have:

- **Node.js** (v18 or higher)
- **pnpm** package manager
- **Google Chrome** browser
- **VS Code** (recommended for MCP integration)
- **Git** for version control

---

## 🚀 Initial Setup

### 1. Install Dependencies

```powershell
# Navigate to project directory
cd C:\Users\Hamza\Desktop\tiktik\mcp-chrome

# Install all dependencies
pnpm install
```

### 2. Build the Project

**Build in the following order:**

```powershell
# Step 1: Build shared packages
pnpm build:shared

# Step 2: Build native server
pnpm build:native

# Step 3: Build Chrome extension
pnpm build:extension
```

### 3. Configure Extension ID

After building the extension, you need to update the extension ID:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select: `app/chrome-extension/.output/chrome-mv3-dev/`
5. Copy the **Extension ID** from the loaded extension
6. Update `app/native-server/src/scripts/constant.ts`:

```typescript
export const EXTENSION_ID = 'your-extension-id-here'; // Replace with your actual ID
```

7. Rebuild the native server:

```powershell
pnpm build:native
```

### 4. Register Native Messaging Host

```powershell
# Navigate to native server directory
cd app/native-server

# Register the native messaging host
node dist/scripts/register-dev.js
```

This creates a registry entry in:
`C:\Users\Hamza\AppData\Roaming\Google\Chrome\NativeMessagingHosts\com.chromemcp.nativehost.json`

### 5. Configure VS Code MCP

Update your VS Code MCP configuration file:
`C:\Users\Hamza\AppData\Roaming\Code\User\mcp.json`

```json
{
  "chrome mcp server": {
    "url": "http://127.0.0.1:12306/mcp",
    "type": "streamableHttp"
  }
}
```

---

## 🎯 Starting the Server

### Method 1: Using npm/pnpm Scripts (Recommended)

```powershell
# Start the native server (this starts both native host and HTTP server)
cd app/native-server
pnpm start
```

**What happens:**

- Native messaging host starts listening on stdio
- HTTP server starts on `http://127.0.0.1:12306`
- MCP endpoint available at `http://127.0.0.1:12306/mcp`

### Method 2: Manual Start

```powershell
# Navigate to native server directory
cd app/native-server

# Start the server
node dist/index.js
```

### Verification

To verify the server is running:

```powershell
# Test HTTP endpoint
curl http://127.0.0.1:12306/mcp
```

**Expected response:** MCP protocol information

---

## 🌐 Using Chrome MCP

### Available MCP Tools

Once the server is running, you can use these Chrome automation tools through VS Code or any MCP client:

#### Navigation & Page Control

- `chrome_navigate` - Navigate to URLs or refresh pages
- `chrome_go_back_or_forward` - Browser history navigation
- `chrome_close_tabs` - Close browser tabs
- `chrome_switch_tab` - Switch between tabs
- `get_windows_and_tabs` - List all open windows and tabs

#### Page Interaction

- `chrome_click_element` - Click elements by selector or coordinates
- `chrome_fill_or_select` - Fill forms or select options
- `chrome_keyboard` - Simulate keyboard input
- `chrome_upload_file` - Upload files to web forms

#### Page Content

- `chrome_get_web_content` - Extract page content (text/HTML)
- `chrome_get_interactive_elements` - Find clickable elements
- `chrome_screenshot` - Capture screenshots

#### Advanced Features

- `chrome_inject_script` - Execute custom JavaScript
- `chrome_console` - Capture console logs
- `chrome_network_capture_start/stop` - Monitor network requests
- `chrome_bookmark_add/search/delete` - Manage bookmarks
- `chrome_history` - Search browsing history

### Example Usage in VS Code

1. **Open VS Code**
2. **Ensure Chrome extension is loaded**
3. **Access MCP tools** through Copilot or MCP panel
4. **Example commands:**

```
"Navigate to google.com"
"Search for 'GitHub' and click the first result"
"Fill the search box with 'Chrome MCP'"
"Take a screenshot of the current page"
```

---

## 🔍 Troubleshooting

### Issue: "Native connection disconnected"

**Solution:**

1. Verify Extension ID matches in `constant.ts`
2. Rebuild native server: `pnpm build:native`
3. Re-register native host: `node dist/scripts/register-dev.js`
4. Reload Chrome extension

### Issue: "HTTP server not starting"

**Cause:** Server only starts when Chrome extension connects

**Solution:**

1. Ensure Chrome extension is loaded
2. Open a Chrome tab (this triggers connection)
3. Check server logs for errors

### Issue: "fetch failed to http://127.0.0.1:12306/mcp"

**Solutions:**

1. Verify server is running
2. Check MCP config type is `streamableHttp` (not `http`)
3. Restart VS Code after config changes

### Issue: Build errors

```powershell
# Clean and rebuild
pnpm clean
pnpm install
pnpm build:shared
pnpm build:native
pnpm build:extension
```

---

## 📝 Git Workflow

### Committing Changes

This project uses **conventional commits** with commitlint.

**Commit Format:**

```
<type>: <description>

[optional body]
[optional footer]
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `chore` - Maintenance tasks
- `refactor` - Code refactoring
- `test` - Adding tests

**Examples:**

```powershell
# Stage changes
git add .

# Commit with conventional format
git commit -m "feat: add new MCP tool for tab management"
git commit -m "fix: resolve native messaging connection issue"
git commit -m "docs: update setup guide with troubleshooting steps"

# Push to GitHub
git push origin main
```

### Checking GitHub Changes

After committing and pushing:

1. **Using Browser:**

   - Navigate to: `https://github.com/HamzaaAkmal/hamzakmal`
   - Refresh the page (F5 or Ctrl+R)
   - Check the latest commit appears in commit history
   - Verify files are updated

2. **Using Git Commands:**

```powershell
# Check remote status
git status

# View commit history
git log --oneline -5

# Verify remote is up to date
git fetch origin
git status
```

3. **Using Chrome MCP (Automated):**

```powershell
# Use MCP to navigate and verify
# Example through VS Code Copilot:
# "Navigate to my GitHub repository"
# "Refresh the page"
# "Take a screenshot of the commit history"
```

---

## 🎉 Quick Start Checklist

- [ ] Install dependencies: `pnpm install`
- [ ] Build shared: `pnpm build:shared`
- [ ] Build native: `pnpm build:native`
- [ ] Build extension: `pnpm build:extension`
- [ ] Load extension in Chrome
- [ ] Copy Extension ID
- [ ] Update `constant.ts` with Extension ID
- [ ] Rebuild native: `pnpm build:native`
- [ ] Register native host: `node dist/scripts/register-dev.js`
- [ ] Configure VS Code MCP settings
- [ ] Start server: `pnpm start` (in app/native-server)
- [ ] Verify server: `curl http://127.0.0.1:12306/mcp`
- [ ] Test MCP tools in VS Code

---

## 📚 Additional Resources

- **Project Repository:** https://github.com/HamzaaAkmal/hamzakmal
- **Original Project:** https://github.com/hangwin/mcp-chrome
- **MCP Documentation:** https://modelcontextprotocol.io
- **Conventional Commits:** https://www.conventionalcommits.org

---

## 🆘 Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review server logs in terminal
3. Check Chrome extension console (chrome://extensions → Details → Inspect views)
4. Verify all build steps completed successfully
5. Ensure all prerequisites are installed

---

**Last Updated:** November 16, 2025  
**Version:** 1.0.0  
**Author:** Hamza Akmal
