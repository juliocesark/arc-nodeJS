// Servidor HTTP responsável por receber temperaturas vindas do arduino e salvar no banco Firebase.
//
// O servidor recebe as informações por parâmetros da requisição, então, uma requisição seria:
// Get => boto.museu-goeldi.br:3000/temperature-manager/api/lm?temperature=26.3
//
// O ip do servidor precisa ser alterado manualmente no arduino em caso de troca,
// uma outra opção seria adicionar uma entrada no DNS.

"use strict";

const http = require('http');
const url = require('url');
const format = require('date-fns/format');

const initFire = require('../components/db/initFire');

http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true); // true to get query as object

    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    if (pathname === '/temperature-manager/api/lm' && query.temperature) {
        const newDate = new Date();

        const day = format(newDate, 'YYYY-MM-DD');
        const time = format(newDate, 'HHmmss');

        // Salva objeto no banco com estrutura { temperature: xx.yy , time: data }
        initFire.firebase.database().ref('temperature/' + day + '/' + time).update({
            "temperature": parseFloat(query.temperature),
            "date": newDate
        });
    }

    res.end();
}).listen(3000); // Define a porta a ser usada para o servidor