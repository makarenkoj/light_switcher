"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = '/login'
    localStorage.removeItem('phoneNumber');
    localStorage.removeItem('phoneCodeHash');
    localStorage.removeItem('step');
    localStorage.removeItem('authorized');
  };

  try {
    const response = await fetch("/api/telegram/checkSession", {
      method: "GET",
      headers: { "Content-Type": "application/json",
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();
    console.log('DATA:', data);

    if (response.ok) {
      localStorage.removeItem('phoneNumber');
      localStorage.removeItem('phoneCodeHash');
      localStorage.setItem('authorized', data.authorized);

      data.authorized === true ? window.location.href = '/status' : document.getElementById("message").innerText = 'Telegram not Authorize.\nPlease Authorize!';
    } else {
      document.getElementById("phone-message").innerText = data.error;
      localStorage.removeItem('authorized');
      localStorage.removeItem('token');
      window.location.href = '/login'
      throw new Error(data.error)
    }

  } catch (error) {
    alert(error.message);
  }

  const step = localStorage.getItem('step');

  if (step === '2') {
    document.getElementById("step-1").style.display = "none";
    document.getElementById("step-2").style.display = "block";
  };
});

document.getElementById("phone-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const phoneNumber = document.getElementById("phone").value;
  const token = localStorage.getItem('token');

  try {
    const response = await fetch("/api/telegram/sendCode", {
      method: "POST",
      headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ phoneNumber }),
    });

    const data = await response.json();
    console.log('DATA:', data);

    if (response.ok) {
      localStorage.setItem('phoneNumber', data.phoneNumber);
      localStorage.setItem('phoneCodeHash', data.phoneCodeHash);
      localStorage.setItem('step', 2);
      document.getElementById("step-1").style.display = "none";
      document.getElementById("step-2").style.display = "block";
      document.getElementById("message").innerText = data.message;
    } else {
      document.getElementById("phone-message").innerText = data.error;
      throw new Error(data.error)
    }

  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("code-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = document.getElementById("code").value;
  const phoneNumber = localStorage.getItem('phoneNumber');
  const phoneCodeHash = localStorage.getItem('phoneCodeHash');
  const token = localStorage.getItem('token');

  try {
    const response = await fetch("/api/telegram/signIn", {
      method: "POST",
      headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ code, phoneNumber, phoneCodeHash, setupStep: 2 }),
    });

    const data = await response.json();

    if (response.ok) {
      document.getElementById("code-message").innerText = data.message;
      document.getElementById("step-2").style.display = "none";
      localStorage.removeItem('step');
      window.location.href = '/status'
    } else {
      localStorage.removeItem('step');
      document.getElementById("message").innerText = data.error;
      throw new Error(data.error)
    }
  } catch (error) {
    alert(error.message);
  }
});
