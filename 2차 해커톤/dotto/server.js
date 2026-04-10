// server.js - Dotto Backend
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;

// ── MySQL 연결 설정 ──────────────────────────────────
// Google Colab 환경에 맞게 수정하세요
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dotto_db',
    waitForConnections: true,
    connectionLimit: 10,
};

let pool;

async function initDB() {
    pool = mysql.createPool(dbConfig);
    // 테이블 생성
    const conn = await pool.getConnection();
    try {
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                nickname VARCHAR(50) DEFAULT '',
                bio VARCHAR(200) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        await conn.query(`
            CREATE TABLE IF NOT EXISTS todos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                is_completed TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ 데이터베이스 테이블 준비 완료');
    } finally {
        conn.release();
    }
}

// ── 미들웨어 ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'dotto-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24시간
        httpOnly: true,
    }
}));

// 인증 미들웨어
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    next();
}

// ── 인증 API ──────────────────────────────────────────

// 회원가입
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
        }
        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({ error: '아이디는 3~50자로 입력해주세요.' });
        }
        if (password.length < 4) {
            return res.status(400).json({ error: '비밀번호는 4자 이상으로 입력해주세요.' });
        }

        // 중복 확인
        const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
        }

        // 비밀번호 해시
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const [result] = await pool.query(
            'INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)',
            [username, passwordHash, username]
        );

        res.status(201).json({ message: '회원가입이 완료되었습니다!' });
    } catch (err) {
        console.error('회원가입 오류:', err);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 로그인
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;

        res.json({
            message: '로그인 성공!',
            user: { id: user.id, username: user.username, nickname: user.nickname }
        });
    } catch (err) {
        console.error('로그인 오류:', err);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 로그아웃
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: '로그아웃 실패' });
        }
        res.json({ message: '로그아웃 완료' });
    });
});

// 현재 유저 정보
app.get('/api/me', requireAuth, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, username, nickname, bio, created_at FROM users WHERE id = ?',
            [req.session.userId]
        );
        if (users.length === 0) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        res.json({ user: users[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류' });
    }
});

// ── 마이페이지 API ────────────────────────────────────

// 프로필 업데이트 (닉네임, 소개)
app.put('/api/profile', requireAuth, async (req, res) => {
    try {
        const { nickname, bio } = req.body;
        await pool.query(
            'UPDATE users SET nickname = ?, bio = ? WHERE id = ?',
            [nickname || '', bio || '', req.session.userId]
        );
        res.json({ message: '프로필이 업데이트되었습니다.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 비밀번호 변경
app.put('/api/password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
        }
        if (newPassword.length < 4) {
            return res.status(400).json({ error: '새 비밀번호는 4자 이상이어야 합니다.' });
        }

        const [users] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.session.userId]);
        const match = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!match) {
            return res.status(401).json({ error: '현재 비밀번호가 일치하지 않습니다.' });
        }

        const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.session.userId]);

        res.json({ message: '비밀번호가 변경되었습니다.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 회원 탈퇴
app.delete('/api/account', requireAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.session.userId]);
        req.session.destroy();
        res.json({ message: '계정이 삭제되었습니다.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류' });
    }
});

// ── Todo API ──────────────────────────────────────────

// 할 일 목록 조회
app.get('/api/todos', requireAuth, async (req, res) => {
    try {
        const [todos] = await pool.query(
            'SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC',
            [req.session.userId]
        );
        res.json({ todos });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 할 일 추가
app.post('/api/todos', requireAuth, async (req, res) => {
    try {
        const { title } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: '할 일을 입력해주세요.' });
        }

        const [result] = await pool.query(
            'INSERT INTO todos (user_id, title) VALUES (?, ?)',
            [req.session.userId, title.trim()]
        );

        const [newTodo] = await pool.query('SELECT * FROM todos WHERE id = ?', [result.insertId]);
        res.status(201).json({ todo: newTodo[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 할 일 완료 토글
app.put('/api/todos/:id/toggle', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const [todos] = await pool.query(
            'SELECT * FROM todos WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );
        if (todos.length === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }

        const newStatus = todos[0].is_completed ? 0 : 1;
        await pool.query('UPDATE todos SET is_completed = ? WHERE id = ?', [newStatus, id]);

        res.json({ message: '상태가 변경되었습니다.', is_completed: newStatus });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 할 일 삭제
app.delete('/api/todos/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            'DELETE FROM todos WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
        }
        res.json({ message: '삭제되었습니다.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류' });
    }
});

// ── 통계 API ──────────────────────────────────────────
app.get('/api/stats', requireAuth, async (req, res) => {
    try {
        const [total] = await pool.query(
            'SELECT COUNT(*) as count FROM todos WHERE user_id = ?',
            [req.session.userId]
        );
        const [completed] = await pool.query(
            'SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND is_completed = 1',
            [req.session.userId]
        );
        const [inProgress] = await pool.query(
            'SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND is_completed = 0',
            [req.session.userId]
        );
        res.json({
            total: total[0].count,
            completed: completed[0].count,
            inProgress: inProgress[0].count
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류' });
    }
});

// ── HTML 페이지 라우트 ────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));
app.get('/todo', (req, res) => res.sendFile(path.join(__dirname, 'public', 'todo.html')));
app.get('/mypage', (req, res) => res.sendFile(path.join(__dirname, 'public', 'mypage.html')));

// ── 서버 시작 ─────────────────────────────────────────
async function start() {
    try {
        await initDB();
        app.listen(PORT, () => {
            console.log(`🟢 Dotto 서버가 포트 ${PORT}에서 실행 중입니다.`);
            console.log(`   http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ 서버 시작 실패:', err);
        process.exit(1);
    }
}

start();
