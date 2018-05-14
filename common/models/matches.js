'use strict';

module.exports = function(Matches) {

    // matche contests

    Matches.userteampoints = function(user_id, cb) {
        Matches.find({
            include:{ relation: 'matchContests'}
        },function(err,rows){
            cb(null, rows);
        });
    };

    Matches.remoteMethod (
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
