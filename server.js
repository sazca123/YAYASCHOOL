const express = require('express');
const path = require('path');
const sass = require('sass');
const fs = require('fs');
const chokidar = require('chokidar');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'media', 'news');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Установка EJS как view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// Статические файлы (важно: до других middleware)
app.use('/media', express.static(path.join(__dirname, 'media')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'css')));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка nodemailer для отправки email
// ВАЖНО: Для продакшена используйте переменные окружения для конфигурации
const SMTP_USER = process.env.MAIL_USER || "aizek90904@mail.ru";
const SMTP_PASS = process.env.MAIL_PASSWORD || "mTdFFdWrj6zg3ihjWx2v";

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({

    host: 'smtp.mail.ru',
    port: 465,
    secure: true,

    auth: {
        user: 'mr.snailman42rus@mail.ru',
        pass: 'lKpIPCYNxv0fyfbxkLJg'
    }
});

transporter.verify(function(error, success) {
    if (error) {
        console.log(error);
    } else {
        console.log("SMTP работает");
    }
});

async function sendVerificationEmail(email, code) {

    try {

        console.log('Отправляем код на:', email);

        const info = await transporter.sendMail({

            from: '"Школа 51" <mr.snailman42rus@mail.ru>',
            to: email,
            subject: 'Код подтверждения',

            html: `
                <div style="font-family:Arial;padding:20px;">
                    <h2>Подтверждение почты</h2>

                    <p>Ваш код подтверждения:</p>

                    <div style="
                        font-size:32px;
                        font-weight:bold;
                        color:#4840C0;
                        margin:20px 0;
                    ">
                        ${code}
                    </div>

                    <p>Код действует 10 минут.</p>
                </div>
            `
        });
        
        console.log(info);

        return { success: true };

    } catch (error) {

        console.error('ОШИБКА EMAIL:', error);

        return {
            success: false,
            error
        };
    }
}

// Функция для компиляции SCSS в CSS
function compileSCSS() {
  const scssDir = path.join(__dirname, 'scss');
  const cssDir = path.join(__dirname, 'css');

  // Создаём папку css если её нет
  if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir);
  }

  // Компилируем все .scss файлы
  fs.readdirSync(scssDir).forEach(file => {
    if (file.endsWith('.scss')) {
      const inputPath = path.join(scssDir, file);
      const outputPath = path.join(cssDir, file.replace('.scss', '.css'));

      try {
        const result = sass.renderSync({
          file: inputPath,
          outputStyle: 'compressed'
        });
        fs.writeFileSync(outputPath, result.css);
        console.log(`✓ Скомпилирован: ${file}`);
      } catch (err) {
        console.error(`✗ Ошибка при компиляции ${file}:`, err.message);
      }
    }
  });
}

// Следим за изменениями в scss папке
const watcher = chokidar.watch(path.join(__dirname, 'scss'), {
  persistent: true
});

watcher.on('change', (filePath) => {
  console.log(`\nИзменение в ${path.basename(filePath)}...`);
  compileSCSS();
});

// Компилируем SCSS при запуске
console.log('Компиляция SCSS...');
compileSCSS();

// Функция для работы с JSON базой данных
function readEnrollments() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'data', 'enrollments.json'), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { registered: [], unregistered: [] };
  }
}

function writeEnrollments(data) {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  fs.writeFileSync(path.join(dataDir, 'enrollments.json'), JSON.stringify(data, null, 2));
}

// Функция для работы с пользователями
function readUsers() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'data', 'users.json'), 'utf8');
    const parsed = JSON.parse(data);
    // Убеждаемся, что структура правильная
    if (!parsed || typeof parsed !== 'object') {
      return { users: [] };
    }
    if (!Array.isArray(parsed.users)) {
      parsed.users = [];
    }
    return parsed;
  } catch (err) {
    console.log('Ошибка при чтении users.json, создаем пустую структуру:', err.message);
    return { users: [] };
  }
}

function writeUsers(data) {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(data, null, 2));
}

// Функция для работы с новостями
function readNews() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'data', 'news.json'), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { news: [] };
  }
}

function writeNews(data) {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  fs.writeFileSync(path.join(dataDir, 'news.json'), JSON.stringify(data, null, 2));
}

// Маршруты
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/admin-login', (req, res) => {
  res.render('admin-login');
});

app.get('/info', (req, res) => {
  res.render('info');
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API работает!' });
});

// Функция для работы с кодами верификации
function readVerificationCodes() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'data', 'verification-codes.json'), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { codes: [] };
  }
}

function writeVerificationCodes(data) {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  fs.writeFileSync(path.join(dataDir, 'verification-codes.json'), JSON.stringify(data, null, 2));
}

function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// API для отправки кода верификации на email
app.post('/api/send-verification-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('Запрос на отправку кода верификации:', { email, body: req.body });
    
    if (!email || email.trim() === '') {
      console.log('Ошибка: Email не указан');
      return res.status(400).json({ error: 'Email не указан' });
    }
    
    const trimmedEmail = email.trim();
    
    // Проверяем формат email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      console.log('Ошибка: Некорректный формат email:', trimmedEmail);
      return res.status(400).json({ error: 'Некорректный формат email' });
    }
    
    // Проверяем, не зарегистрирован ли уже пользователь
    const usersData = readUsers();
    if (!usersData || !Array.isArray(usersData.users)) {
      console.error('Ошибка: usersData.users не является массивом:', usersData);
      usersData.users = [];
    }
    const existingUser = usersData.users.find(u => u.email && u.email.toLowerCase() === trimmedEmail.toLowerCase());
    if (existingUser) {
      console.log('Ошибка: Пользователь уже зарегистрирован:', trimmedEmail);
      return res.status(400).json({ error: 'Пользователь с таким email уже зарегистрирован' });
    }
    
    console.log('Пользователь не найден, продолжаем регистрацию');
    
    // Генерируем код верификации
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Код действителен 10 минут
    
    // Сохраняем код
    const codesData = readVerificationCodes();
    // Удаляем старые коды для этого email
    codesData.codes = codesData.codes.filter(c => c.email !== trimmedEmail);
    // Добавляем новый код
    codesData.codes.push({
      email: trimmedEmail,
      code: code,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString()
    });
    writeVerificationCodes(codesData);
    
    console.log('Код верификации сохранен, отправка email на:', trimmedEmail);
    
    // Отправляем email
    const emailResult = await sendVerificationEmail(trimmedEmail, code);
    
    if (emailResult.success) {
      res.json({ 
        success: true, 
        message: 'Код подтверждения отправлен на ваш email',
        expiresIn: 10 // минут
      });
    } else {
      res.status(500).json({ 
        error: 'Не удалось отправить email. Проверьте настройки SMTP или попробуйте позже.' 
      });
    }
  } catch (error) {
    console.error('Ошибка при отправке кода верификации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// API для проверки кода верификации
app.post('/api/verify-code', (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email и код обязательны' });
    }
    
    const codesData = readVerificationCodes();
    const verification = codesData.codes.find(
      c => c.email === email.trim() && c.code === code.toString()
    );
    
    if (!verification) {
      return res.status(400).json({ error: 'Неверный код подтверждения' });
    }
    
    const expiresAt = new Date(verification.expiresAt);
    if (new Date() > expiresAt) {
      codesData.codes = codesData.codes.filter(c => c.email !== email.trim());
      writeVerificationCodes(codesData);
      return res.status(400).json({ error: 'Код подтверждения истек. Запросите новый код.' });
    }
    
    res.json({ 
      success: true, 
      message: 'Email успешно подтвержден',
      verified: true
    });
  } catch (error) {
    console.error('Ошибка при проверке кода:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// API для регистрации — ЧИСТАЯ И РАБОЧАЯ
app.post('/api/register', (req, res) => {
  try {
    const { email, password, fullName, phone, childName, childAge } = req.body;

const role = 'student';

    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    const usersData = readUsers();

    if (usersData.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const newUser = {
      id: Date.now().toString(),
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      phone: phone.trim(),
      role,
      approved: true,
position: null,
      registeredAt: new Date().toISOString()
    };

    if (role === 'student') {
      newUser.childName = childName ? childName.trim() : null;
      newUser.childAge = childAge ? parseInt(childAge) : null;
    }

    usersData.users.push(newUser);
    writeUsers(usersData);

    res.json({ 
      success: true, 
      message: 'Регистрация прошла успешно!',
      user: { ...newUser, password: undefined }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ==================== API ДЛЯ ВХОДА ====================
// ==================== API ДЛЯ ВХОДА ====================
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Введите email и пароль' });
    }

    const usersData = readUsers();
    
    const user = usersData.users.find(u => 
      u.email && u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (user.role === 'teacher' && user.approved === false) {
      return res.status(403).json({ 
        error: 'Ваш аккаунт ещё не одобрен администратором. Ожидайте подтверждения.' 
      });
    }
    
    console.log(`Успешный вход: ${user.email} (${user.role})`);

    res.json({ 
      success: true, 
      message: 'Вход выполнен успешно!',
      user: { 
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        approved: user.approved,
        childName: user.childName,
        childAge: user.childAge
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.post('/api/enroll', (req, res) => {
  try {

    const enrollments = readEnrollments();

    const {
      category,
      userType,
      program,
      email,
      fullName,
      phone,
      childName,
      childAge
    } = req.body;

    if (!category || !userType || !program) {
      return res.status(400).json({
        error: 'Не все обязательные поля заполнены'
      });
    }

    const enrollment = {
      id: Date.now().toString(),
      category,
      userType,
      program,
      status: 'pending',
      date: new Date().toISOString()
    };

    // ================= REGISTERED =================

    if (userType === 'registered') {

      if (!email) {
        return res.status(400).json({
          error: 'Не указан email'
        });
      }

      const usersData = readUsers();

      const user = usersData.users.find(
        u => u.email.toLowerCase() === email.toLowerCase()
      );

      if (!user) {
        return res.status(404).json({
          error: 'Пользователь не найден'
        });
      }

      enrollment.email = user.email;
      enrollment.fullName = user.fullName || '';
      enrollment.phone = user.phone || '';
      enrollment.childName = user.childName || '';
      enrollment.childAge = user.childAge || '';

      enrollments.registered.push(enrollment);

    } else {

      // ================= UNREGISTERED =================

      if (
        !fullName ||
        !phone ||
        !email ||
        !childName ||
        !childAge
      ) {
        return res.status(400).json({
          error: 'Не все поля заполнены'
        });
      }

      enrollment.email = email;
      enrollment.fullName = fullName;
      enrollment.phone = phone;
      enrollment.childName = childName;
      enrollment.childAge = childAge;

      enrollments.unregistered.push(enrollment);
    }

    writeEnrollments(enrollments);

    res.json({
      success: true,
      message: 'Запись успешно добавлена',
      enrollment
    });

  } catch (error) {

    console.error('Ошибка при записи:', error);

    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Вспомогательная функция проверки админа
function checkAdmin(req, res) {
  const adminEmailRaw = req.query.adminEmail || req.body.adminEmail;
  const adminPasswordRaw = req.query.adminPassword || req.body.adminPassword;

  // Support array values coming from form submissions; take the last value
  const adminEmail = Array.isArray(adminEmailRaw) ? adminEmailRaw[adminEmailRaw.length - 1] : adminEmailRaw;
  const adminPassword = Array.isArray(adminPasswordRaw) ? adminPasswordRaw[adminPasswordRaw.length - 1] : adminPasswordRaw;

  // Normalize common "missing" representations to null
  const normalize = (v) => {
    if (typeof v !== 'string') return v;
    const t = v.trim().toLowerCase();
    if (t === '' || t === 'null' || t === 'undefined') return null;
    return v.trim();
  };

  const email = normalize(adminEmail);
  const password = normalize(adminPassword);

  if (!email || !password) {
    res.status(401).json({ error: 'Доступ запрещен. Требуется аутентификация администратора.' });
    return false;
  }

  const usersData = readUsers();
  const admin = usersData.users.find(u => u.email === email && u.password === password && u.role === 'admin');

  if (!admin) {
    res.status(401).json({ error: 'Доступ запрещен. Неверные учетные данные администратора.' });
    return false;
  }
  return true;
}

// Страница админ панели
app.get('/admin', (req, res) => {
  const { adminEmail, adminPassword } = req.query;

  const normalizeAdminValue = (value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (lower === 'null' || lower === 'undefined') return null;
    return trimmed;
  };

  const normalizedEmail = normalizeAdminValue(adminEmail);
  const normalizedPassword = normalizeAdminValue(adminPassword);

  if (!normalizedEmail || !normalizedPassword) {
    return res.render('admin', { 
      adminName: null,
      error: 'Требуется аутентификация. Используйте параметры adminEmail и adminPassword в URL'
    });
  }
  
  const usersData = readUsers();
  const admin = usersData.users.find(u => u.email === normalizedEmail && u.password === normalizedPassword && u.role === 'admin');
  
  if (!admin) {
    return res.status(401).render('admin', { 
      adminName: null,
      error: 'Доступ запрещен. Неверные учетные данные администратора.'
    });
  }
  
  res.render('admin', { adminName: admin.fullName });
});

// API для получения всех записей (защищено)
app.get('/api/admin/enrollments', (req, res) => {
  const { adminEmail, adminPassword } = req.query;
  
  if (!adminEmail || !adminPassword) {
    return res.status(401).json({ error: 'Доступ запрещен. Требуется аутентификация администратора.' });
  }
  
  const usersData = readUsers();
  const admin = usersData.users.find(u => u.email === adminEmail && u.password === adminPassword && u.role === 'admin');
  
  if (!admin) {
    return res.status(401).json({ error: 'Доступ запрещен. Неверные учетные данные администратора.' });
  }
  
  const enrollments = readEnrollments();
  res.json(enrollments);
});

// API для обновления статуса записи (защищено)
app.post('/api/admin/update-enrollment', (req, res) => {
  const { adminEmail, adminPassword, id, type, status } = req.body;
  
  if (!adminEmail || !adminPassword) {
    return res.status(401).json({ error: 'Доступ запрещен. Требуется аутентификация администратора.' });
  }
  
  const usersData = readUsers();
  const admin = usersData.users.find(u => u.email === adminEmail && u.password === adminPassword && u.role === 'admin');
  
  if (!admin) {
    return res.status(401).json({ error: 'Доступ запрещен. Неверные учетные данные администратора.' });
  }
  
  if (!id || !type || !status) {
    return res.status(400).json({ error: 'Не все поля заполнены' });
  }
  
  const enrollments = readEnrollments();
  
  if (type === 'registered') {
    const index = enrollments.registered.findIndex(e => e.id === id);
    if (index !== -1) {
      enrollments.registered[index].status = status;
      writeEnrollments(enrollments);
      return res.json({ success: true, message: 'Запись обновлена' });
    }
  } else if (type === 'unregistered') {
    const index = enrollments.unregistered.findIndex(e => e.id === id);
    if (index !== -1) {
      enrollments.unregistered[index].status = status;
      writeEnrollments(enrollments);
      return res.json({ success: true, message: 'Запись обновлена' });
    }
  }
  
  res.status(404).json({ error: 'Запись не найдена' });
});

// API для проверки учетных данных администратора
app.post('/api/admin/verify', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }
    
    const usersData = readUsers();
    const admin = usersData.users.find(u => 
      u.email === email && 
      u.password === password && 
      u.role === 'admin'
    );
    
    if (!admin) {
      return res.status(401).json({ error: 'Неверный email или пароль администратора' });
    }
    
    res.json({ 
      success: true, 
      message: 'Аутентификация успешна',
      adminName: admin.fullName
    });
  } catch (error) {
    console.error('Ошибка при проверке администратора:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// API для создания новости
app.post('/api/admin/create-news', upload.single('image'), (req, res) => {
  try {
    let adminEmail = req.body.adminEmail;
    let adminPassword = req.body.adminPassword;
    const { title, description } = req.body;

    if (Array.isArray(adminEmail)) adminEmail = adminEmail[adminEmail.length-1];
    if (Array.isArray(adminPassword)) adminPassword = adminPassword[adminPassword.length-1];

    if (!adminEmail || !adminPassword) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(401).json({ error: 'Доступ запрещен.' });
    }

    const usersData = readUsers();
    const admin = usersData.users.find(u => u.email === adminEmail && u.password === adminPassword && u.role === 'admin');
    if (!admin) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(401).json({ error: 'Неверные учетные данные администратора.' });
    }

    if (!title || !description || !req.file) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Заполните все поля и добавьте фото' });
    }

    const newsData = readNews();
    const newsItem = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      image: `/media/news/${req.file.filename}`,
      createdAt: new Date().toISOString()
    };

    newsData.news.unshift(newsItem);
    writeNews(newsData);

    res.json({ success: true, message: 'Новость успешно создана' });
  } catch (error) {
    console.error('Ошибка создания новости:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// API для получения всех новостей (ЗАМЕНИ НА ЭТО)
app.get('/api/admin/news', (req, res) => {
  try {
    const adminEmail = req.query.adminEmail;
    const adminPassword = req.query.adminPassword;

    console.log('=== GET NEWS DEBUG ===');
    console.log('adminEmail:', adminEmail);

    if (!adminEmail || !adminPassword) {
      return res.status(401).json({ error: 'Доступ запрещен. Требуется аутентификация.' });
    }
    
    const usersData = readUsers();
    const admin = usersData.users.find(u => 
      u.email === adminEmail && 
      u.password === adminPassword && 
      u.role === 'admin'
    );
    
    if (!admin) {
      return res.status(401).json({ error: 'Доступ запрещен. Неверные учетные данные администратора.' });
    }
    
    const newsData = readNews();
    res.json(newsData);
  } catch (error) {
    console.error('Ошибка при получении новостей:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// API для редактирования новости
app.post('/api/admin/edit-news', upload.single('image'), (req, res) => {
  try {
    let adminEmail = req.body.adminEmail;
    let adminPassword = req.body.adminPassword;
    const { newsId, title, description } = req.body;

    if (Array.isArray(adminEmail)) adminEmail = adminEmail[adminEmail.length-1];
    if (Array.isArray(adminPassword)) adminPassword = adminPassword[adminPassword.length-1];

    if (!adminEmail || !adminPassword || !newsId) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(401).json({ error: 'Доступ запрещен.' });
    }

    const usersData = readUsers();
    const admin = usersData.users.find(u => u.email === adminEmail && u.password === adminPassword && u.role === 'admin');
    if (!admin) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(401).json({ error: 'Неверные учетные данные.' });
    }

    const newsData = readNews();
    const index = newsData.news.findIndex(n => n.id === newsId);
    if (index === -1) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Новость не найдена' });
    }

    const oldNews = newsData.news[index];

    newsData.news[index] = {
      ...oldNews,
      title: title ? title.trim() : oldNews.title,
      description: description ? description.trim() : oldNews.description,
    };

    if (req.file) {
      const oldPath = path.join(__dirname, 'media', 'news', path.basename(oldNews.image));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      newsData.news[index].image = `/media/news/${req.file.filename}`;
    }

    writeNews(newsData);
    res.json({ success: true, message: 'Новость успешно обновлена' });
  } catch (error) {
    console.error('Ошибка редактирования:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// API для удаления новости (защищено)
app.post('/api/admin/delete-news', (req, res) => {
  try {
    const { adminEmail, adminPassword, newsId } = req.body;
    
    if (!adminEmail || !adminPassword) {
      return res.status(401).json({ error: 'Доступ запрещен. Требуется аутентификация администратора.' });
    }
    
    const usersData = readUsers();
    const admin = usersData.users.find(u => u.email === adminEmail && u.password === adminPassword && u.role === 'admin');
    
    if (!admin) {
      return res.status(401).json({ error: 'Доступ запрещен. Неверные учетные данные администратора.' });
    }
    
    if (!newsId) {
      return res.status(400).json({ error: 'ID новости обязателен' });
    }
    
    const newsData = readNews();
    const newsIndex = newsData.news.findIndex(n => n.id === newsId);
    
    if (newsIndex === -1) {
      return res.status(404).json({ error: 'Новость не найдена' });
    }
    
    const deletedNews = newsData.news[newsIndex];
    newsData.news.splice(newsIndex, 1);
    writeNews(newsData);
    
    // Удаляем файл изображения
    const imagePath = path.join(__dirname, 'media', 'news', path.basename(deletedNews.image));
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    res.json({ success: true, message: 'Новость успешно удалена' });
  } catch (error) {
    console.error('Ошибка при удалении новости:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ==================== КАБИНЕТ ПРЕПОДАВАТЕЛЯ ====================
app.get('/teacher/dashboard', (req, res) => {
    const userStr = req.query.user;
    if (!userStr) return res.redirect('/');

    try {
        let user = JSON.parse(decodeURIComponent(userStr));
        if (user.role !== 'teacher') return res.redirect('/');

        // Загружаем свежие данные пользователя
        const usersData = readUsers();
        const freshUser = usersData.users.find(u => u.id === user.id);
        if (freshUser) user = freshUser;

        const enrollmentsData = readEnrollments();

        // Фильтруем учеников по назначенному кружку преподавателя
        let myEnrollments = [];

        if (user.assignedProgram) {
    myEnrollments = [
        ...enrollmentsData.registered.filter(
            e =>
                e.program === user.assignedProgram &&
                e.status === 'pending'
        ),
        ...enrollmentsData.unregistered.filter(
            e =>
                e.program === user.assignedProgram &&
                e.status === 'pending'
        )
    ];
}

        res.render('teacher/dashboard', { 
            user: user,
            enrollments: myEnrollments
        });
    } catch (e) {
        console.error(e);
        res.redirect('/');
    }
});

// ==================== ВСЕ УЧЕНИКИ ПРЕПОДАВАТЕЛЯ ====================

app.get('/teacher/students', (req, res) => {

    const userStr = req.query.user;

    if (!userStr) {
        return res.redirect('/');
    }

    try {

        let user = JSON.parse(
            decodeURIComponent(userStr)
        );

        if (user.role !== 'teacher') {
            return res.redirect('/');
        }

        const usersData = readUsers();

        const freshUser = usersData.users.find(
            u => u.id === user.id
        );

        if (freshUser) {
            user = freshUser;
        }

        const enrollmentsData = readEnrollments();

        let confirmedStudents = [];

        if (user.assignedProgram) {

            confirmedStudents = enrollmentsData.registered.filter(
                e =>
                    e.program === user.assignedProgram &&
                    e.status === 'confirmed'
            );

        }

        res.render('teacher/students', {

            user,
            students: confirmedStudents

        });

    } catch (err) {

        console.error(err);

        res.redirect('/');

    }

});

// API для получения списка преподавателей
app.get('/api/admin/teachers', (req, res) => {
  const adminEmailRaw = req.query.adminEmail;
  const adminPasswordRaw = req.query.adminPassword;

  // Debug: show incoming raw values (do not log passwords in production)
  console.log('GET /api/admin/teachers - raw adminEmail:', adminEmailRaw, 'raw adminPassword:', adminPasswordRaw ? '***' : '(none)');

  if (!checkAdmin(req, res)) {
    console.log('GET /api/admin/teachers - admin check failed');
    return;
  }

  // If checkAdmin passed, log which admin was used (email only)
  const usersData = readUsers();
  const admin = usersData.users.find(u => u.email === (Array.isArray(adminEmailRaw) ? adminEmailRaw[adminEmailRaw.length-1] : adminEmailRaw));
  console.log('GET /api/admin/teachers - authenticated admin:', admin ? admin.email : '(unknown)');

  const teachers = usersData.users.filter(u => u.role === 'teacher');
  res.json({ teachers });
});

// API для одобрения/отклонения преподавателя
app.post('/api/admin/update-teacher', (req, res) => {
    if (!checkAdmin(req, res)) return;

    const { id, approved } = req.body;
    const usersData = readUsers();
    
    const teacher = usersData.users.find(u => u.id === id && u.role === 'teacher');
    if (teacher) {
        teacher.approved = approved;
        writeUsers(usersData);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Преподаватель не найден' });
    }
});

// Обновление должности преподавателя
app.post('/api/admin/update-teacher-position', (req, res) => {
    if (!checkAdmin(req, res)) return;

    const { id, position } = req.body;
    const usersData = readUsers();
    
    const teacher = usersData.users.find(u => u.id === id && u.role === 'teacher');
    if (teacher) {
        teacher.position = position.trim();
        writeUsers(usersData);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Преподаватель не найден' });
    }
});

// Обновление назначенного кружка преподавателю
app.post('/api/admin/update-teacher-program', (req, res) => {
    if (!checkAdmin(req, res)) return;

    const { id, assignedProgram } = req.body;
    const usersData = readUsers();
    
    const teacher = usersData.users.find(u => u.id === id && u.role === 'teacher');
    if (teacher) {
        teacher.assignedProgram = assignedProgram || null;
        writeUsers(usersData);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Преподаватель не найден' });
    }
});

// Публичный API — получение последних новостей (для главной страницы)
app.get('/api/news/latest', (req, res) => {
  try {
    const newsData = readNews();
    
    // Возвращаем только последние 6 новостей
    const latestNews = newsData.news.slice(0, 6);
    
    res.json({ news: latestNews });
  } catch (error) {
    console.error('Ошибка при получении новостей для главной:', error);
    res.status(500).json({ news: [] });
  }
});

// ==================== РАСПИСАНИЕ ====================

function readSchedules() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'data', 'schedules.json'), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { schedules: [] };
  }
}

function writeSchedules(data) {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  fs.writeFileSync(path.join(dataDir, 'schedules.json'), JSON.stringify(data, null, 2));
}

// API получения расписания
app.get('/api/schedules', (req, res) => {
  try {
    const schedulesData = readSchedules();
    res.json(schedulesData);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки расписания' });
  }
});

// Обновление расписания
app.post('/api/schedules/update', (req, res) => {
  try {
    const { program, schedule, room, teacherEmail } = req.body;
    if (!program || !schedule) return res.status(400).json({ error: 'Программа и расписание обязательны' });
    
    const schedulesData = readSchedules();
    let item = schedulesData.schedules.find(s => s.program === program);
    
    if (item) {
      item.schedule = schedule;
      if (room) item.room = room;
      if (teacherEmail) item.teacher = teacherEmail;
    } else {
      schedulesData.schedules.push({ program, schedule, room: room || 'Не указано', teacher: teacherEmail });
    }
    
    writeSchedules(schedulesData);
    res.json({ success: true, message: 'Расписание обновлено' });
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка' });
  }
});

// ==================== СОХРАНЕНИЕ РАСПИСАНИЯ ====================

app.post('/api/teacher/update-schedule', (req, res) => {

    try {

        const { teacherId, schedule } = req.body;

        const usersData = readUsers();

        const teacher = usersData.users.find(
            u => u.id === teacherId && u.role === 'teacher'
        );

        if (!teacher) {

            return res.status(404).json({
                error: 'Преподаватель не найден'
            });
        }

        teacher.schedule = schedule;

        writeUsers(usersData);

        res.json({
            success: true
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Ошибка сервера'
        });
    }
});

// ==================== КАБИНЕТ РОДИТЕЛЯ ====================

app.get('/parent/parent-dashboard', (req, res) => {

    const userStr = req.query.user;

    if (!userStr) {
        return res.redirect('/');
    }

    try {

        const user = JSON.parse(
            decodeURIComponent(userStr)
        );

        if (user.role !== 'student') {
            return res.redirect('/');
        }

        const enrollmentsData = readEnrollments();

        const usersData = readUsers();

        // Ищем записи родителя
        const myEnrollments = enrollmentsData.registered.filter(
            e => e.email === user.email
        );

        // Добавляем преподавателя и расписание
        const enrollmentsWithTeachers = myEnrollments.map(enr => {

            const teacher = usersData.users.find(
                u =>
                    u.role === 'teacher' &&
                    u.assignedProgram === enr.program
            );

            return {

                ...enr,

                teacherName: teacher
                    ? teacher.fullName
                    : 'Не назначен',

                schedule: teacher
    ? teacher.schedule || []
    : []

            };
        });

        res.render('parent/parent-dashboard', {

            user,
            enrollments: enrollmentsWithTeachers

        });

    } catch (err) {

        console.error(err);

        res.redirect('/');

    }
});

// ==================== ИЗМЕНЕНИЕ СТАТУСА ЗАПИСИ ====================

app.post('/api/teacher/update-enrollment-status', (req, res) => {

    try {

        const { enrollmentId, status } = req.body;

        const enrollmentsData = readEnrollments();

        let enrollment = enrollmentsData.registered.find(
            e => e.id === enrollmentId
        );

        if (!enrollment) {

            enrollment = enrollmentsData.unregistered.find(
                e => e.id === enrollmentId
            );
        }

        if (!enrollment) {

            return res.status(404).json({
                error: 'Запись не найдена'
            });
        }

        enrollment.status = status;

        writeEnrollments(enrollmentsData);

        res.json({
            success: true
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Ошибка сервера'
        });
    }
});

app.post('/api/admin/create-teacher', (req, res) => {

    try {

        const {
            fullName,
            email,
            phone,
            password,
            adminEmail,
            adminPassword
        } = req.body;

        const usersData = readUsers();

        const admin = usersData.users.find(u =>
            u.email === adminEmail &&
            u.password === adminPassword &&
            u.role === 'admin'
        );

        if (!admin) {
            return res.status(403).json({
                error: 'Нет доступа'
            });
        }

        const existingUser = usersData.users.find(u =>
            u.email.toLowerCase() === email.toLowerCase()
        );

        if (existingUser) {
            return res.status(400).json({
                error: 'Пользователь уже существует'
            });
        }

        const teacher = {

            id: Date.now().toString(),

            email: email.trim().toLowerCase(),

            password,

            fullName,

            phone,

            role: 'teacher',

            approved: true,

            assignedProgram: null,

            position: null,

            registeredAt: new Date().toISOString()
        };

        usersData.users.push(teacher);

        writeUsers(usersData);

        res.json({
            success: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Ошибка сервера'
        });

    }

});

app.get('/', (req, res) => {
    res.render('index');
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`\n🚀 Сервер запущен: http://localhost:${PORT}`);
  console.log('📁 SCSS папка мониторится на изменения...\n');
  console.log('🔐 Админ панель: http://localhost:${PORT}/admin?adminEmail=admin@alexander.ru&adminPassword=admin123\n');
});

