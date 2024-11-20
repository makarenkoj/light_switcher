"use strict";

// get status
async function updateStatus() {
    const response = await fetch('/status');
    console.log('STATUS RESPONSE:', response);

    const result = await response.json(); 
    console.log('STATUS RESULT:', result);
    console.log('POWER:', result.body.power);
    console.log('ALARM:', result.body.alarm);

    document.getElementById('scriptStatus').textContent = result.status ? 'Запущено 🟢' : 'Не запущено 🔴';
    document.getElementById('stopButton').style.display = result.status ? 'block' : 'none';
    document.getElementById('startButton').style.display = result.status ? 'none' : 'block';
    document.getElementById('power').textContent = result.body.power ? 'Увімкнено🔋' : 'Bимкнено🪫';
    document.getElementById('alarm').textContent = result.body.alarm ? 'Увімкнено🚀' : 'Bідсутня🌤️';
    document.getElementById('lamp').textContent = result.body.lamp ? 'Увімкнено💡' : 'Bимкнено';
    document.getElementById('day').textContent = result.body.sunset ? 'Hіч🌌' : 'День🌞';
};

// start script
document.getElementById('startButton').addEventListener('click', async () => {
    const response = await fetch('/start', { method: 'POST' });
    console.log('STATUS START RESPONSE:', response)

    const result = await response.json();
    console.log('STATUS START RESULT:', result);

    alert(result.message);
    updateStatus();
});

document.getElementById('stopButton').addEventListener('click', async () => {
    const response = await fetch('/stop', { method: 'POST' });
    const result = await response.json();

    alert(result.message);
    updateStatus();
});

setInterval(updateStatus, 5000);
updateStatus();
