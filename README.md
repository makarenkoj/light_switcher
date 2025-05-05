# README

Tuya (SmartLife) documentations: https://developer.tuya.com/en/docs/iot/device-intelligentize-in-5-minutes?id=K914joxbogkm6

Tuya API: https://github.com/codetheweb/tuyapi

Get telegram API keys: https://www.youtube.com/watch?v=8naENmP3rg4

Telegram API (gramjs): https://github.com/gram-js/gramjs

For start application:
***
* rename file .env_example to .env

* add keys in .env

* run this command in terminal and follow further instructions:

    ` docker compose up `

* follow the instructions in yours cli

* go to http://localhost:3000/

Documentation Smart Home: [link](https://developer.tuya.com/en/docs/cloud/device-control?id=K95zu01ksols7)

Projects and enviroment [link](https://platform.tuya.com/cloud/)

Start tests:

 * `npm test`

Tests coverage:

 * `npx jest --coverage`


Deploy rebuild command:
----------------------

 * `docker-compose down --volumes --remove-orphans`

 * `docker system prune -af`

 * `docker volume prune -f`

 * `docker-compose -f docker-compose.prod.yml build --no-cache`

 * `docker-compose -f docker-compose.prod.yml up`

 `Rebuild server`
----------------

* `git pull origin main`

* `docker-compose -f docker-compose.prod.yml down`

* `docker-compose -f docker-compose.prod.yml build`

* `docker-compose -f docker-compose.prod.yml up -d`
