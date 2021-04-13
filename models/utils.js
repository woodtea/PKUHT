module.exports = {
    extractBasic: function(msg){
        return {
            msg_id: msg.msg_id,
            operation: msg.operation,
            user: msg.user,
            user_id: msg.user_id,
            project: msg.project,
            error: false
        }
    }
}
