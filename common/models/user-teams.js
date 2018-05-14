'use strict';

module.exports = function(Userteams) {
    var app = require('../../server/server');
    var async= require("async");
    var mStatus,matchInnings,ballLimit=60,captain_multiplier=1.5, viceCaptain_multiplier=1.5, allrounder_multiplier=1.5, swap_x=0,swap_y=11;


    Userteams.userpoints = function(user_id, match_id,match_contest_id, cb) {

      






        var Matches = app.models.Matches;
        var players = app.models.Players;
        var finalscores = app.models.Finalscores;
        var leagueId;

        function getMatch(match_id, league_id){
            Matches.findOne({where: {id: match_id}},function(err,matchrows){
                getFinalScores(matchrows.matchKey, league_id);
            });
        }

        function getFinalScores(match_key, league_id){
            finalscores.find({
                where:{matchKey: match_key, leagueId: 3}
            },function(err,rows){
                var finalData = {};
                var players=[]; 
                var batting='';
                var currentover='';
                var playingStatus; 
                var mStatus='';
                var matchInnings=0;
                var totalInningsOver=0;

                for(var i=0;i<rows.length;++i){
                    batting = rows[i].battingTeamKey;
                    currentover = rows[i].currentOver;
                    mStatus = rows[i].status;
                    matchInnings = rows[i].innings;
                    totalInningsOver = rows[i].totalInningsOver;
                    if(rows[i].playingStatus==null)
                      playingStatus='notout';
                    else
                      playingStatus=rows[i].playingStatus;
                   
                    players.push({
                        player_key: rows[i].playerKey,
                        player_name: rows[i].playerName,
                        playing_status: playingStatus,
                        striker_key: rows[i].strikerKey,
                        nonstriker_key: rows[i].nonStrikerKey,
                        striker_name: rows[i].strikerName,
                        nonstriker_name: rows[i].nonstrikerName,
                        team_name: rows[i].team,
                        team_fullname: rows[i].teamFullname,
                        role: rows[i].role,
                        captain: rows[i].captain,
                        score: rows[i].score,
                        playingXi: rows[i].playingXi
                    });
                }

                finalData = {response:
                    {
                      matchStatus:mStatus,
                      batting: batting, 
                      overPlayed: currentover,
                      innings: matchInnings,
                      totalInningsOver: totalInningsOver,
                      players: players
                    }};
                //console.log(finalData);
            });
        }
        
        
        //console.log(Userteams.nestRemoting('userTeamPlayers'));

        const SeriesPlayers = app.models.SeriesPlayers;
        var finalarray=[];
        Userteams.find({
            include: ['users','matches','matchContests','userTeamPlayers'],
            // include: {
            //     users: 'users',
            //     userTeamPlayers: [{players: 'players'}]},

            include: {
                userTeamPlayers: ['players','seasonTeams'],
            },
            where:{userId: user_id, matchId: match_id, matchContestId: match_contest_id}
        },function(err,rows){
          finalarray =rows;
            for(var i = 0; i<finalarray.length;i++){
              for(var j=0;j<finalarray[i].userTeamPlayers().length;j++){
                //console.log(rows[i].userTeamPlayers()[j]);
                SeriesPlayers.find({
                where:{teamId: finalarray[i].userTeamPlayers()[j].seriesTeamId,playerId:rows[i].userTeamPlayers()[j].playerId}
              },function(err,result){
                //console.log(rows[0].userTeamPlayers().findIndex((x)=>x.playerId==result[0].playerId));
                
                if(typeof (finalarray[0].userTeamPlayers().findIndex((x)=>x.playerId==result[0].playerId))!='undefined'){
                  //console.log(x);
                  //console.log(rows[0].userTeamPlayers().find((x)=>x.playerId==result.playerId));
                  //rows[0].userTeamPlayers().SeriesPlayers=result;
                  //rows[0].userTeamPlayers().id=100;
                  //console.log(rows[0].userTeamPlayers());
                  //rows[0].userTeamPlayers().push({SeriesPlayers: result});
                  //console.log(rows[0].userTeamPlayers());
                  //console.log(result);
                  //rows[0].userTeamPlayers()[0].SeriesPlayers=result;
                  //console.log(rows[0].userTeamPlayers());

                  //console.log(rows[0].userTeamPlayers().findIndex((x)=>x.playerId==result[0].playerId));
                }

                var index = finalarray[0].userTeamPlayers().findIndex((x)=>x.playerId==result[0].playerId);
                finalarray[0].userTeamPlayers()[index].sadsads=1;
                console.log(finalarray[0].userTeamPlayers()[index]);
                //console.log(result);

                console.log(index);

                //rows[0].seriesPlayers = result
                //rows[0].seriesPlayers = result;
                //console.log(rows[0].userTeamPlayers());
                //rows[0].userTeamPlayers().push({SeriesPlayers: result});
                
                console.log('here');
              });
              }
              

              //console.log(rows[i].userTeamPlayers().players);
              // SeriesPlayers.find({
              //   where:{teamId: rows[i].userTeamPlayers().seriesTeamId}
              // },function(err,rows){
              //  // console.log(rows);
              // });
                //console.log(rows[i].id);
                //var pl = rows[i].userTeamPlayers();
                //console.log(rows[i].matchContests().leagueId);
                //leagueId = rows[i].matchContests().leagueId;

                // for(var j=0;j<pl.length;++j){
                //     players.findOne({
                //         where:{id: pl[j].playerId}
                //     },function(err,playerrows){
                //         console.log(player);
                //     });
                // }
                
            }
            //getMatch(match_id, leagueId);
            cb(null, rows);
        });
    };

    Userteams.remoteMethod (
        'userpoints',
        {
          http: {path: '/userpoints', verb: 'get'},
          accepts: [
              {arg: 'user_id', type: 'string', http: { source: 'query' }},
              {arg: 'match_id', type: 'string', http: { source: 'query' }},
              {arg: 'match_contest_id', type: 'string', http: { source: 'query' }}
            ],
          returns: {arg: 'response', type: 'Object'}
        }
      ); 



      Userteams.switchPlayers = function(user_id, match_id, match_contest_id, cb) {
        var league_id;
        Userteams.find({
            include: ['users','matches','matchContests','userTeamPlayers'],
            where:{userId: user_id, matchId: match_id, matchContestId: match_contest_id}
          },function(err,rows){
            for(var i = 0; i<rows.length;++i){
                league_id = rows[i].matchContests().leagueId;
            }
            getMatch(user_id, match_id, league_id, match_contest_id);

          });

          function getMatch(user_id, match_id, league_id, match_contest_id){
            var Matches = app.models.Matches;
            Matches.findOne({where: {id: match_id}},function(err,matchrows){
              userPlayers(user_id, match_id, league_id, match_contest_id, matchrows.matchKey);
            });
          }

          function userPlayers(user_id, match_id, league_id, match_contest_id, match_key){
            Userteams.findOne({
              include: {
                userTeamPlayers: ['players']
              },
              where:{userId: user_id, matchId: match_id, matchContestId: match_contest_id}
            }, function(err, rows){
                if(rows!=null){
                    maxbashScores(user_id, match_id, league_id, match_contest_id, match_key, rows.userTeamPlayers());
                  
                }else{
                  //nextcallback();
                }
            });
          }  

          function maxbashScores(user_id, match_id, league_id, match_contest_id, match_key, userplayers){
            var maxbashscores = app.models.Maxbashscores;
            var totalBallFaced=0,flag=0,maxbash=[];
            var counterUserPlayersLength =  userplayers.length;
            maxbashscores.find({
              where: {matchKey: match_key}
            },function(err,rows){
              
              async.each(userplayers, function(uplayer, callback){
                for(var i=0;i<rows.length;++i){
                  if(rows[i].playerKey==uplayer.players().playerKey){
                    rows[i].vcaptain = 0;
                    rows[i].captain = 0;

                    // captain
                    if(uplayer.role==1){
                      //rows[i].score = parseFloat(rows[i].score*captain_multiplier); 
                      rows[i].captain = 1; // For Captain
                    }
                    // vice captain
                    else if(uplayer.role==2){
                      //rows[i].score = parseFloat(rows[i].score*viceCaptain_multiplier); 
                      rows[i].vcaptain = 1; // For Vice captain
                    }

                    // all rounder
                    if(uplayer.players().type =='AR'){
                      //rows[i].score = parseFloat(rows[i].score*allrounder_multiplier); 
                    }
                    // batting = rows[i].battingTeamKey;
                    // currentover = rows[i].currentOver;
                     mStatus = rows[i].status;
                     matchInnings = rows[i].innings;
                    // totalInningsOver = rows[i].totalInningsOver;

                    

                    var net_blfs=0;
                    var extraballsfaced=0;

                    if(rows[i].ballFaced==null)
                      rows[i].ballFaced=0;

                    if(rows[i].nblfs==null)
                      rows[i].nblfs=0;

                    if(rows[i].blfs==null)  
                      rows[i].blfs=0;
                      
                    totalBallFaced+=rows[i].ballFaced;
                    //console.log('totalBallFaced=>'+totalBallFaced);
                    if(totalBallFaced<=ballLimit){
                      net_blfs=rows[i].blfs;
                      maxBash(match_key,rows[i],rows[i].ballFaced,totalBallFaced,rows[i].nblfs,rows[i].blfs,ballLimit,flag,uplayer.order);
                    }else{
                      if(flag==0){
                        flag=1;
                        maxBash(match_key,rows[i],rows[i].ballFaced,totalBallFaced,rows[i].nblfs,rows[i].blfs,ballLimit,flag,uplayer.order);
                        extraballsfaced=totalBallFaced-ballLimit;
                      }else{
                        flag=2;
                        maxBash(match_key,rows[i],rows[i].ballFaced,totalBallFaced,rows[i].nblfs,rows[i].blfs,ballLimit,flag,uplayer.order);
                      }
                    }

                    function maxBash(match_key,rows,bf,tbf,nblfs,blfs,limit,flag,order){
                      var netblfs=0,totalscore=0,playingStatus;

                      if(rows.playingStatus==null)
                          playingStatus='notout';
                      else
                          playingStatus=rows.playingStatus;


                      if(flag==0){
                        netblfs=blfs;
                        totalscore=netblfs+nblfs;
                        
                        maxbash.push({
                          matchKey: match_key,
                          playerKey:rows.playerKey,
                          playing_status: playingStatus,
                          striker_key: rows.strikerKey,
                          nonstriker_key: rows.nonStrikerKey,
                          striker_name: rows.strikerName,
                          nonstriker_name: rows.nonstrikerName,
                          team_name: rows.team,
                          team_fullname: rows.teamFullname,
                          type: uplayer.players().type,
                          captain: rows.captain,
                          vcaptain: rows.vcaptain,
                          playingXi: rows.playingXi,
                          ballsFaced:rows.ballFaced,
                          totalBallsFaced: tbf,
                          nblfs: rows.nblfs,
                          blfs:rows.blfs,
                          netblfs:netblfs,
                          totalscore:totalscore,
                          order:order});
                        maxbashnextcallback();
                      }
                      else if(flag==1){
                        var Batsman_score = app.models.BatsmanScores;
                        bf=bf-(tbf-limit);
                        tbf=limit;
            
                        Batsman_score.findOne({
                          where: {matchKey: match_key,playerKey:rows.playerKey,ballFaced:bf}
                        },function(err,row){
                            var blfs=row.blfs;
                            netblfs=blfs;
                            totalscore=netblfs+nblfs;
                            maxbash.push({
                              matchKey: match_key,
                              playerKey:rows.playerKey,
                              playing_status: playingStatus,
                              striker_key: rows.strikerKey,
                              nonstriker_key: rows.nonStrikerKey,
                              striker_name: rows.strikerName,
                              nonstriker_name: rows.nonstrikerName,
                              team_name: rows.team,
                              team_fullname: rows.teamFullname,
                              type: uplayer.players().type,
                              captain: rows.captain,
                              vcaptain: rows.vcaptain,
                              playingXi: rows.playingXi,
                              ballsFaced:bf,
                              prev_ballsFaced:rows.ballFaced,
                              totalBallsFaced: tbf,
                              nblfs: rows.nblfs,
                              blfs:blfs,
                              prev_blfs:rows.blfs,
                              netblfs:netblfs,
                              totalscore:totalscore,
                              order:order});
                            
                            maxbashnextcallback();
                        });
                      }
                    
                      else if(flag==2){
                        totalscore=netblfs+nblfs;
                        maxbash.push({
                          matchKey: match_key,
                          playerKey:rows.playerKey,
                          playing_status: playingStatus,
                          striker_key: rows.strikerKey,
                          nonstriker_key: rows.nonStrikerKey,
                          striker_name: rows.strikerName,
                          nonstriker_name: rows.nonstrikerName,
                          team_name: rows.team,
                          team_fullname: rows.teamFullname,
                          type: uplayer.players().type,
                          captain: rows.captain,
                          vcaptain: rows.vcaptain,
                          playingXi: rows.playingXi,
                          ballsFaced:rows.ballFaced,
                          totalBallsFaced: tbf,
                          nblfs: rows.nblfs,
                          blfs:rows.blfs,
                          netblfs:netblfs,
                          totalscore:totalscore,
                          order:order});
                        maxbashnextcallback();
                      }
                    }


                    function maxbashnextcallback(){
                      counterUserPlayersLength--;
                      maxbash.sort(function(a, b) {
                        return parseInt(a.order) - parseInt(b.order);
                      });
                      finalMaxBashScores(maxbash,counterUserPlayersLength);
                    }
                  }
                }
              });
            });

          }

          function finalMaxBashScores(maxbash,counterUserPlayersLength){
            if(counterUserPlayersLength==0){
              var b = maxbash[swap_x];
              maxbash[swap_x] = maxbash[swap_y];
              maxbash[swap_y] = b;
              var totalBallFaced=0;
              var finalScore=0;
              async.each(maxbash,function(mb,callback){
                totalBallFaced+=mb.ballsFaced;
                maxbash[maxbash.indexOf(mb)].totalBallsFaced=totalBallFaced;
                if(totalBallFaced<=ballLimit){
                  maxbash[maxbash.indexOf(mb)].net_blfs=maxbash[maxbash.indexOf(mb)].blfs;
                  maxbash[maxbash.indexOf(mb)].totalscore = maxbash[maxbash.indexOf(mb)].net_blfs+maxbash[maxbash.indexOf(mb)].nblfs;
                }else{
                  maxbash[maxbash.indexOf(mb)].ballsFaced=maxbash[maxbash.indexOf(mb)].ballsFaced-(totalBallFaced-ballLimit);
                  maxbash[maxbash.indexOf(mb)].totalBallsFaced=ballLimit;
                }
                finalScore+=maxbash[maxbash.indexOf(mb)].totalscore;
              });

              console.log(finalScore);
              cb(null,maxbash);
              
            }
          }


    };

    Userteams.remoteMethod (
      'switchPlayers',
      {
        http: {path: '/switchPlayers', verb: 'get'},
        accepts: [
            {arg: 'user_id', type: 'string', http: { source: 'query' }},
            {arg: 'match_id', type: 'string', http: { source: 'query' }},
            {arg: 'match_contest_id', type: 'string', http: { source: 'query' }}
          ],
        returns: {arg: 'response', type: 'Object'}
      }
    ); 

};
