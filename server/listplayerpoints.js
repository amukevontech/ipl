const app = require('./server');
const async = require('async');
const CustomQuery = require('../server/customQueries');
const finalScores = require('../server/finalscores');
const CricketAPIServices = require('../server/services');
const CalculatePlayerPoints = require('../server/calculateplayerpoints');
const getpoints = require('../server/getPoints');

var winningTossCaptain,TossCaptainpoints={},playingXiPoints={},winningTeamPoints={},
scoringPoints={playingXiPoints:{},nonplayingXiPoints:{},TossCaptainpoints:{},winningTeamPoints:{}},
ranks={currentPosition: 0, totalcontests: 0, topTeamScore: 0},
multipliers={captain:0,viceCaptain:0,allRounder:0};


class listPlayerPoints {
    constructor() {
        
    }

    playerPoints(user_id, match_id, match_key, match_type, match_contest_id, league_code){

        return new Promise((resolve, reject) => {
            const Matches = app.models.Matches;
            const Userteams = app.models.UserTeams;
            const leagues = app.models.Leagues;
            const SeriesPlayers = app.models.SeriesPlayers;
            async.waterfall([
                function(next){
                  leagues.findOne({
                    where:{code: league_code}
                  },function(err,row){
                    console.log('Leagues');
                    console.log(row);
                      next(null,row.id);
                  });
                },
                function(leagueId,next){
                  if(league_code=='max_bash' || league_code=='max_score' || league_code=='max_boundary'){
                    CustomQuery.updateRank(match_contest_id).then((data)=>{
                      getRank(user_id,league_code);
                    });
                    function getRank(user_id,league_code){
                      CustomQuery.getRank(user_id,match_contest_id).then((data)=>{
                        ranks={currentPosition: data[0].rank,totalcontests: data[0].total, topTeamScore: data[0].top_team_score};
                        console.log('ranks==>');
                        console.log(ranks);
                        next(null,leagueId);
                      });
                    }
                  }else if(league_code=='fast_run'){
                    CustomQuery.updateFastRank(match_contest_id).then((data)=>{
                      next(null,leagueId);
                      });
                  }
                  else{
                    next(null,leagueId);
                  }
                },
                //scoringPoints
                function(leagueId,next){
                  getpoints.points(match_key, leagueId, match_type).then((Points)=>{
                    scoringPoints = Points;
                    next(null,leagueId);
                  });
                },
        
                // User Players
        
                function(data,next){
                  Userteams.findOne({
                    include: {
                      userTeamPlayers: ['players','seasonTeams']
                    },
                    where:{userId: user_id, matchId: match_id, matchContestId: match_contest_id}
                  }, function(err, rows){
                    
                      if(err) next({status: 'failure',message: 'contest not found'},null)
        
                      if(rows!=null){

                        var finalplayers=[];
                        
                        var item = rows.userTeamPlayers();
                        var counterLength=rows.userTeamPlayers().length;

                        processIteration(item[item.length-counterLength]);

                        function processIteration(item){

                          SeriesPlayers.findOne({
                            where: {playerId: item.playerId, teamId: item.series_team_id}
                          },function(err,seriesrows){
                            //console.log(item.players());
                            finalplayers.push({
                                id: item.id,
                                userTeamId: item.userTeamId,
                                playerId: item.playerId,
                                role: item.role,
                                order: item.order,
                                seriesTeamId: item.seriesTeamId,
                                ballFaced: item.ballFaced,
                                nblfs: item.nblfs,
                                blfs: item.blfs,
                                netblfs: item.netblfs,
                                score: item.score,
                                created: item.created,
                                user_team_id: item.user_team_id,
                                series_team_id: item.series_team_id,
                                players: function(){
                                  return {
                                    id: item.players().id,
                                    playerKey: item.players().playerKey,
                                    playerName: item.players().playerName,
                                    type: item.players().type,
                                    created: item.players().created
                                  }
                                },
                                seasonTeams: function(){
                                  return {
                                  id: item.seasonTeams().id,
                                  teamKey: item.seasonTeams().teamKey,
                                  teamName: item.seasonTeams().teamName,
                                  shortName: item.seasonTeams().shortName,
                                  created: item.seasonTeams().created} 
                                },
                                seriesPlayers: seriesrows
                            });

                            processnext();
                          });
                        }

                        function processnext(){
                          counterLength--;
                          if(counterLength==0){
                            next( null, {userplayers:finalplayers});
                          }else{
                            processIteration(item[item.length-counterLength]);
                          }
                        }
                        
                        

                        //next( null, {userplayers:rows.userTeamPlayers()});
                      }else{
                        next({status: 'failure',message: 'contest not found'},null);
                      }
                  });
                },
        
                function(data, next){
                  CustomQuery.matchStatus(match_key).then((matchStatus)=>{
                    
                    if(matchStatus.length==0){
                      console.log('set Zero Points');
                      finalScores.setZeroPoints(match_key, match_type, data.userplayers).then((finalData)=>{
                        console.log(finalData);
                        resolve(finalData);
                      });
                        
                    }else{
                      if(matchStatus[0].status===''){
                        console.log('set Zero Points');
                        finalScores.setZeroPoints(match_key, match_type,data.userplayers).then((finalData)=>{
                          console.log(finalData);
                          resolve(finalData);
                        });
                      }else{
                        let nextData = {userplayers: data.userplayers, matchStatus: matchStatus };
                        next(null,nextData);
                      }
        
        
                      
                  }
                });
                },
                
                function(data,next){
                   console.log('Data here');
                   var client = { user_id: user_id, match_id: match_id, match_contest_id: match_contest_id, score:0,counter:0,ranks:{},multipliers:multipliers };
                   //console.log(data.userplayers);
                   scoringPoints.matchStatus=data.matchStatus[0];
                  if(league_code=='max_bash'){
        
                    finalScores.maxbashScores(client, match_key, match_type, data.userplayers,ranks,scoringPoints).then((maxBashData)=>{
                      
                      console.log(maxBashData);
                      console.log('<=========Max Bash');
                        resolve(maxBashData);
                    }).catch(function(err) {
                      console.error('Oops we have an error', err);
                      reject(err);
                  });
                  }
                  else if(league_code=='fast_run'){
                    var crickInnings=1;
                    if(data.matchStatus!=null){
                      crickInnings=data.matchStatus[0].innings;
                    }
        
                    leagues.findOne({
                      where:{code: 'fast_run'}
                    },function(err,row){
                      finalScores.fastRunScores(client, match_key, match_type, row.id, data.userplayers, crickInnings, scoringPoints).then((finalData)=>{
                        resolve(finalData);
                      });
                    });
                    
                  }
                  else if(league_code=='max_boundary'){
                    finalScores.getFinalScores(client, match_key, match_type, league_code, data.userplayers,ranks,scoringPoints).then((finalData)=>{
                      resolve(finalData);
                    });

                    /*
                    leagues.findOne({
                      where:{code: 'max_boundary'}
                    },function(err,row){
                      finalScores.getFinalScores(client, match_key, match_type, row.id, data.userplayers,ranks,scoringPoints).then((finalData)=>{
                        resolve(finalData);
                      });
                    });*/
                  }
                  else if(league_code=='max_score'){
                    finalScores.getFinalScores(client, match_key, match_type, league_code, data.userplayers,ranks,scoringPoints).then((finalData)=>{
                      resolve(finalData);
                    });
                    /*
                    leagues.findOne({
                      where:{code: 'max_score'}
                    },function(err,row){
                      finalScores.getFinalScores(client, match_key, match_type, row.id, data.userplayers,ranks,scoringPoints).then((finalData)=>{
                        resolve(finalData);
                      });
                    });*/
                  }
                }
              ]);


        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
        
    }


}


module.exports = new listPlayerPoints();