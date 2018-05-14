'use strict';

module.exports = function(Contestparticipants) {
    const app = require('../../server/server');
    const async= require("async");
    const CustomQuery = require('../../server/customQueries');
    Contestparticipants.updateRank = function(cb) {

        const Matches = app.models.Matches;
        
        var contestant=0;
        var match={};
        const Userteams = app.models.UserTeams;
        const leagues = app.models.Leagues;
        var clients=[];

        Matches.find({
            where:{matchStatus:2}
        },function(err,rows){
            for(let i=0;i<rows.length;i++){
              calculateranks(rows[i].id);
            }
        });

        function calculateranks(match_id){

          async.waterfall([

            function(next){
              const Matchcontests = app.models.MatchContests;
              Matchcontests.find({
                where: {matchId: match_id},
                include: ['matches','leagues','contestParticipants','userTeams']
            },function(err,rows){
              for(var i=0;i<rows.length;i++){
                for(var j=0;j<rows[i].contestParticipants().length;j++){
                  contestant++;
                }
              }
              if(contestant>0){
                next(null,'success');
              }
            });

            },
            
            function (data,next){
                const connector = app.dataSources.mySQLDatasource.connector;
                const sql="SELECT DISTINCT (ut.id), ut.user_id, ut.match_id, ut.match_contest_id FROM `user_teams` ut INNER JOIN contest_participants cp ON cp.match_contest_id = ut.match_contest_id WHERE ut.match_id ="+match_id;
                
                connector.execute(sql, null, (err, resultObjects) => {
                    for(let i=0;i<resultObjects.length;i++){
                        clients.push({user_id:resultObjects[i].user_id,match_id:resultObjects[i].match_id,match_contest_id:resultObjects[i].match_contest_id});
                    }
                    //console.log(clients);
                    next(null,'success');
                 });
            },

            function(data,next){
                var counter = clients.length;
                var leagueId;
                  function rankCallback(client, index){
                    Userteams.find({
                      include: ['users','matches','matchContests','userTeamPlayers'],
                      where:{userId: client.user_id, matchId: client.match_id, matchContestId: client.match_contest_id}
                    },function(err,rows){
                      for(var i = 0; i<rows.length;++i){
                          leagueId = rows[i].matchContests().leagueId;
                      }
                      updateUserPoints(client, leagueId);
                    });
                  }
        
        
                function updateUserPoints(client,leagueId){
                  leagues.findOne({
                    where: {id: leagueId}
                  },function(err,league){
                    // if max bash then
                    if(league.code=='max_bash' || league.code=='max_score' || league.code=='max_boundary'){ 
                        console.log(counter+" ==>");
                      CustomQuery.updateRank(client.match_contest_id).then((data)=>{
                        getRank(client,league.code);
                      });
                      
                    }else if(league.code=='fast_run'){
                        console.log(client);
                        CustomQuery.updateFastRank(client.match_contest_id).then((data)=>{
                            nextcallback();
                          });
                    }
                    else{
                      nextcallback();
                    }
                  });
                }
        
                function getRank(client,leage_code){
                  CustomQuery.getRank(client.user_id,client.match_contest_id).then((data)=>{
                    client.ranks={currentPosition: data[0].rank,totalcontests: data[0].total, topTeamScore: data[0].top_team_score};
                    nextcallback();
                  });
                }
        
                function nextcallback(){
                  counter--;
                    if(counter == 0) {
                      next(null, 'success');
                    }else {
                      rankCallback(clients[clients.length-counter], clients.length-counter);
                    }
                }
        
                  if(counter>0){
                    rankCallback(clients[clients.length-counter], clients.length-counter);
                  }else{
                    next(null, 'success');
                  }
                
              }
              // ,
              // function(data,next){
              //   cb(null,'ok');
              // }
        ]); 

        }

  
        

          
          
        cb(null,'ok');

    }

    Contestparticipants.remoteMethod (
        'updateRank',
        {
          http: {path: '/updateRank', verb: 'get'},
          accepts: [],
          returns: {arg: 'response', type: 'Object'}
        }
      );


};
