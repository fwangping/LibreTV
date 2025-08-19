// 密码保护配置
const PASSWORD_CONFIG = {
    localStorageKey: 'passwordVerified', // localStorage 存储 key
    verificationTTL: 24 * 60 * 60 * 1000 // 验证有效期，单位毫秒，这里设为 24 小时
};

// 密码保护功能

/**
 * 检查是否设置了密码保护
 * 通过读取页面上嵌入的环境变量来检查
 */
function isPasswordProtected() {
    // 只检查普通密码
    const pwd = window.__ENV__ && window.__ENV__.PASSWORD;
    
    // 检查普通密码是否有效
    return typeof pwd === 'string' && pwd.length === 64 && !/^0+$/.test(pwd);
}

/**
 * 检查是否强制要求设置密码
 * 如果没有设置有效的 PASSWORD，则认为需要强制设置密码
 * 为了安全考虑，所有部署都必须设置密码
 */
function isPasswordRequired() {
    return !isPasswordProtected();
}

/**
 * 强制密码保护检查 - 防止绕过
 * 在关键操作前都应该调用此函数
 */
function ensurePasswordProtection() {
    if (isPasswordRequired()) {
        showPasswordModal();
        throw new Error('Password protection is required');
    }
    if (isPasswordProtected() && !isPasswordVerified()) {
        showPasswordModal();
        throw new Error('Password verification required');
    }
    return true;
}

window.isPasswordProtected = isPasswordProtected;
window.isPasswordRequired = isPasswordRequired;

/**
 * 验证用户输入的密码是否正确（异步，使用SHA-256哈希）
 */
async function verifyPassword(password) {
    try {
        const correctHash = window.__ENV__?.PASSWORD;
        if (!correctHash) return false;

        // 浏览器内置 SHA-256
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

// 验证状态检查
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

// 更新全局导出
window.isPasswordVerified = isPasswordVerified;
window.verifyPassword = verifyPassword;
window.ensurePasswordProtection = ensurePasswordProtection;

// SHA-256实现，可用Web Crypto API
async function sha256(message) {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    if (typeof window._jsSha256 === 'function') {
        return window._jsSha256(message);
    }
    throw new Error('No SHA-256 implementation available.');
}

/**
 * 显示密码验证弹窗
 */
function showPasswordModal() {
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        document.getElementById('doubanArea')?.classList.add('hidden');
        document.getElementById('passwordCancelBtn')?.classList.add('hidden');

        if (isPasswordRequired()) {
            const title = passwordModal.querySelector('h2');
            const description = passwordModal.querySelector('p');
            if (title) title.textContent = '需要设置密码';
            if (description) description.textContent = '请先在部署平台设置 PASSWORD 环境变量来保护您的实例';
            
            const form = passwordModal.querySelector('form');
            const errorMsg = document.getElementById('passwordError');
            if (form) form.style.display = 'none';
            if (errorMsg) {
                errorMsg.textContent = '为确保安全，必须设置 PASSWORD 环境变量才能使用本服务，请联系管理员进行配置';
                errorMsg.className = 'text-red-500 mt-2 font-medium';
                errorMsg.classList.remove('hidden');
            }
        } else {
            const title = passwordModal.querySelector('h2');
            const description = passwordModal.querySelector('p');
            if (title) title.textContent = '访问验证';
            if (description) description.textContent = '请输入密码继续访问';
            
            const form = passwordModal.querySelector('form');
            if (form) form.style.display = 'block';
        }

        passwordModal.style.display = 'flex';
        if (!isPasswordRequired()) {
            setTimeout(() => {
                const passwordInput = document.getElementById('passwordInput');
                passwordInput?.focus();
            }, 100);
        }
    }
}

/**
 * 隐藏密码验证弹窗
 */
function hidePasswordModal() {
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        hidePasswordError();
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) passwordInput.value = '';

        passwordModal.style.display = 'none';
        if (localStorage.getItem('doubanEnabled') === 'true') {
            document.getElementById('doubanArea')?.classList.remove('hidden');
            initDouban?.();
        }
    }
}

/**
 * 显示/隐藏密码错误信息
 */
function showPasswordError() {
    document.getElementById('passwordError')?.classList.remove('hidden');
}
function hidePasswordError() {
    document.getElementById('passwordError')?.classList.add('hidden');
}

/**
 * 处理密码提交事件（异步）
 */
async function handlePasswordSubmit() {
    const passwordInput = document.getElementById('passwordInput');
    const password = passwordInput?.value.trim() || '';
    if (await verifyPassword(password)) {
        hidePasswordModal();
        document.dispatchEvent(new CustomEvent('passwordVerified'));
    } else {
        showPasswordError();
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
    }
}

/**
 * 初始化密码验证系统
 */
function initPasswordProtection() {
    if (isPasswordRequired() || (isPasswordProtected() && !isPasswordVerified())) {
        showPasswordModal();
    }
}

document.addEventListener('DOMContentLoaded', initPasswordProtection);
