import { sha256 } from './js/sha256.js'; // 需新建或引入SHA-256实现

// Vercel Middleware to inject environment variables
export default async function middleware(request) {
  // ===== 临时调试日志：打印所有请求 URL 和 PASSWORD 环境变量 =====
  console.log("DEBUG >>> request url (all):", request.url);
  console.log("DEBUG >>> PASSWORD env:", process.env.PASSWORD);
  // ===============================================================

  const url = new URL(request.url);

  // 只处理 HTML 页面
  const isHtmlPage = url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (!isHtmlPage) {
    return; // 非 HTML 请求放行
  }

  // 获取原始响应
  const response = await fetch(request);

  // 判断 content-type 是否为 HTML
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  const originalHtml = await response.text();

  // 获取环境变量密码并计算 SHA-256
  const password = process.env.PASSWORD || '';
  let passwordHash = '';
  if (password) {
    passwordHash = await sha256(password);
    console.log("DEBUG >>> password SHA-256 hash:", passwordHash);
  }

  // 替换前端占位符
  const modifiedHtml = originalHtml.replace(
    'window.__ENV__.PASSWORD = "{{PASSWORD}}";',
    `window.__ENV__.PASSWORD = "${passwordHash}"; // SHA-256 hash`
  );

  return new Response(modifiedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

export const config = {
  matcher: ['/', '/((?!api|_next/static|_vercel|favicon.ico).*)'],
};
