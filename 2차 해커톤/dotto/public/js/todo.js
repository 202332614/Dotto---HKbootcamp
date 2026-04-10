// todo.js — 할 일 관리 페이지 로직

(function () {
    'use strict';

    function showToast(msg, type) {
        var t = document.getElementById('toast');
        t.textContent = msg;
        t.className = 'toast ' + type + ' show';
        setTimeout(function () { t.classList.remove('show'); }, 3000);
    }

    function formatTime(dateStr) {
        var d = new Date(dateStr);
        var h = d.getHours();
        var m = d.getMinutes();
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    function getKoreanDate() {
        var d = new Date();
        var days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + days[d.getDay()];
    }

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
    }

    document.getElementById('logoutBtn').addEventListener('click', async function () {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    });

    function updateStats(todos) {
        var total = todos.length;
        var completed = 0;
        for (var i = 0; i < todos.length; i++) {
            if (todos[i].is_completed) completed++;
        }
        var inProgress = total - completed;

        document.getElementById('statTotal').textContent = total;
        document.getElementById('statCompleted').textContent = completed;
        document.getElementById('statInProgress').textContent = inProgress;

        var pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        document.getElementById('progressPercent').textContent = pct + '%';
        document.getElementById('progressText').textContent = completed + '/' + total;

        var circumference = 2 * Math.PI * 34;
        var offset = circumference - (pct / 100) * circumference;
        var ring = document.getElementById('progressRing');
        ring.style.strokeDasharray = circumference;
        ring.style.strokeDashoffset = offset;
    }

    function createTodoItem(todo) {
        var div = document.createElement('div');
        div.className = 'todo-item' + (todo.is_completed ? ' completed' : '');

        var checkbox = document.createElement('div');
        checkbox.className = 'todo-checkbox' + (todo.is_completed ? ' checked' : '');
        checkbox.addEventListener('click', function () { toggleTodo(todo.id); });

        var text = document.createElement('span');
        text.className = 'todo-text';
        text.textContent = todo.title;

        var time = document.createElement('span');
        time.className = 'todo-time';
        time.textContent = formatTime(todo.created_at);

        var del = document.createElement('button');
        del.className = 'todo-delete';
        del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        del.addEventListener('click', function () { deleteTodo(todo.id); });

        div.appendChild(checkbox);
        div.appendChild(text);
        div.appendChild(time);
        div.appendChild(del);
        return div;
    }

    function renderTodos(todos) {
        var ipList = document.getElementById('inProgressList');
        var cList = document.getElementById('completedList');
        ipList.innerHTML = '';
        cList.innerHTML = '';
        var ipCount = 0, cCount = 0;

        for (var i = 0; i < todos.length; i++) {
            var item = createTodoItem(todos[i]);
            if (todos[i].is_completed) { cList.appendChild(item); cCount++; }
            else { ipList.appendChild(item); ipCount++; }
        }

        document.getElementById('inProgressCount').textContent = ipCount;
        document.getElementById('completedCount').textContent = cCount;

        if (ipCount === 0) {
            ipList.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg><p>진행 중인 할 일이 없습니다</p></div>';
        }
        updateStats(todos);
    }

    async function loadTodos() {
        try {
            var res = await fetch('/api/todos');
            if (!res.ok) throw new Error();
            var data = await res.json();
            renderTodos(data.todos);
        } catch (e) { showToast('할 일을 불러오지 못했습니다.', 'error'); }
    }

    async function addTodo() {
        var input = document.getElementById('todoInput');
        var title = input.value.trim();
        if (!title) { input.focus(); return; }
        try {
            var res = await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title })
            });
            if (!res.ok) { var err = await res.json(); showToast(err.error || '추가 실패', 'error'); return; }
            input.value = '';
            await loadTodos();
            showToast('할 일이 추가되었습니다!', 'success');
        } catch (e) { showToast('서버 연결에 실패했습니다.', 'error'); }
    }

    async function toggleTodo(id) {
        try {
            await fetch('/api/todos/' + id + '/toggle', { method: 'PUT' });
            await loadTodos();
        } catch (e) { showToast('상태 변경 실패', 'error'); }
    }

    async function deleteTodo(id) {
        try {
            await fetch('/api/todos/' + id, { method: 'DELETE' });
            await loadTodos();
            showToast('삭제되었습니다.', 'success');
        } catch (e) { showToast('삭제 실패', 'error'); }
    }

    document.getElementById('addTodoBtn').addEventListener('click', addTodo);
    document.getElementById('todoInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') addTodo();
    });

    document.getElementById('currentDate').textContent = getKoreanDate();

    (async function init() {
        var user = await checkAuth();
        if (!user) return;
        setUserInfo(user);
        await loadTodos();
    })();
})();
