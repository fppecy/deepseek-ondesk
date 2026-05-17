# DeepSeek Desktop

基于 Electron 封装的 DeepSeek 网页版桌面客户端，支持持久化登录、系统通知和全局快捷键。

> **声明**：本项目仅为 DeepSeek 网页版的桌面封装，不调用任何 API，所有功能依赖 DeepSeek 服务器。

## 功能

- 持久化登录（关闭应用后仍保持登录状态）
- 自动隐藏广告和移动端提示等干扰元素
- 系统通知（新消息时弹出桌面通知）
- 全局快捷键 `Ctrl+Shift+D` 显示/隐藏窗口
- 开机自启动（支持通过 API 动态开关）
- 自动更新支持（需配置 GitHub Releases）

## 快速开始

**环境要求**：Node.js 18+

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/deepseekondesk.git
cd deepseekondesk

# 安装依赖
npm install

# 开发模式运行
npm run start
```

> 如果 `npm run start` 报错找不到 electron，用 `npx electron .` 代替，或者修改 `package.json` 中 `scripts.start` 为你本地 electron 的路径。

## 需要修改的地方

开源后其他用户需要根据自己情况修改以下内容：

### 1. package.json - start 脚本

```json
"start": "你的electron路径 ."
```

修改为以下任一方式：
- 安装了全局 electron：`"start": "electron ."`
- 使用 npx：`"start": "npx electron ."`
- 指定本地路径：`"start": "D:\\your-path\\electron.exe ."`

### 2. electron-builder.yml - 自动更新

取消注释并填写你的 GitHub 仓库信息：

```yaml
publish:
  provider: github
  owner: YOUR_GITHUB_USERNAME
  repo: deepseek-desktop
```

### 3. src/css-inject.ts - 广告选择器

DeepSeek 网页结构可能更新，如果发现元素没被隐藏，用 DevTools 检查实际的选择器并修改。

## 打包

```bash
# Windows
npm run dist:win

# macOS
npm run dist:mac

# Linux
npm run dist:linux
```

## 项目结构

```
deepseek-desktop/
├── src/
│   ├── main.ts          # 主进程（窗口、会话、IPC、快捷键）
│   ├── preload.ts       # 预加载脚本（contextBridge API）
│   └── css-inject.ts    # 广告移除 CSS 规则
├── package.json
├── vite.config.ts
├── electron-builder.yml
└── tsconfig.json
```

## 数据存储

登录信息存储在本地，不会上传到任何服务器：

- **Windows**：`%APPDATA%\deepseek-desktop\Partitions\persist_deepseek-persist\`
- **macOS**：`~/Library/Application Support/deepseek-desktop/Partitions/persist_deepseek-persist/`
- **Linux**：`~/.config/deepseek-desktop/Partitions/persist_deepseek-persist/`

## 安全说明

- 不调用 DeepSeek API，所有交互通过网页 UI 完成
- `contextIsolation: true` + `sandbox: true`，网页无法访问 Node.js
- `nodeIntegration: false`，渲染进程无系统权限

## 技术栈

- [Electron](https://www.electronjs.org/) 42
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [electron-builder](https://www.electron.build/)
- [electron-updater](https://www.electron.build/auto-update)

## License

MIT
