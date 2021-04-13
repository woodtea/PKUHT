const log4js = require('log4js');
const fs = require('fs');

var operationLogDirectory=__dirname+'/logs/operation'; //每日创建一个日志文件
fs.existsSync(operationLogDirectory)||fs.mkdirSync(operationLogDirectory);

log4js.configure({
    appenders: {
        operation: {
            type: 'dateFile',   //每日
            filename: operationLogDirectory + '/operation',
            pattern: '-yyyy-MM-dd.log',
            alwaysIncludePattern: true,
            encoding: 'utf-8'
        }
    },
    categories: { default: { appenders: ['operation'], level: 'info' } }
});

module.exports = log4js.getLogger('operation')