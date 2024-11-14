// const express = require('express');
// const path = require('path');
// const { exec } = require('child_process');

// const app = express();
// app.use(express.json());

// // Serve static files from the "public" directory
// app.use(express.static(path.join(__dirname, 'public')));

// let scriptProcess = null;
// let waitingForParams = false;

// app.post('/start', (req, res) => {
//     if (scriptProcess) {
//         return res.json({ message: 'Скрипт вже запущений.' });
//     }

//     scriptProcess = exec(`node telegram.js`, (error, stdout, stderr) => {
//         if (error) {
//             console.error(`Помилка: ${error.message}`);
//         }
//         console.log(`Вихідні дані: ${stdout}`);
//         console.error(`Помилки: ${stderr}`);
//     });

//     waitingForParams = true;
//     res.json({ message: 'Скрипт запущено. Введіть код SMS та пароль.' });
// });

// app.post('/stop', (req, res) => {
//     if (scriptProcess) {
//         scriptProcess.kill();
//         scriptProcess = null;
//         waitingForParams = false;
//         res.json({ message: 'Скрипт зупинено!' });
//     } else {
//         res.json({ message: 'Скрипт не запущений.' });
//     }
// });

// app.post('/send-params', (req, res) => {
//     const { smsCode, password } = req.body;

//     if (!scriptProcess || !waitingForParams) {
//         return res.json({ message: 'Скрипт не запущений або не чекає параметрів.' });
//     }

//     scriptProcess.stdin.write(`${smsCode}\n`);
//     scriptProcess.stdin.write(`${password}\n`);
//     waitingForParams = false;
//     res.json({ message: 'Параметри надіслані до скрипта.' });
// });

// app.get('/status', (req, res) => {
//     res.json({ status: !!scriptProcess, waitingForParams });
// });

// const PORT = 3000;
// app.listen(PORT, () => {
//     console.log(`Сервер запущено на порту ${PORT}. Відкрийте http://localhost:${PORT} для доступу до інтерфейсу.`);
// });

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const { sendAuthDataToTelegram } = require('./telegram.js'); // Імпорт функції для передачі даних у telegram.js

app.use(bodyParser.json());

app.post('/auth', async (req, res) => {
    const { smsCode, password } = req.body;
    try {
        await sendAuthDataToTelegram(smsCode, password);
        res.sendStatus(200);
    } catch (error) {
        console.error("Помилка під час авторизації:", error);
        res.sendStatus(500);
    }
});

app.listen(3000, () => {
    console.log("Сервер запущено на порті 3000");
});
