module.exports = {
    extractBasic: function(msg){
        return {
            id: msg.id,
            operation: msg.operation,
            user: msg.user,
            user_id: msg.user_id,
            project: msg.project,
            error: false
        }
    }
}
