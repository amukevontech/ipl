'use strict';

module.exports = function(Users) {

    Users.userteampoints = function(user_id, cb) {
        Users.find({},function(err,rows){
            cb(null, rows);
        });
    };

    Users.remoteMethod (
        'userteampoints',
        {
          http: {path: '/userteampoints', verb: 'get'},
          accepts: [
              {arg: 'user_id', type: 'string', http: { source: 'query' }}
            ],
          returns: {arg: 'response', type: 'Object'}
        }
      );  

};
