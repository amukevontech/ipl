'use strict';

module.exports = function(Balls) {

    Balls.testing = function(msg, cb) {


        https.get('https://rest.cricketapi.com/rest/v2/match/dev_season_2014_q3/balls/?access_token=2s151429438441649s961198289187901461', function(resp)  {
            
            var body = '';
            resp.on('data', function(chunk){
                body += chunk;
                console.log(body);
            });
    
            resp.on('end', function(){
               
            });
    
        }).on("error", function(err){
            console.log("Error: " + err.message);
            //io.to( obj.id ).emit( 'numberValid',false );
        });


        
      //cb(null, 'Greetings... ' + msg);
    }

    Balls.remoteMethod('testing', {
        accepts: {arg: 'msg', type: 'string'},
        returns: {arg: 'greeting', type: 'string'}
  });

};
