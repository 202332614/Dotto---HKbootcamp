// auth.js — 로그인 / 회원가입 로직

(function () {
    'use strict';

    // ── 유틸 ──────────────────────────────────────────
    function showToast(msg, type) {
        var t = document.getElementById('toast');
        t.textContent = msg;
        t.className = 'toast ' + type + ' show';
        setTimeout(function () { t.classList.remove('show'); }, 3000);
    }

    function showError(id, msg) {
        var el = document.getElementById(id);
        if (el) { el.textContent = msg; el.classList.add('show'); }
    }

    function clearErrors() {
        var errs = document.querySelectorAll('.form-error');
        for (var i = 0; i < errs.length; i++) {
            errs[i].textContent = '';
            errs[i].classList.remove('show');
        }
        var inputs = document.querySelectorAll('.form-input');
        for (var j = 0; j < inputs.length; j++) {
            inputs[j].classList.remove('error');
        }
    }

    async function api(url, body) {
        var res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        var data = await res.json();
        return { ok: res.ok, data: data };
    }

    // ── 로그인 ────────────────────────────────────────
    var loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async function () {
            clearErrors();
            var username = document.getElementById('loginId').value.trim();
            var password = document.getElementById('loginPw').value;
            var valid = true;

            if (!username) {
                showError('loginIdError', '아이디를 입력해주세요.');
                document.getElementById('loginId').classList.add('error');
                valid = false;
            }
            if (!password) {
                showError('loginPwError', '비밀번호를 입력해주세요.');
                document.getElementById('loginPw').classList.add('error');
                valid = false;
            }
            if (!valid) return;

            loginBtn.disabled = true;
            loginBtn.textContent = '로그인 중...';

            try {
                var result = await api('/api/login', { username: username, password: password });
                if (result.ok) {
                    showToast('로그인 성공!', 'success');
                    setTimeout(function () { window.location.href = '/todo'; }, 600);
                } else {
                    showToast(result.data.error || '로그인 실패', 'error');
                }
            } catch (e) {
                showToast('서버 연결에 실패했습니다.', 'error');
            }
            loginBtn.disabled = false;
            loginBtn.textContent = 'login';
        });

        // Enter 키
        document.getElementById('loginPw').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') loginBtn.click();
        });
        document.getElementById('loginId').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') document.getElementById('loginPw').focus();
        });
    }

    // ── 회원가입 ──────────────────────────────────────
    var signupBtn = document.getElementById('signupBtn');
    if (signupBtn) {
        signupBtn.addEventListener('click', async function () {
            clearErrors();
            var username = document.getElementById('signupId').value.trim();
            var password = document.getElementById('signupPw').value;
            var pwCheck = document.getElementById('signupPwCheck').value;
            var valid = true;

            if (!username || username.length < 3) {
                showError('signupIdError', '아이디는 3자 이상 입력해주세요.');
                document.getElementById('signupId').classList.add('error');
                valid = false;
            }
            if (!password || password.length < 4) {
                showError('signupPwError', '비밀번호는 4자 이상 입력해주세요.');
                document.getElementById('signupPw').classList.add('error');
                valid = false;
            }
            if (password !== pwCheck) {
                showError('signupPwCheckError', '비밀번호가 일치하지 않습니다.');
                document.getElementById('signupPwCheck').classList.add('error');
                valid = false;
            }
            if (!valid) return;

            signupBtn.disabled = true;
            signupBtn.textContent = '가입 중...';

            try {
                var result = await api('/api/signup', { username: username, password: password });
                if (result.ok) {
                    showToast('회원가입 완료! 로그인 페이지로 이동합니다.', 'success');
                    setTimeout(function () { window.location.href = '/login'; }, 1200);
                } else {
                    showToast(result.data.error || '회원가입 실패', 'error');
                }
            } catch (e) {
                showToast('서버 연결에 실패했습니다.', 'error');
            }
            signupBtn.disabled = false;
            signupBtn.textContent = 'login';
        });

        // Enter 키
        document.getElementById('signupPwCheck').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') signupBtn.click();
        });
    }
})();
