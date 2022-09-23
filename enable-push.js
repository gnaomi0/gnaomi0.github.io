initSW();

function initSW() {
    if (!"serviceWorker" in navigator) {
        console.log("Service worker isn't supported.");
        return;
    }

    if (!"PushManager" in window) {
        console.log("Push notifications aren't supported.");
        return;
    }

    // Register service worker
    navigator.serviceWorker.register('sw.js')
        .then(() => {
            console.log('Service worker installed!');
            isSubscribed();
        })
        .catch((err) => {
            console.log(err);
        });
}

function initPush() {
    if (!navigator.serviceWorker.ready) {
        return;
    }

    if (localStorage.getItem('notification') === 'granted' || localStorage.getItem('notification') === 'denied') {
        console.log(`The user ${ localStorage.getItem('notification') } the notifications`);
    }

    console.log(localStorage.getItem('subscribe') ? "The user is subscribed" : "The user isn't subscribed");

    // Start Notification Prompt.
    let headElement = document.querySelector('head');
    let styleElement = document.createElement('style');
    styleElement.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

        .prompt {
            position: fixed;
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            align-items: center;
            margin: auto;
            left: 0;
            right: 0;
            top: -50vh;
            border-radius: 10px;
            width: 50vw;
            height: 40vh;
            background: #ffffff;
            box-shadow: 5px 5px 10px #000000;
            transition: 200ms;
            z-index: 100;
        }

        .notification-text {
            text-align: center;
            padding: 1vh 0;
            font-size: 1.5rem;
            font-weight: 500;
            font-family: 'Poppins';
        }

        .btn-container {
            width: 100%;
            display: flex;
            justify-content: space-around;
            align-items: center;
            padding: 1vh 0;
        }

        .btn {
            width: 30%;
            padding: 1vh 2vw;
            color: #ffffff;
            font-weight: 600;
            border-radius: 10px;
            text-transform: uppercase;
            font-family: 'Poppins';
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
        }

        .btn-blue {
            background: #0000ff99;
        }

        .btn-red {
            background: #ff000099;
        }

        .show {
            top: 2vh;
            transition: 200ms;
        }

        @media screen and (max-width: 500px) {
            .prompt {
                width: 100vw;
                height: 20vh;
                border-radius: 10px 10px 0 0;
                box-shadow: 0 0 0 transparent;
                border: solid #00000099 1px;
                top: 100vh;
            }

            .notification-text {
                font-size: 1rem;
            }

            .btn {
                width: 45%;
                padding: 1vh 1vw;
            }

            .show {
                top: 80vh;
                transition: 200ms;
            }
        }
    `;

    headElement.appendChild(styleElement);

    let body = document.querySelector('body');
    let prompt = document.createElement('div');
    prompt.classList.add('prompt');

    let text = document.createElement('p');
    text.classList.add('notification-text');
    text.textContent = `¿Deseas recibir notificaciones de ${ SITE }?`;

    let btnContainer = document.createElement('div');
    btnContainer.classList.add('btn-container');

    let btnAccept = document.createElement('div');
    btnAccept.classList.add('btn', 'btn-blue');
    btnAccept.textContent = "aceptar"

    let btnDeny = document.createElement('div');
    btnDeny.classList.add('btn', 'btn-red');
    btnDeny.textContent = "denegar"

    btnContainer.appendChild(btnDeny);
    btnContainer.appendChild(btnAccept);
    prompt.appendChild(text);
    prompt.appendChild(btnContainer);
    body.appendChild(prompt);
    // End Notification Prompt.

    let permissionPrompt = document.querySelector('.prompt');
    let accept = document.querySelector('.btn-blue');
    let deny = document.querySelector('.btn-red');

    if (localStorage.getItem('prompt') === null && localStorage.getItem('subscribe') === null) {
        setTimeout(() => {
            permissionPrompt.classList.toggle('show');
        }, 5000);
    }

    deny.addEventListener("click", () => {
        localStorage.setItem('prompt', 'dismissed');
        localStorage.setItem('notification', 'denied');
        permissionPrompt.classList.toggle('show');
        console.log('Denied');
    })

    accept.addEventListener("click", () => {
        localStorage.setItem('prompt', 'dismissed');
        localStorage.setItem('notification', 'granted');
        permissionPrompt.classList.toggle('show');
        console.log('Granted');

        new Promise(function (resolve, reject) {
            const permissionResult = Notification.requestPermission(function (result) {
                resolve(result);
            });

            if (permissionResult) {
                permissionResult.then(resolve, reject);
            }
            })
            .then((permissionResult) => {
                if (permissionResult !== 'granted') {
                    throw new Error('We weren\'t granted permission.');
                }
                console.log("Subscribing user");
                subscribeUser();
            });
    });
}

function isSubscribed() {
    navigator.serviceWorker.ready
        .then((registration) => {
            registration.pushManager.getSubscription()
                .then(getSub => {
                    if (getSub !== null && localStorage.getItem('subscribe') === null) {
                        const storedSubscription = {
                            "endpoint": getSub.endpoint,
                            "expirationTime": getSub.expirationTime,
                            "siteKey": PUBLIC_KEY,
                            "url": document.URL,
                            "keys": {
                                "auth": getSub.toJSON().keys.auth,
                                "p256dh": getSub.toJSON().keys.p256dh
                            }
                        }

                        console.log("Resubscribing user.");
                        return resubscribeUser(storedSubscription);
                    }

                    console.log("Asking request from user.");
                    initPush();
                });
        });
}

function subscribeUser() {
    navigator.serviceWorker.ready
        .then((registration) => {
            const subscribeOptions = {
                userVisibleOnly: true,
                applicationServerKey: PUBLIC_KEY
            };

            return registration.pushManager.subscribe(subscribeOptions);
        })
        .then((pushSubscription) => {
            const subscription = {
                "endpoint": pushSubscription.endpoint,
                "expirationTime": pushSubscription.expirationTime,
                "siteKey": PUBLIC_KEY,
                "url": document.URL,
                "keys": {
                    "p256dh": pushSubscription.toJSON().keys.p256dh,
                    "auth": pushSubscription.toJSON().keys.auth
                }
            }

            console.log('Received PushSubscription: ', JSON.stringify(subscription));
            storePushSubscription(subscription);
        });
}

function storePushSubscription(pushSubscription) {
    localStorage.setItem('subscribe', true);

    fetch('https://notification-app.dev.pukara.es/api/store', {
        method: 'POST',
        body: JSON.stringify(pushSubscription),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    })
        .then((res) => {
            return res.json();
        })
        .then((res) => {
            console.log(res);
        })
        .catch((err) => {
            console.log(err);
        });
}

function resubscribeUser(storedSubscription) {
    localStorage.setItem('subscribe', true);

    fetch('https://notification-app.dev.pukara.es/api/resubscribe', {
          method: 'POST',
          body: JSON.stringify(storedSubscription),
          headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
          }
      })
          .then((res) => {
              return res.json();
          })
          .then((res) => {
              console.log(res);
          })
          .catch((err) => {
              console.log(err);
          });
}
