// ==================== PASSWORD.JS ====================

// 防止重复声明
if (!window.PASSWORD_CONFIG) {
    // 密码保护配置
    window.PASSWORD_CONFIG = {
        localStorageKey: 'passwordVerified',  // 存储验证状态的键名
        verificationTTL: 90 * 24 * 60 * 60 * 1000  // 验证有效期（90天）
    };
}

// 检查是否设置了密码保护
function isPasswordProtected() {
    const pwd = window.__ENV__ && window.__ENV__.PASSWORD;
    return typeof pwd === 'string' && pwd.length === 64 && !/^0+$/.test(pwd);
}

// 是否需要强制设置密码
function isPasswordRequired() {
    return !isPasswordProtected();
}

// 验证用户输入密码（SHA‑256）
async function verifyPassword(password) {
    try {
        const correctHash = window.__ENV__?.PASSWORD;
        if (!correctHash) return false;

        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const isValid = inputHash === correctHash;
        if (isValid) {
            localStorage.setItem(PASSWORD_CONFIG.localStorageKey, JSON.stringify({
                verified: true,
                timestamp: Date.now(),
                passwordHash: correctHash
            }));
        }
        return isValid;
    } catch (error) {
        console.error('验证密码时出错:', error);
        return false;
    }
}

// 检查密码验证状态
function isPasswordVerified() {
    try {
        if (!isPasswordProtected()) return true;

        const stored = localStorage.getItem(PASSWORD_CONFIG.localStorageKey);
        if (!stored) return false;

        const { timestamp, passwordHash } = JSON.parse(stored);
        const currentHash = window.__ENV__?.PASSWORD;

        return timestamp && passwordHash === currentHash &&
            Date.now() - timestamp < PASSWORD_CONFIG.verificationTTL;
    } catch (error) {
        console.error('检查密码验证状态时出错:', error);
        return false;
    }
}

// 显示密码弹窗
function showPasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (!modal) return;

    document.getElementById('doubanArea')?.classList.add('hidden');
    document.getElementById('passwordCancelBtn')?.classList.add('hidden');

    const title = modal.querySelector('h2');
    const description = modal.querySelector('p');
    const form = modal.querySelector('form');
    const errorMsg = document.getElementById('passwordError');

    if (isPasswordRequired()) {
        if (title) title.textContent = '需要设置密码';
        if (description) description.textContent = '请先在部署平台设置 PASSWORD 环境变量';
        if (form) form.style.display = 'none';
        if (errorMsg) {
            errorMsg.textContent = '必须设置 PASSWORD 环境变量才能使用本服务';
            errorMsg.className = 'text-red-500 mt-2 font-medium';
            errorMsg.classList.remove('hidden');
        }
    } else {
        if (title) title.textContent = '访问验证';
        if (description) description.textContent = '请输入密码继续访问';
        if (form) form.style.display = 'block';
    }

    modal.style.display = 'flex';
    if (!isPasswordRequired()) {
        setTimeout(() => {
            const input = document.getElementById('passwordInput');
            if (input) input.focus();
        }, 100);
    }
}

// 隐藏密码弹窗
function hidePasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (!modal) return;

    const input = document.getElementById('passwordInput');
    if (input) input.value = '';

    modal.style.display = 'none';

    if (localStorage.getItem('doubanEnabled') === 'true') {
        document.getElementById('doubanArea')?.classList.remove('hidden');
        if (typeof initDouban === 'function') initDouban();
    }
}

// 显示/隐藏错误
function showPasswordError() {
    document.getElementById('passwordError')?.classList.remove('hidden');
}
function hidePasswordError() {
    document.getElementById('passwordError')?.classList.add('hidden');
}

// 处理提交事件
async function handlePasswordSubmit() {
    const input = document.getElementById('passwordInput');
    const pwd = input ? input.value.trim() : '';
    if (await verifyPassword(pwd)) {
        hidePasswordModal();
        document.dispatchEvent(new CustomEvent('passwordVerified'));
    } else {
        showPasswordError();
        if (input) { input.value = ''; input.focus(); }
    }
}

// 初始化密码验证
function initPasswordProtection() {
    if (isPasswordRequired() || (isPasswordProtected() && !isPasswordVerified())) {
        showPasswordModal();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initPasswordProtection);

// 全局暴露
window.isPasswordProtected = isPasswordProtected;
window.isPasswordRequired = isPasswordRequired;
window.isPasswordVerified = isPasswordVerified;
window.verifyPassword = verifyPassword;
window.showPasswordModal = showPasswordModal;
window.hidePasswordModal = hidePasswordModal;
window.handlePasswordSubmit = handlePasswordSubmit;
window.initPasswordProtection = initPasswordProtection;
