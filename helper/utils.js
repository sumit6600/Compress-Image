

class util{
    static formatedResponse(err , result){
        if(err){
            result = {
                error: true,
                code: 422,
                message: err.message,
                time:(new Date()).getTime(),
                data: {}
            };
        }
        else if (typeof result === 'object') {
            var error = result?.error || false;
            var code = result?.code || (!error ? 200 : 422);
            var message = result.message || '';
            delete result.error;
            delete result.code;
            delete result.message;
            result = {
                error: error,
                code: code,
                message: message,
                time:(new Date()).getTime(),
                data: result
            };
        } else {
            result = {
                error: false,
                code: 200,
                message: '',
                time:(new Date()).getTime(),
                data: result
            };
        }
        return result;
    }
}


module.exports = util;