import dotenv from 'dotenv';
dotenv.config();
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import Session from '../models/sessionModel.js';
import { prepareSRP } from '../utils/srpHelper.js';
import { sendAndHandleMessages } from '../utils/telegramUtils.js';
import User from '../models/userModel.js';
import Telegram from '../models/telegramModel.js';
import { t } from '../i18n.js';
// import { message } from 'telegram-mtproto/lib/mtproto.js';

// const apiId = parseInt(process.env.API_ID);
// const apiHash = process.env.API_HASH;
// const INFO_CHANEL_NAME = process.env.INFO_CHANEL_NAME;
let client;

async function show(req, res) {
  try {
    const user = await User.findById(req.user._id);
    const telegram = await Telegram.findOne({ userId: user._id });
    if (!telegram) {
      return res.status(404).json({ error: t('telegram.errors.not_found') });
    };

    if (telegram.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: t('telegram.errors.authorized') });
    };

    telegram.apiId = telegram.getDecryptedApiId();
    telegram.apiHash = telegram.getDecryptedApiHash()

    res.status(200).json({ message: t('telegram.success.retrieved'), telegram });
  } catch (error) {
    console.error(t('telegram.errors.retrieve_failed', {error: error}));
    res.status(422).json({ error: t('telegram.errors.retrieve_failed', {error: error}) });
  }
};

async function create(req, res) {
  try {
    const user = await User.findById(req.user._id);
    const existingTelegram = await Telegram.findOne({ userId: user._id });
    if (existingTelegram) {
      return res.status(409).json({ error: t('telegram.exists') });
    };

    const { apiId, apiHash, channel } = req.body;
    if (!channel || !apiId || !apiHash) {
      return res.status(422).json({ error: t('errors.missing.data') });
    };

    const telegram = await Telegram.create({ apiId, apiHash, channel, userId: user._id });
    res.status(201).json({ message: t('telegram.success.create'), telegram });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ error: t('telegram.errors.dublication', {duplicateField: duplicateField}), field: duplicateField });
    };
    console.error(t('telegram.errors.creat', {error: error}));
    res.status(422).json({ error: t('telegram.errors.creat', {error: error}) });
  }
};

async function update(req, res) {
  try {
    const user = await User.findById(req.user._id);
    const telegram = await Telegram.findOne({ userId: user._id });
    if (!telegram) {
      console.error(t('telegram.errors.not_found'));
      return res.status(404).json({ error: t('telegram.errors.not_found') });
    };

    const { channel, apiId, apiHash } = req.body;
    const updateFields = {};
    if (channel) updateFields.channel = channel;
    if (apiId) updateFields.apiId = apiId;
    if (apiHash) updateFields.apiHash = apiHash;

    if (Object.keys(updateFields).length === 0) {
      return res.status(422).json({ error: t('telegram.errors.nothing_to_update') });
    };

    const updateData = await Telegram.findByIdAndUpdate(telegram.id, updateFields, { new: true });
    if (!updateData) {
      return res.status(404).json({ error: t('telegram.errors.updated') });
    }

    res.status(200).json({ message: t('telegram.success.update'), telegram: updateData });
  } catch (error) {
    console.error(t('telegram.errors.failed_update', {error: error}));
    res.status(422).json({ error: t('telegram.errors.failed_update', {error: error})});
  }
};

async function remove(req, res) {
  try {
    const user = await User.findById(req.user._id);
    const telegram = await Telegram.findById(req.params.id); 

    if (!telegram) {
      return res.status(404).json({ error: t('telegram.errors.not_found') });
    };

    if (telegram.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: t('telegram.errors.authorize_delete') });
    };

    await telegram.deleteOne();
    res.status(200).json({ message: t('telegram.success.delete') });
  } catch (error) {
    console.error(t('telegram.errors.delete', {error: error}));
    res.status(422).json({ error: t('telegram.errors.delete', {error: error}) });
  };s
};

//////////////////////////////////////
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

  const telegram = await Telegram.findOne({ userId: user._id });
  if (!telegram) {
    return t('telegram.errors.not_found');
  };

  const apiId = telegram.getDecryptedApiId();
  const apiHash = telegram.getDecryptedApiHash();
  const INFO_CHANEL_NAME = telegram.channel;

  client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  await client.connect();
  console.log(t('telegram.success.initialized'));

  if (await client.isUserAuthorized()) {
    console.log(t('telegram.success.session'));
    await sendAndHandleMessages(client, INFO_CHANEL_NAME, 
                                t('telegram.success.session'), 
                                t('telegram.success.come_back_user'),
                                user);
    return true;
  } else {
    console.error(t('telegram.errors.sesion'))
    return false;
  };
}

async function sendCode(req, res) {
  try {
    console.log('sendCode:', true);
    const user = await User.findById(req.user._id);
    const sessionData = await Session.findOne({ userId: user._id });
    const stringSession = sessionData ? new StringSession(sessionData.session) : new StringSession('');
    const telegram = await Telegram.findOne({ userId: user._id });

    if (!telegram) {
      return res.status(404).json({ error: t('telegram.errors.not_found') });
    };

    const apiId = telegram.getDecryptedApiId();
    const apiHash = telegram.getDecryptedApiHash();
    const INFO_CHANEL_NAME = telegram.channel;

    client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
    await client.connect();
    console.log(t('telegram.success.initialized'));
  
    if (await client.isUserAuthorized()) {
      console.log(t('telegram.success.session'));
      await sendAndHandleMessages(client, INFO_CHANEL_NAME, 
                                  t('telegram.success.session'), 
                                  t('telegram.success.come_back_user'),
                                  user);
      return res.status(200).json({ authorized: true, message: t('telegram.success.session') });
    } else {
      console.error(t('telegram.errors.sesion'))
    };

    const phoneNumber = user.phoneNumber;
    console.log('USER:', user)

    if (!phoneNumber) {
      return res.status(422).json({ error: t('add_phone') });
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

    res.status(200).json({ phoneCodeHash: result.phoneCodeHash, phoneNumber, message: 'Code sent successfully' });
  } catch (error) {
    console.error(t('errors.send_code', {error: error}));
    res.status(422).json({ error: t('errors.send_code', {error: error}) });
  }
};

async function signIn(req, res) {
  try {
    const user = await User.findById(req.user._id);
    const phoneNumber = user.phoneNumber;
    const { phoneCodeHash, code } = req.body;

    if (!phoneNumber || !phoneCodeHash || !code) {
      return res.status(422).json({
        error: t('errors.missing_data'),
        details: {
          phoneNumber: phoneNumber ? t('present') : t('missing'),
          phoneCodeHash: phoneCodeHash ? t('present') : t('missing'),
          code: code ? t('present') : t('missing'),
        },
        authorized: false,
      });
    };

    const result = await client.invoke(
      new Api.auth.SignIn({ phoneNumber, phoneCodeHash, phoneCode: code })
    );

    if (result.className === "auth.Authorization" && result.user) {
      saveSession(user._id);
      await sendAndHandleMessages(client, INFO_CHANEL_NAME, t('handle_message'), t('handle_message'), user);

      return res.status(200).json({ message: t('telegram.success.sign_in'), user: result.user, authorized: true });
    } else {
      console.error('Error:', result);
      return res.status(401).json({ error: t('telegram.errors.sign_in'), authorized: false });
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

        res.status(200).json({ message: t('telegram.success.2fa'), user: authResult.user });
      } catch (innerError) {
        console.error(t('telegram.errors.2fa', {error: innerError}));
        res.status(422).json({ error: t('telegram.errors.2fa', {error: innerError}) });
      }
    } else {
      res.status(422).json({ error: t('telegram.errors.sign_in') });
    }
  }
};

async function checkSession(req, res) {
  try {
    const isAuthorized = await client?.isUserAuthorized();

    if (isAuthorized){
      res.status(200).json({ authorized: isAuthorized, message: t('telegram.success.authorized') });
    } else if (await initializeClient(req.user._id)) {
      res.status(200).json({ authorized: true, message: t('telegram.success.authorized') });
    } else {
      res.status(401).json({ message: t('telegram.errors.authorized'), authorized: false });
    };

  } catch (error) {
    console.error(t('telegram.errors.checking_session', {error: error}));
    res.status(422).json({ error: t('telegram.errors.checking_session', {error: error}) });
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
    console.error(t('errors.client', {error: error}));
  }
}

export { initializeClient, sendCode, signIn, checkSession, getClient, show, create, update, remove };
