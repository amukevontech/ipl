'use strict';
 
module.exports = function(Playerpoints) {
  
  const listplayerPoints = require('../../server/listplayerpoints');

    Playerpoints.listPlayerPoints = function(user_id, match_id, match_key, match_type, match_contest_id, league_code, cb) {

      console.log(user_id+' ' + match_id+' '+ match_key+' ' +match_type+' '+match_contest_id+' '+league_code);
      

      listplayerPoints.playerPoints(user_id, match_id, match_key, match_type, match_contest_id, league_code).then((finalData)=>{
        console.log('I am here');
        cb(null,finalData);
      });


    };


    Playerpoints.remoteMethod (
        'listPlayerPoints',
        {
          http: {path: '/listPlayerPoints', verb: 'get'},
          accepts: [
            {arg: 'user_id', type: 'string', http: { source: 'query' }},
            {arg: 'match_id', type: 'string', http: { source: 'query' }},
            {arg: 'match_key', type: 'string', http: { source: 'query' }},
            {arg: 'match_type', type: 'string', http: { source: 'query' }},
            {arg: 'match_contest_id', type: 'string', http: { source: 'query' }},
            {arg: 'league_code', type: 'string', http: { source: 'query' }}
          ],
          returns: {arg: 'response', type: 'Object'}
        }
      );

      Playerpoints.afterRemote('listPlayerPoints',function(context,output,next){
        
        context.result={
          status: output.response.status,
          message:'Updated Scores',
          response: output.response.response
        }
       next();

      });



    
    Playerpoints.observe('after save', function(ctx, next){
      

        //app.io.emit('listPlayerPoints', {data: 'test record is inserted'});
    });
 



};
