// Bot responsável por interfaceamento da aplicação com usuários

"use strict";

const TeleBot = require('telebot');
const dateFns = require('date-fns');
const localePt = require('date-fns/locale/pt');

const token = require('./token');
const bot = new TeleBot(token);

const initFire = require('../components/db/initFire');

const PASSWORD = 'addmeMPEGbot';
let TODAY = dateFns.format(new Date(), 'YYYY-MM-DD');

const ACK_INPUT = [
    '1 ligado',
    '1 desligado',
    '2 ligado',
    '2 desligado'
];

let AUTH_USERS = [];
let tempAnt = 25;
let interval1 = false;
let interval2 = false;

const tempRef = initFire.firebase.database().ref('temperature/').child(TODAY).limitToLast(1);

tempRef.on('child_added', data => {
    const temp = data.val().temperature;
    const dateLocal = data.val().date;

    const addedDate = dateFns.addMinutes(dateLocal, 1);
 
    if ( dateFns.isTomorrow(addedDate) ){
        TODAY = dateFns.format(addedDate, 'YYYY-MM-DD');
    }

// Adicionar envio de mensagens dinamicamente
    if (temp >= 25){
        if (Math.trunc(temp) != Math.trunc(tempAnt)){
            AUTH_USERS.forEach(id => {
                bot.sendMessage(id, 'Atenção, a temperatura neste momento é de: ' + temp + 'ºC');
            });
            if ((temp % 1) >= 0 && (temp % 1) <= 0.5){
                interval1 = true;
                interval2 = false;
            } else if ((temp % 1) > 0.5 && (temp % 1) < 1){
                interval1 = false;
                interval2 = true;
            }      
        } else if ((temp % 1) >= 0 && (temp % 1) <= 0.5 && interval1 == false){
            AUTH_USERS.forEach(id => {
                bot.sendMessage(id, 'Atenção, a temperatura neste momento é de: ' + temp + 'ºC');
            });
            interval1 = true;
            interval2 = false;
        } else if ((temp % 1) > 0.5 && (temp % 1) < 1 && interval2 == false){
            AUTH_USERS.forEach(id => {
                bot.sendMessage(id, 'Atenção, a temperatura neste momento é de: ' + temp + 'ºC');
            });
            interval1 = false;
            interval2 = true;
        }
        tempAnt = temp;
    }
});

// Ao receber o comando "/status"
bot.on('/status', msg => {
    AUTH_USERS.forEach(id => {
        if (msg.from.id === id) {

            const day = dateFns.format(new Date(), 'YYYY-MM-DD');

            var ref = initFire.firebase.database().ref('temperature/').child(day);
            ref.limitToLast(1).once('value', snapshot => {
                snapshot.forEach(childSnapshot => {
                    return bot.sendMessage(msg.from.id, `Última temperatura medida: ${childSnapshot.val().temperature}º`);
                });
            });

            initFire.firebase.database().ref('airConditioner/').once('value', snapshot => {
                snapshot.forEach(childSnapshot => {
                    var on = (childSnapshot.val().status) ? 'Ligado' : 'Desligado';
                    bot.sendMessage(msg.from.id, `${childSnapshot.val().number}: ${on}`);
                });
            });
        }
    });
});

// Ao receber o comando "/last7"
bot.on('/last7', msg => {
    AUTH_USERS.forEach(id => {
        if (msg.from.id === id) {

            const day = dateFns.format(new Date(), 'YYYY-MM-DD');
    
            var message = 'As últimas 7 temperaturas medidas foram: ';
        
            var ref = initFire.firebase.database().ref('temperature/').child(day);
            var refPromise = ref.limitToLast(7).once('value', snapshot => {
                snapshot.forEach(childSnapshot => {
                    message += childSnapshot.val().temperature + 'º ';
                });
            });
        
            refPromise.then(val => {
                bot.sendMessage(msg.from.id, message);
            });
        }
    });
});

// Ao receber o comando "/temperatura"
bot.on('/temperatura', msg => {
    AUTH_USERS.forEach(id => {
        if (msg.from.id === id) {

            const day = dateFns.format(new Date(), 'YYYY-MM-DD');

            var ref = initFire.firebase.database().ref('temperature/').child(day);
            ref.limitToLast(1).once('value', snapshot => {
                snapshot.forEach(childSnapshot => {

                    const temperatureDate = dateFns.format(
                        childSnapshot.val().date,
                        'HH:mm[h] [do dia] DD [de] MMMM',
                        {locale: localePt}
                    );

                    return bot.sendMessage(msg.from.id, `Última temperatura medida: ${childSnapshot.val().temperature}º às ${temperatureDate}`);
                });
            });
        }
    });
});

// Comandos para controlar as centrais de ar.
// Os comandos tem sintaxe: "/ar 1 ligado", "/ar 2 desligado"
bot.on(/^\/ar (.+)$/, (msg, props) => {
    AUTH_USERS.forEach(id => {
        if (msg.from.id === id) {
            let approved = false;
            const input = props.match[1];
        
            ACK_INPUT.forEach(ack => {
                if (ack === input) approved = true;
            });
        
            if (approved) {
                const inputArray = input.split(' ');
                const ligado = (inputArray[1] === 'ligado') ? true : false;
        
                const promisa = initFire.firebase.database()
                    .ref('airConditioner/' + inputArray[0])
                    .update({ status: ligado });
        
                promisa.then(bot.sendMessage(msg.from.id, `O ar condicionado ${inputArray[0]} foi ${inputArray[1]}`));
            } else {
                bot.sendMessage(msg.from.id, 'Comando não reconhecido');
            }
        }
    });
});

// Comando para autenticar usuário.
// O comando tem sintaxe: "/password senhaDefinida"
bot.on(/^\/password (.+)$/, (msg, props) => {
    const input = props.match[1];

    if(input === PASSWORD){
        initFire.firebase.database().ref('authenticated-users').push().set({
            "id": msg.from.id,
            "user": msg.from.first_name
        }).then(res => {
            bot.sendMessage(msg.from.id, 'Olá, ' + msg.from.first_name +', você foi adicionado aos usuários cadastrados.');
            bot.sendMessage(msg.from.id, 'Use os comandos "/last7" ou  "/temperatura" para verificar a temperatura.');
        })
        .catch(err => {
            bot.sendMessage(msg.from.id, 'Ocorreu um erro: ' + err);
        });
    }

});

// Popula o array AUTH_USERS com os IDs dos usuários autenticados
const passRef = initFire.firebase.database().ref('authenticated-users');
passRef.on('child_added', data => {
    AUTH_USERS.push(data.val().id);
});

bot.start();