'use strict';

module.exports = function(Userteamplayers) {
    Userteamplayers.userpoints = function(user_id, cb) {
        Userteamplayers.find({
            include: ['userTeams','players']
        },function(err,rows){
            cb(null, rows);
        });
    };

    Userteamplayers.remoteMethod (
        'userpoints',
        {
          http: {path: '/userpoints', verb: 'get'},
          accepts: [
              {arg: 'user_id', type: 'string', http: { source: 'query' }}
            ],
          returns: {arg: 'response', type: 'Object'}
        }
      );
};
