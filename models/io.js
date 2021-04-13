const DataManager = require('./dm');
dm = new DataManager()
const logger = require("../logger_config");

function ioConfig(server) {
    var io = require('socket.io')(server);
    io.on('connection', function(socket) {
        console.log('a user connected')
        socket.on('iotest', function (msg) {
            console.log(msg)
            socket.emit('iotest','hello from server!')
        })
        socket.on('KG',async function (msg) {
            let resp = await dm[msg["opereation"]](msg=msg)
            socket.emit('KG',resp)
            let log = {
                "request": msg,
                "response": resp
            }
            if(resp["error"]){
                logger.error(log)
            }else{
                logger.info(log)
            }

        })
    })
}

module.exports = ioConfig;