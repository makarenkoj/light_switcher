async function sendAndHandleMessages(client, channelName, userMessage, channelMessage) {
  try {
    await client.sendMessage("me", { message: userMessage });
    await client.sendMessage(channelName, { message: channelMessage });

    client.addEventHandler((update) => {
      if (update.message) {
        const message = update.message.message;
        console.log('Вхідне повідомлення:', message);
      }
    });

    console.log('Повідомлення успішно надіслано!');
  } catch (error) {
    console.error('Помилка під час надсилання повідомлень:', error);
  }
};

module.exports = { sendAndHandleMessages };
