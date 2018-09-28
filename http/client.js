// Cliente responsável por realizar requisições HTTP para o servidor web do Arduino.
//
// Toda vez que algum dado sobre os arcondicionados forem alterados, a informação é
// repassada para esse arquivo através do evento "child_changed". Assim o cliente envia
// uma requisição para o servidor do Arduino para ligar ou desligar o arcondicionado.

"use strict";

const http = require('http');

const initFire = require('../components/db/initFire');

// AC commands. Get information about ac status
const ac1Ref = initFire.firebase.database().ref('airConditioner/1');
const ac2Ref = initFire.firebase.database().ref('airConditioner/2');

ac1Ref.on('child_changed', data => {
    const ac = data.key;
    const status = data.val().status;

    request(ac, status);
});

ac2Ref.on('child_changed', data => {
    const ac = data.key;
    const status = data.val().status;

    request(ac, status);
});

const request = (ac, status) => {
    const url = `http://10.0.100.20/temperature-manager/api/${ac}?status=${status}`;

    http.get(url, res => {
        res.setEncoding('utf8');
        res.on('data', chunk => {
            console.log('Body: ' + chunk);
        });
    });
};