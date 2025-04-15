"use strict";

document.addEventListener("DOMContentLoaded", async (e) => {
  e.preventDefault(); //?
  const token = localStorage.getItem('token');
  const toggleButton = document.getElementById('myToggleButton');
  let status = false;
  let message = document.getElementById("message");
  message.innerText = 'status message';

  try {
    const response = await fetch("/api/telegram/checkSession", {
      method: "GET",
      headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
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

  try {
    const response = await fetch('/api/device/getStatus', {
      method: 'GET',
      headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    console.log('get status DATA:', data);

    if (response.ok) {
      status = data.body;
      toggleButton.textContent = status ? 'Turn OFF' : 'Turn ON';
    } else {
      throw new Error(data.error)
    }
  } catch (error) {
    alert(error.message);
  }


  toggleButton.addEventListener('click', async () => {
    status = !status;

    if (status) {
      toggleButton.classList.remove('active');
      toggleButton.textContent = 'Turn OFF';
    } else {
      toggleButton.classList.add('active');
      toggleButton.textContent = 'Turn ON';
    }

    try {
      const response = await fetch('/api/device/changeStatus', {
        method: 'PUT',
        headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: status})
      });

      const data = await response.json();
      console.log('change status DATA:', data);
  
      if (response.ok) {
        message.innerText = data.message;
        alert(data.message);
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      alert(error.message);
    }
  });
});

document.getElementById("logout").addEventListener("click", async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('token');

  try {
    const response = await fetch("/admin/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
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
