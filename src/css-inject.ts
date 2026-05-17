/**
 * ✅ 验证点：广告移除选择器必须匹配官网 DOM 结构
 * 通过 webContents.insertCSS() 注入，无需依赖 DOM 存在
 * SPA 路由切换后样式依然生效
 */
export const HIDE_ELEMENTS_CSS = `
  /* ✅ 验证点：广告横幅和弹窗 */
  .ad-container,
  .adsbygoogle,
  [class*="advertisement"],
  [id*="ad-"],
  [data-testid="ad-banner"],

  /* ✅ 验证点：移动端警告和下载提示 */
  [class*="mobile-warning"],
  [class*="app-download"],
  [class*="download-app"],
  [class*="mobile-banner"],

  /* ✅ 验证点：Cookie 同意弹窗 */
  [class*="cookie-consent"],
  [class*="gdpr"],

  /* ✅ 验证点：推广覆盖层 */
  [class*="promo"],
  [class*="popup-overlay"],
  [class*="modal-overlay"]:not([class*="chat"]),

  /* ✅ 验证点：非聊天通知栏 */
  [class*="notification-bar"]:not([class*="chat"])
  {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    overflow: hidden !important;
  }
`;
