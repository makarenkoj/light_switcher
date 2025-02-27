import 'dotenv/config';
import SunCalc from 'suncalc';
const { LATITUDE, LONGITUDE } = process.env
let currentDate = DateTime.now().setZone("Europe/Kiev")

function isTimeAfterSunsetOrBeforeSunrise(latitude, longitude, date = new Date()) {
  // Розраховуємо час сходу та заходу сонця
  const times = SunCalc.getTimes(date, latitude, longitude);
  const sunrise = DateTime.fromJSDate(times.sunrise);
  const sunset = DateTime.fromJSDate(times.sunset);

  // Отримуємо поточний час у часовому поясі, відповідному до координат
  const now = DateTime.now().setZone(sunrise.zoneName);

  console.log(`Date now: ${now}\nToday sunrise: ${sunrise}\nToday sunset: ${sunset}`);

  // Перевіряємо умови
  const isAfterSunset = now > sunset.plus({ minutes: 20 });
  const isBeforeSunrise = now < sunrise.plus({ minutes: 20 });

  console.log(`Is after sunset: ${isAfterSunset}\nIs before sunrise: ${isBeforeSunrise}`)
  return isAfterSunset && !isBeforeSunrise;
};
