import dotenv from 'dotenv';
dotenv.config();
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import Session from '../models/sessionModel.js';
import { prepareSRP } from '../utils/srpHelper.js';
import { sendAndHandleMessages } from '../utils/telegramUtils.js';
import User from '../models/userModel.js';
// import { message } from 'telegram-mtproto/lib/mtproto.js';

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const INFO_CHANEL_NAME = process.env.INFO_CHANEL_NAME;
let client;

async function saveSession(userId) {
  const sessionString = client.session.save();
  await Session.findOneAndUpdate(
    { userId },
    { session: sessionString },
    { upsert: true }
  );
}

async function initializeClient(id) {
  const user = await User.findById(id);
  const sessionData = await Session.findOne({ userId: user._id });
  const stringSession = sessionData ? new StringSession(sessionData.session) : new StringSession('');

  client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  await client.connect();
  console.log('Telegram Client Initialized');

  if (await client.isUserAuthorized()) {
    console.log('Сесія успішно відновлена');
    await sendAndHandleMessages(client, process.env.INFO_CHANEL_NAME, 
                                "Сесія відновлена успішно", 
                                "Користувач повернувся до системи.",
                                user);
    return true;
  } else {
    console.log('SESSION: sesion not restored!')
    return false;
  };
}

async function sendCode(req, res) {
  try {
    console.log('sendCode:', true);
    const user = await User.findById(req.user._id);
    const sessionData = await Session.findOne({ userId: user._id });
    const stringSession = sessionData ? new StringSession(sessionData.session) : new StringSession('');
  
    client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
    await client.connect();
    console.log('Telegram Client Initialized');
  
    if (await client.isUserAuthorized()) {
      console.log('SESSION: Сесія успішно відновлена');
      await sendAndHandleMessages(client, process.env.INFO_CHANEL_NAME, 
                                  "Сесія відновлена успішно", 
                                  "Користувач повернувся до системи.",
                                  user);
      return res.status(200).json({ authorized: true, message: 'Сесія відновлена успішно!' });
    } else {
      console.log('SESSION: sesion not restored!')
    };

    const phoneNumber = user.phoneNumber;
    console.log('USER:', user)

    if (!phoneNumber) {
      return res.status(422).json({ error: 'Could you please add phone number to your account!' });
    };

    const result = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber,
        apiId,
        apiHash,
        settings: new Api.CodeSettings({
          allowFlashcall: true,
          currentNumber: true,
          allowAppHash: true,
          allowMissedCall: true,
        }),
      })
    );
    console.log('RESULT:', result); //remove
    console.log('USER:', user)

    res.status(200).json({ phoneCodeHash: result.phoneCodeHash, phoneNumber, message: 'Code sent successfully' });
  } catch (error) {
    console.log('ERROR:', error); //remove
    res.status(500).json({ error: 'Failed to send code' });
  }
};

async function signIn(req, res) {
  try {
    const user = await User.findById(req.user._id);
    const phoneNumber = user.phoneNumber;
    const { phoneCodeHash, code } = req.body;

    if (!phoneNumber || !phoneCodeHash || !code) {
      console.log('send:', false);

      return res.status(422).json({
        error: 'Missing required data',
        details: {
          phoneNumber: phoneNumber ? 'present' : 'missing',
          phoneCodeHash: phoneCodeHash ? 'present' : 'missing',
          code: code ? 'present' : 'missing',
        },
        authorized: false,
      });
    };

    console.log('send:', true);

    const result = await client.invoke(
      new Api.auth.SignIn({ phoneNumber, phoneCodeHash, phoneCode: code })
    );

    console.log('GET CODE RESULT:', result);

    if (result.className === "auth.Authorization" && result.user) {
      saveSession(user._id);
      await sendAndHandleMessages(client, INFO_CHANEL_NAME, "Hello!\n Session saved to file.", "Hello!\n Session saved to file.", user);

      return res.status(200).json({ message: 'Sign-in successful', user: result.user, authorized: true });
    } else {
      console.log('Error:', result);
      return res.status(401).json({ error: 'Sign-in failed', authorized: false });
    }
  } catch (error) {
    if (error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      try {
        const user = await User.findById(req.user._id);
        const passwordInfo = await client.invoke(new Api.account.GetPassword());
        const srpData = await prepareSRP(passwordInfo, process.env.PASSWORD);
        const authResult = await client.invoke(
          new Api.auth.CheckPassword({
            password: new Api.InputCheckPasswordSRP({
              srpId: passwordInfo.srpId,
              a: srpData.A,
              m1: srpData.M1,
            }),
          })
        );

        saveSession(user._id);

        res.status(200).json({ message: '2FA Sign-in successful', user: authResult.user });
      } catch (innerError) {
        console.error('2FA Error:', innerError);
        res.status(500).json({ error: '2FA authentication failed' });
      }
    } else {
      res.status(500).json({ error: 'Sign-in failed' });
    }
  }
};

async function checkSession(req, res) {
  console.log('checkSession:', true);

  try {
    const isAuthorized = await client?.isUserAuthorized();
    
    console.log('isAuthorized:', isAuthorized);
    if (isAuthorized){
      res.status(200).json({ authorized: isAuthorized, message: 'Telegram authorized' });
    } else if (await initializeClient(req.user._id)) {
      res.status(200).json({ authorized: true, message: 'Telegram authorized' });
    } else {
      res.status(401).json({ message: 'Telegram not authorize', authorized: false });
    };

  } catch (error) {
    console.error('Error checking session:', error);
    res.status(500).json({ error: 'Failed to check session' });
  }
};

async function getClient() {
  try {
    const isAuthorized = await client?.isUserAuthorized();

    if (isAuthorized){
      return client;
    } else if (await initializeClient(req.user._id)) {
      return client;
    } else {
      return null;
    };

  } catch (error) {
    console.error('Client Error:', error);
  }
}

export { initializeClient, sendCode, signIn, checkSession, getClient };
