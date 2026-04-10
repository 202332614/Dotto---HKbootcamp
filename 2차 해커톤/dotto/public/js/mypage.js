// mypage.js — 마이페이지 로직

(function () {
    'use strict';

    function showToast(msg, type) {
        var t = document.getElementById('toast');
        t.textContent = msg;
        t.className = 'toast ' + type + ' show';
        setTimeout(function () { t.classList.remove('show'); }, 3000);
    }

    function formatDate(dateStr) {
        var d = new Date(dateStr);
        return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 가입';
    }

    // ── 인증 ──────────────────────────────────────────
    async function checkAuth() {
        try {
            var res = await fetch('/api/me');
            if (!res.ok) { window.location.href = '/login'; return null; }
            return (await res.json()).user;
        } catch (e) { window.location.href = '/login'; return null; }
    }

    function setUserInfo(user) {
        var initial = (user.nickname || user.username || 'U').charAt(0).toUpperCase();
        document.getElementById('sidebarAvatar').textContent = initial;
        document.getElementById('sidebarName').textContent = user.nickname || user.username;
        document.getElementById('profileAvatar').textContent = initial;
        document.getElementById('profileName').textContent = user.nickname || user.username;
        document.getElementById('profileBio').textContent = user.bio || '소개가 없습니다.';
        document.getElementById('joinDate').textContent = formatDate(user.created_at);
        document.getElementById('editUsername').value = user.username;
        document.getElementById('editNickname').value = user.nickname || '';
        document.getElementById('editBio').value = user.bio || '';
    }

    // ── 로그아웃 ──────────────────────────────────────
    document.getElementById('logoutBtn').addEventListener('click', async function () {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    });

    // ── 프로필 저장 ───────────────────────────────────
    document.getElementById('saveProfileBtn').addEventListener('click', async function () {
        var nickname = document.getElementById('editNickname').value.trim();
        var bio = document.getElementById('editBio').value.trim();

        try {
            var res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: nickname, bio: bio })
            });
            if (res.ok) {
                showToast('프로필이 저장되었습니다!', 'success');
                var user = await checkAuth();
                if (user) setUserInfo(user);
            } else {
                var data = await res.json();
                showToast(data.error || '저장 실패', 'error');
            }
        } catch (e) { showToast('서버 연결에 실패했습니다.', 'error'); }
    });

    // ── 비밀번호 변경 ─────────────────────────────────
    document.getElementById('changePwBtn').addEventListener('click', async function () {
        var currentPw = document.getElementById('currentPw').value;
        var newPw = document.getElementById('newPw').value;
        var newPwCheck = document.getElementById('newPwCheck').value;

        if (!currentPw || !newPw) {
            showToast('모든 비밀번호 필드를 입력해주세요.', 'error');
            return;
        }
        if (newPw.length < 4) {
            showToast('새 비밀번호는 4자 이상이어야 합니다.', 'error');
            return;
        }
        if (newPw !== newPwCheck) {
            showToast('새 비밀번호가 일치하지 않습니다.', 'error');
            return;
        }

        try {
            var res = await fetch('/api/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
            });
            var data = await res.json();
            if (res.ok) {
                showToast('비밀번호가 변경되었습니다!', 'success');
                document.getElementById('currentPw').value = '';
                document.getElementById('newPw').value = '';
                document.getElementById('newPwCheck').value = '';
            } else {
                showToast(data.error || '변경 실패', 'error');
            }
        } catch (e) { showToast('서버 연결에 실패했습니다.', 'error'); }
    });

    // ── 계정 삭제 ─────────────────────────────────────
    var deleteModal = document.getElementById('deleteModal');

    document.getElementById('deleteAccountBtn').addEventListener('click', function () {
        deleteModal.classList.add('show');
    });

    document.getElementById('cancelDeleteBtn').addEventListener('click', function () {
        deleteModal.classList.remove('show');
    });

    deleteModal.addEventListener('click', function (e) {
        if (e.target === deleteModal) deleteModal.classList.remove('show');
    });

    document.getElementById('confirmDeleteBtn').addEventListener('click', async function () {
        try {
            var res = await fetch('/api/account', { method: 'DELETE' });
            if (res.ok) {
                showToast('계정이 삭제되었습니다.', 'success');
                setTimeout(function () { window.location.href = '/login'; }, 1000);
            } else {
                var data = await res.json();
                showToast(data.error || '삭제 실패', 'error');
            }
        } catch (e) { showToast('서버 연결에 실패했습니다.', 'error'); }
        deleteModal.classList.remove('show');
    });

    // ── 초기화 ────────────────────────────────────────
    (async function init() {
        var user = await checkAuth();
        if (!user) return;
        setUserInfo(user);
    })();
})();
