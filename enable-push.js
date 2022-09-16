initSW();

function initSW() {
    if (!"serviceWorker" in navigator) {
        //service worker isn't supported
        return;
    }

    //don't use it here if you use service worker
    //for other stuff.
    if (!"PushManager" in window) {
        //push isn't supported
        return;
    }

    //register the service worker
    navigator.serviceWorker.register('/sw.js')
        .then(() => {
            console.log('serviceWorker installed!')
            initPush();
        })
        .catch((err) => {
            console.log(err)
        });
}

function initPush() {
    if (!navigator.serviceWorker.ready) {
        return;
    }

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
            subscribeUser();
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
            const authT = pushSubscription.toJSON().keys.auth
            const left = authT.length / 2 - 3;
            const right = authT.length / 2 + 3;
            const pass = `${authT.slice(authT.length / 2)}`;

            const subscription = {
                "endpoint": pushSubscription.endpoint,
                "expirationTime": pushSubscription.expirationTime,
                "keys": {
                    "p256dh": pushSubscription.toJSON().keys.p256dh,
                    "auth": pushSubscription.toJSON().keys.auth
                },
                "name": `user-${authT.slice(left, right)}`,
                "email": `user-${authT.slice(left, right)}@pushsub.com`,
                "password": pass,
                "password_confirmation": pass
            }

            console.log('Received PushSubscription: ', JSON.stringify(subscription));
            storePushSubscription(subscription);
        });
}

function storePushSubscription(pushSubscription) {
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
