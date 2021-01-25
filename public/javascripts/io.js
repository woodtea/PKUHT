function ioObj() {
    this.socket = io();
}

ioObj.prototype.init = function () {

    this.socket.on('test', async function (msg) {

    })
}