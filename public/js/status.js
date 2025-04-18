"use strict";

document.addEventListener("DOMContentLoaded", async (e) => {
  e.preventDefault();

  const lang = localStorage.getItem('lang') || 'en';
  const token = localStorage.getItem('token');
  let message = document.getElementById("message");
  message.innerText = 'status message';

  try {
    const response = await fetch("/api/telegram/checkSession", {
      method: "GET",
      headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}`, "Accept-Language": lang },
    });

    const data = await response.json();
    console.log('DATA:', data);

    if (response.ok) {
      localStorage.setItem('authorized', data.authorized);
      message.innerText = data.message;
    } else {
      localStorage.removeItem('phoneNumber');
      localStorage.removeItem('phoneCodeHash');
      localStorage.setItem('authorized', data.authorized);
      window.location.href = '/';
      message.innerText = data.error;
      throw new Error(data.error)
    }

  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("logout").addEventListener("click", async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const lang = localStorage.getItem('lang') || 'en';

  try {
    const response = await fetch("/admin/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}`, "Accept-Language": lang },
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.removeItem('step');
      localStorage.removeItem('phoneNumber');
      localStorage.removeItem('phoneCodeHash');
      localStorage.removeItem('authorized');
      localStorage.removeItem('token');
      window.location.href = '/login'
    } else {
      document.getElementById("message").innerText = data.error;
      throw new Error(data.error)
    }
  } catch (error) {
    alert(error.message);
  }
});
