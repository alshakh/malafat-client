var express = require('express')
var expressws = require('express-ws')
var app = express()
var expressWs = expressws(app);

const Commander = require('malafat')


app.use(express.static(__dirname + "/public"));


expressWs.app.ws('/malafat', function (ws, req) {
    let cmd = new Commander()
    ws.on('message', (message) => {
        cmd.write(message)
    })

    cmd.on("response", (response) => {
        ws.send(response)
    })
});

app.listen(3000,'localhost');
