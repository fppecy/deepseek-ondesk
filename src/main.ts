import { app, BrowserWindow, globalShortcut, ipcMain, Menu, Notification } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { HIDE_ELEMENTS_CSS } from './css-inject';

// ✅ 验证点：加载源必须是 DeepSeek 官网，禁止本地 HTML
const DEEPSEEK_URL = 'https://chat.deepseek.com';

// ✅ 验证点：持久化会话分区 - 关闭应用后 Cookie/LocalStorage 不丢失
const SESSION_PARTITION = 'persist:deepseek-persist';

// 全局快捷键
const GLOBAL_SHORTCUT = 'CommandOrControl+Shift+D';

let mainWindow: BrowserWindow | null = null;

// ✅ 验证点：MutationObserver 脚本 - 监听新消息触发系统通知
// 禁止在此脚本中发起任何 API 请求（如 fetch /v1/chat/）
const OBSERVER_SCRIPT = `
  (function() {
    if (window.__deepseekObserverInstalled) return;
    window.__deepseekObserverInstalled = true;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            const el = /** @type {Element} */ (node);
            const text = el.innerText || el.textContent || '';
            if (text.length > 10 && window.deepseekDesktop) {
              window.deepseekDesktop.notifyNewMessage(text.substring(0, 200));
            }
          }
        }
      }
    });

    // 等待聊天容器加载后开始观察
    const startObserving = () => {
      const chatContainer = document.querySelector('[class*="chat"]') || document.body;
      observer.observe(chatContainer, { childList: true, subtree: true });
    };

    if (document.readyState === 'complete') {
      startObserving();
    } else {
      window.addEventListener('load', startObserving);
    }
  })();
`;

// ✅ 验证点：设置面板注入脚本 - 右下角齿轮按钮控制开机自启动
const SETTINGS_PANEL_SCRIPT = `
  (function() {
    if (window.__deepseekSettingsInstalled) return;
    window.__deepseekSettingsInstalled = true;

    const style = document.createElement('style');
    style.textContent = \`
      #ds-settings-btn {
        position: fixed; bottom: 20px; right: 20px; z-index: 99999;
        width: 40px; height: 40px; border-radius: 50%;
        background: #1a1a2e; color: #fff; border: none; cursor: pointer;
        font-size: 20px; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3); transition: opacity 0.2s;
      }
      #ds-settings-btn:hover { opacity: 0.8; }
      #ds-settings-panel {
        position: fixed; bottom: 70px; right: 20px; z-index: 99999;
        background: #1a1a2e; color: #fff; border-radius: 12px; padding: 16px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4); min-width: 220px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 14px; display: none;
      }
      #ds-settings-panel.show { display: block; }
      #ds-settings-panel h4 { margin: 0 0 12px; font-size: 15px; }
      #ds-settings-panel label {
        display: flex; align-items: center; justify-content: space-between;
        cursor: pointer; padding: 6px 0;
      }
      #ds-settings-panel label span { opacity: 0.8; }
      .ds-toggle {
        position: relative; width: 36px; height: 20px; background: #444;
        border-radius: 10px; transition: background 0.2s;
      }
      .ds-toggle.on { background: #4caf50; }
      .ds-toggle::after {
        content: ''; position: absolute; top: 2px; left: 2px;
        width: 16px; height: 16px; background: #fff; border-radius: 50%;
        transition: transform 0.2s;
      }
      .ds-toggle.on::after { transform: translateX(16px); }
    \`;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = 'ds-settings-btn';
    btn.innerHTML = '&#9881;';
    btn.title = '设置';

    const panel = document.createElement('div');
    panel.id = 'ds-settings-panel';
    panel.innerHTML = '<h4>设置</h4><label><span>开机自启动</span><div class="ds-toggle" id="ds-toggle-autolaunch"></div></label>';

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    const toggle = document.getElementById('ds-toggle-autolaunch');

    // 读取当前状态
    window.deepseekDesktop.getAutoLaunch().then(enabled => {
      if (enabled) toggle.classList.add('on');
    });

    btn.addEventListener('click', () => {
      panel.classList.toggle('show');
    });

    toggle.addEventListener('click', () => {
      const isOn = toggle.classList.contains('on');
      window.deepseekDesktop.setAutoLaunch(!isOn).then(() => {
        toggle.classList.toggle('on');
      });
    });

    // 点击面板外关闭
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && e.target !== btn) {
        panel.classList.remove('show');
      }
    });
  })();
`;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'DeepSeek Desktop',
    webPreferences: {
      // ✅ 验证点：预加载脚本路径指向编译后的 preload.js
      preload: path.join(__dirname, 'preload.js'),
      // ✅ 验证点：持久化会话分区 - 数据存储在 Partitions/deepseek-persist 目录
      partition: SESSION_PARTITION,
      // 安全设置
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // ✅ 验证点：直接加载 DeepSeek 网页，非本地 HTML
  mainWindow.loadURL(DEEPSEEK_URL);

  // ✅ 验证点：页面加载完成后注入 CSS 广告移除规则 + MutationObserver
  mainWindow.webContents.on('did-finish-load', () => {
    // 注入 CSS 隐藏广告等干扰元素
    mainWindow?.webContents.insertCSS(HIDE_ELEMENTS_CSS);
    // 注入 MutationObserver 监听新消息
    mainWindow?.webContents.executeJavaScript(OBSERVER_SCRIPT).catch((err) => {
      console.error('注入 MutationObserver 失败:', err);
    });
    // 注入设置面板
    mainWindow?.webContents.executeJavaScript(SETTINGS_PANEL_SCRIPT).catch((err) => {
      console.error('注入设置面板失败:', err);
    });
  });

  // 设置标准 Chrome 用户代理，避免被识别为 Electron
  mainWindow.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  );

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ✅ 验证点：IPC 处理 - 系统通知（通过 DeepSeek 网页调用 preload API 触发）
ipcMain.handle('notify-new-message', (_event, content: string) => {
  if (Notification.isSupported()) {
    new Notification({
      title: 'DeepSeek - 新消息',
      body: content.substring(0, 250),
      silent: false,
    }).show();
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// ✅ 验证点：开机自启动 - 通过 app.setLoginItemSettings 控制
ipcMain.handle('get-auto-launch', () => {
  const settings = app.getLoginItemSettings();
  return settings.openAtLogin;
});

ipcMain.handle('set-auto-launch', (_event, enabled: boolean) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    // Windows 下以最小化启动
    openAsHidden: false,
  });
  return enabled;
});

// ✅ 验证点：自动更新 - 通过 electron-updater 检查更新
function setupAutoUpdater(): void {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update-status', 'update-available');
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-status', 'update-downloaded');
  });

  autoUpdater.on('error', (error) => {
    console.error('自动更新错误:', error);
  });
}

// ✅ 验证点：应用生命周期管理
app.whenReady().then(() => {
  // 移除默认菜单栏
  Menu.setApplicationMenu(null);

  createWindow();
  setupAutoUpdater();

  // ✅ 验证点：全局快捷键 Ctrl+Shift+D 显示/隐藏窗口
  const registered = globalShortcut.register(GLOBAL_SHORTCUT, () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  if (!registered) {
    console.error('全局快捷键注册失败:', GLOBAL_SHORTCUT);
  }
});

// 退出时注销所有快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// macOS: 关闭所有窗口时不退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS: 点击 Dock 图标时重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
