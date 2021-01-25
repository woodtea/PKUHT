
function ioConfig(server) {
    var io = require('socket.io')(server);
    io.on('connection', function(socket) {
        console.log('a user connected')
        socket.on('iotest', function (msg) {
            console.log(msg)
            socket.emit('iotest','hello from server!')
        })
    })
}

module.exports = ioConfig;