'use strict';

module.exports = function(Matchcontests) {
    const app = require('../../server/server');
    const async = require('async');
    const request = require('request');
    const Config = require('../../server/config');
    const CricketAPIServices = require('../../server/services');
    const listplayerPoints = require('../../server/listplayerpoints');
    const jsonexport = require('jsonexport');
    const fs = require('fs');
    
    Matchcontests.participants = function(cb){
        const Matches = app.models.Matches;
        var contestant=[];
        var match={};
        var nodehost = Config.site_url.nodehost;
        
        Matches.find({
            where:{matchStatus:2}
        },function(err,rows){
            for(let i=0;i<rows.length;i++){
                updatepoints(rows[i].id);
            }
        });
 

        function updatepoints(match_id){
            async.waterfall([

                function(next){
                    Matchcontests.find({
                        where: {matchId: match_id},
                        include: ['matches','leagues','contestParticipants','userTeams']
                    },function(err,rows){
                        for(var i=0;i<rows.length;i++){
                            for(var j=0;j<rows[i].contestParticipants().length;j++){
                                contestant.push({
                                    user_id:rows[i].contestParticipants()[j].userId, 
                                    league_id: rows[i].leagues().id,
                                    match_id: match_id,
                                    match_key: rows[i].matches().matchKey,
                                    match_type: rows[i].matches().matchType.toLowerCase(),
                                    match_contest_id: rows[i].id,
                                    league_code: rows[i].leagues().code
                                });
                            }
                            match={match_key: rows[i].matches().matchKey};
                        }
                        if(contestant.length>0){
                            next(null, contestant);
                        }else{
                            const match_stats = app.models.MatchStats;
                            match_stats.updateAll({
                                matchKey: match.match_key,
                              },
                              {
                                nonstrikerName: '-',
                                strikerKey: '-',
                                nonStrikerKey: '-',
                                strikerName: '-',
                                battingTeamKey: '-',
                                currentOver: '0',
                                overKey: '-',
                                status: 'completed',
                                prevOver: '-',
                                nextOver: '-',
                                innings: 1,
                                firstinningteam: '-',
                                secondinningteam: '-',
                                matchOvers: '0.0',
                                winnerTeam:'-',
                                matchEndTime:null,
                                toss: '-',
                                captainTossWinner:'-',
                                winnerDeclaration: 1,
                                manofmatch:'-',
                                currentOverDetail: '0.0',
                                statusOverview: '-'
                              },function(err,result){
                                if(err) throw err;

                                console.log('Match set to completed as there are no participants!');

                                // Matches.updateAll({
                                //     matchKey:match.match_key
                                // },
                                // {matchStatus: 3},
                                // function(err,rows){
                                    
                                // });



                                });
                        }
                        
                    });
                },
                function(contestant,next){

                    var counterLength = contestant.length;
                    //console.log(counterLength);
                    processIteration(contestant[contestant.length-counterLength], contestant.length-counterLength);
                    
                    function processIteration(contestant, index) {
                        
                        listplayerPoints.playerPoints(contestant.user_id, contestant.match_id, contestant.match_key, contestant.match_type, contestant.match_contest_id, contestant.league_code).then((finalData)=>{
                            console.log('I am here');
                            processnext();
                        });

                    }

                    function processnext(){
                        counterLength--;
                        //console.log('counterLength==>'+counterLength);
                        if(counterLength ==0){
                          
                        }else{
                            processIteration(contestant[contestant.length-counterLength], contestant.length-counterLength);
                        }
                      }
                }
            ]);
        }

        cb(null, 'ok');

    }

    Matchcontests.remoteMethod (
        'participants',
        {
          http: {path: '/participants', verb: 'get'},
          accepts: [],
          returns: {arg: 'response', type: 'Object'}
        }
      );


      Matchcontests.matchresults = function(match_id, cb){
        const Matches = app.models.Matches;
        var contestant=[];
        var nodehost = Config.site_url.nodehost;
        
        Matches.find({
            where:{id:match_id}
        },function(err,rows){
            for(let i=0;i<rows.length;i++){
                updatepoints(rows[i].id);
            }
        });
 

        function updatepoints(match_id){
            async.waterfall([

                function(next){
                    Matchcontests.find({
                        where: {matchId: match_id},
                        include: ['matches','leagues','contestParticipants','userTeams']
                    },function(err,rows){
                        for(var i=0;i<rows.length;i++){
                            for(var j=0;j<rows[i].contestParticipants().length;j++){
                                contestant.push({
                                    user_id:rows[i].contestParticipants()[j].userId, 
                                    league_id: rows[i].leagues().id,
                                    match_id: match_id,
                                    match_key: rows[i].matches().matchKey,
                                    match_type: rows[i].matches().matchType.toLowerCase(),
                                    match_contest_id: rows[i].id,
                                    league_code: rows[i].leagues().code
                                });
                            }
            
                        }
                        
                        next(null, contestant);
                        
                    });
                },
                function(contestant,next){

                    var counterLength = contestant.length;
                    
                    processIteration(contestant[contestant.length-counterLength], contestant.length-counterLength);
                    
                    function processIteration(contestant, index) {
                        
                        listplayerPoints.playerPoints(contestant.user_id, contestant.match_id, contestant.match_key, contestant.match_type, contestant.match_contest_id, contestant.league_code).then((finalData)=>{
                            
                            processnext();
                        });
                        
                    }

                    function processnext(){
                        counterLength--;
                        
                        if(counterLength ==0){
                            // Update ResultOut=1
                                Matches.updateAll({
                                  id:match_id
                                },
                                {
                                  resultOut: 1
                                },function(err,rows){
                                  if(err) throw(err)
                          

                                  app.io.emit('resultOut', {result_out: "1"});  
                                    let date = new Date();
                                    date = "\n\r Result Out for Match ID "+match_id+"=> "+date.getFullYear()+'/'+date.getMonth()+'/'+date.getDate()+' '+date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();

                                    fs.appendFile('resultout.txt', date, function(err) {
                                        if (err) throw err;
                                        console.log('file saved');
                                  });  
                                

                                  console.log('All Calculation completed');
                                });
                              
                        }else{
                            processIteration(contestant[contestant.length-counterLength], contestant.length-counterLength);
                        }
                      }
                }
            ]);
        }

        cb(null, 'ok');

    }

    Matchcontests.remoteMethod (
        'matchresults',
        {
          http: {path: '/matchresults', verb: 'get'},
          accepts: [
            {arg: 'match_id', type: 'string', http: { source: 'query' }}
          ],
          returns: {arg: 'response', type: 'Object'}
        }
      );

};
