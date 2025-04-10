// require('dotenv').config()
import 'dotenv/config';

import { Api, TelegramClient } from 'telegram';
// const { Api, TelegramClient } = require('telegram');
import { StringSession } from 'telegram/sessions/index.js';
// const { StringSession } = require('telegram/sessions');
import path from "path";
// const path = require("path");
import express from "express";
// const express = require("express");
import bodyParser from "body-parser";
// const bodyParser = require("body-parser");
const app = express();
import fs from 'fs';
const {API_ID, API_HASH, ACCESS_ID, ACCESS_SECRET, PASSWORD, PHONE, DEVICE_ID, INFO_CHANEL_NAME, LATITUDE, LONGITUDE} = process.env
const apiId = parseInt(API_ID);
const apiHash = API_HASH;
const sessionFile = './session.txt';
const stringSession = fs.existsSync(sessionFile) ? new StringSession(fs.readFileSync(sessionFile, 'utf-8')) : new StringSession('');
const PORT = process.env.PORT || 3000;
import crypto from 'crypto';
import { modPow } from 'bigint-mod-arith';

// for 2FA
async function prepareSRP(passwordInfo, password) {
  const algo = passwordInfo.currentAlgo;
  const g = BigInt(algo.g);
  const p = BigInt('0x' + algo.p.toString('hex'));
  const salt1 = algo.salt1;
  const srpB = BigInt('0x' + passwordInfo.srp_B.toString('hex'));

  // Обчислюємо хеш пароля
  const passwordHash = crypto.createHash('sha256').update(password).digest();
  const xBuffer = crypto.pbkdf2Sync(passwordHash, salt1, 100000, 64, 'sha512');
  const x = BigInt('0x' + xBuffer.toString('hex'));

  // Обчислення клієнтського ключа A з модульною експоненцією
  const A = modPow(g, x, p);

  // Обчислення параметра u
  const uHash = crypto.createHash('sha256').update(Buffer.concat([
    Buffer.from(A.toString(16).padStart(512, '0'), 'hex'),
    Buffer.from(srpB.toString(16).padStart(512, '0'), 'hex')
  ])).digest();
  const u = BigInt('0x' + uHash.toString('hex'));

  // Обчислення S
  const k = BigInt(3);
  const S = modPow((srpB - k * modPow(g, x, p)), (x + u * x), p);

  // Генерація M1
  const M1 = crypto.createHash('sha256').update(Buffer.concat([
    Buffer.from(A.toString(16).padStart(512, '0'), 'hex'),
    Buffer.from(srpB.toString(16).padStart(512, '0'), 'hex'),
    Buffer.from(S.toString(16).padStart(512, '0'), 'hex')
  ])).digest();

  return {
    A: Buffer.from(A.toString(16).padStart(512, '0'), 'hex'),
    M1: Buffer.from(M1.toString('hex'), 'hex')
  };
}

// get/send message
async function sendAndHandleMessages(client, channelName, userMessage, channelMessage) {
  try {
    await client.sendMessage("me", { message: userMessage });
    await client.sendMessage(channelName, { message: channelMessage });

    client.addEventHandler((update) => {
      if (update.message) {
        const message = update.message.message;
        console.log('channel:', update)
        console.log('Вхідне повідомлення:', message);
      }
    });

    console.log('Повідомлення успішно надіслано!');
  } catch (error) {
    console.error('Помилка під час надсилання повідомлень:', error);
  }
}
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// app.js
app.use(bodyParser.json());

// Додаємо статичну папку
app.use(express.static(path.join(__dirname, "public")));

// // Підключення маршрутів
// const indexRoutes = require('./routes/index');
// const statusRoutes = require('./routes/status');
// const authRoutes = require('./routes/auth');

// // Використання маршрутів
// app.use('/', indexRoutes);           // Головна сторінка
// app.use('/', statusRoutes);          // Сторінка статусу
// app.use('/', authRoutes);            // Логін і реєстрація

// Запуск сервера
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// Run telegram 
const client = new TelegramClient(stringSession, apiId, apiHash, {connectionRetries: 5});

(async () => {
    console.log("Loading interactive example...");
    await client.connect();

    if (!await client.isUserAuthorized()) {
      console.log('Authorization required.');

      app.post("/sendCode", async (req, res) => {
        const { phoneNumber } = req.body;
    
        try {
            const result = await client.invoke(
            new Api.auth.SendCode({
                phoneNumber,
                apiId: parseInt(process.env.API_ID),
                apiHash: apiHash,
                settings: new Api.CodeSettings({
                  allowFlashcall: true,
                  currentNumber: true,
                  allowAppHash: true,
                  allowMissedCall: true,
                }),
            })
            );
    
            console.log('RESULT:', result);
            phoneCodeHash = result.phoneCodeHash;
            res.status(200).json({ message: "Code sent successfully.", phoneNumber, phoneCodeHash: phoneCodeHash });
        } catch (error) {
            console.error("Error sending code:", error);
            res.status(422).json({ error: "Failed to send code." });
        }
    });
    
    app.post("/sign-in", async (req, res) => {
        const { code, phoneNumber, phoneCodeHash } = req.body;

        try {
            const result = await client.invoke(
                new Api.auth.SignIn({
                    phoneNumber: phoneNumber,
                    phoneCodeHash,
                    phoneCode: code,
                })
            );
    
            if (result.className === "auth.Authorization" && result.user) {
              console.log(fs.writeFileSync(sessionFile, client.session.save())); // Save this string to avoid logging in again
              console.log('Session saved to file.');
              await sendAndHandleMessages(client, INFO_CHANEL_NAME, "Hello!\n Session saved to file.", "Hello!\n Session saved to file.");    
              return res.status(200).json({
                  message: "Sign-in successful.",
                  user: {
                    id: result.user.id,
                    firstName: result.user.firstName,
                    username: result.user.username,
                  },
                });
            } else if (result.className === "auth.AuthorizationSignUpRequired") {
                return res.status(401).json({ error: "Sign-up required." });
            }

        } catch (error) {
            if (error.errorMessage === "SESSION_PASSWORD_NEEDED") {
                try {
                    const passwordInfo = await client.invoke(new Api.account.GetPassword());
                    console.log('passwordInfo:', passwordInfo);
                    const srpData = await prepareSRP(passwordInfo, PASSWORD);
                    const authResult = await client.invoke(
                        new Api.auth.CheckPassword({
                            password: new Api.InputCheckPasswordSRP({
                                srpId: passwordInfo.srpId,
                                a: srpData.A,
                                m1: srpData.M1,
                            }),
                        })
                    );
    
                    fs.writeFileSync(sessionFile, client.session.save());
                    console.log('2FA session saved successfully!');
                    await sendAndHandleMessages(client, INFO_CHANEL_NAME, "2FA Success!", "2FA Success!");

                    return res.status(200).json({
                        message: "2FA Sign-in successful.",
                        user: {
                            id: authResult.user.id,
                            firstName: authResult.user.firstName,
                            username: authResult.user.username,
                        },
                    });
                } catch (innerError) {
                    console.error("2FA Error:", innerError);
                return res.status(500).json({ error: "Failed 2FA authentication." });
                }
            }
    
            console.error("Sign-in Error:", error);
            res.status(500).json({ error: "Sign-in failed." });
          }
    });
    
    } else {
        console.log('Session restored successfully!');
        await sendAndHandleMessages(client, INFO_CHANEL_NAME, "Hello!\n Session restored successfully!", "Hello!\n Session restored successfully!");
    }

    app.get("/pageValid", async (req, res) => {
      try {
        if (await client.isUserAuthorized()) {
          return res.status(200).json({ message: "Telegram Autorized.", authorized: true });
        } else {
          return res.status(401).json({ error: "Telegram not Autorized.", authorized: false });
        };

        } catch (error) {
          console.error("Error sending code:", error);
          res.status(500).json({ error: "Failed to send code." });
      }
  });

})();
