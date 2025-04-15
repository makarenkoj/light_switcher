// Підключення до сокета
const socket = io();
const notifList = document.getElementById("notification-list");
const notifCount = document.getElementById("notification-count");
let count = 0;

socket.on('notification', (data) => {
  count++;
  notifCount.textContent = count;
  notifList.querySelector('.empty')?.remove();

  const el = document.createElement("p");
  el.textContent = `${new Date().toLocaleTimeString()} — ${data.message}`;
  notifList.prepend(el);
});

socket.on("userNotification", (data) => {
  console.log("📬 Сповіщення отримано:", data.message);

  const el = document.createElement("div");
  el.className = "toast";
  el.innerText = data.message;
  document.body.appendChild(el);

  setTimeout(() => el.remove(), 5000);
});
