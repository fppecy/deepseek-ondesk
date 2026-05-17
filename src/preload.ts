import { contextBridge, ipcRenderer } from 'electron';

/**
 * ✅ 验证点：通过 contextBridge 安全暴露 API，不直接暴露 ipcRenderer
 * 禁止在此文件中添加任何 DeepSeek API 调用逻辑
 */
contextBridge.exposeInMainWorld('deepseekDesktop', {
  /**
   * 通知主进程有新消息到达，触发系统通知
   * @param content 消息内容（主进程会截断到 250 字符）
   */
  notifyNewMessage: (content: string): void => {
    ipcRenderer.invoke('notify-new-message', content);
  },

  /**
   * 获取应用版本号
   */
  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke('get-app-version');
  },

  /**
   * 监听自动更新状态变化
   * @param callback 回调函数，接收状态字符串：'update-available' | 'update-downloaded'
   */
  onUpdateStatus: (callback: (status: string) => void): void => {
    ipcRenderer.on('update-status', (_event, status: string) => callback(status));
  },

  /**
   * 获取当前开机自启动状态
   */
  getAutoLaunch: (): Promise<boolean> => {
    return ipcRenderer.invoke('get-auto-launch');
  },

  /**
   * 设置开机自启动
   * @param enabled 是否启用
   */
  setAutoLaunch: (enabled: boolean): Promise<boolean> => {
    return ipcRenderer.invoke('set-auto-launch', enabled);
  },
});
