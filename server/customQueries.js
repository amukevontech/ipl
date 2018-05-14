// Custom Queries
var app = require('./server');
var async= require("async");
var orderpoints = require('./orderpoints');

class CustomQueries {
    constructor() {
        //this.rank=0;
    }
    //SET @r=0; UPDATE contest_participants SET rank= @r:= (@r+1) where team_points is not null and match_contest_id=3  ORDER BY team_points DESC;
    updateRank(match_contest_id){
        console.log('updateRank match_contest_id===>'+match_contest_id);
        return new Promise((resolve, reject) => {
            var contestParticipants = app.models.ContestParticipants;
            var connector = app.dataSources.mySQLDatasource.connector;
            const sql="SELECT * FROM `contest_participants` WHERE `match_contest_id` = "+match_contest_id+" ORDER BY `team_points` DESC ";
            connector.execute(sql, null, (err, resultObjects) => {
                var rank=0;
                for(let i=0;i<resultObjects.length;i++){
                    rank++;
                    var updatesql="update contest_participants set rank="+rank+" where id="+resultObjects[i].id;
                    connector.execute(updatesql, null, (err, result) => {
                        resolve('success');
                    });   
                }
             });
        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
        
    }

    // Update Fast Score Rank

    updateFastRank(match_contest_id){
        console.log('updateFastRank match_contest_id===>'+match_contest_id);
        return new Promise((resolve, reject) => {
            var contestParticipants = app.models.ContestParticipants;
            var connector = app.dataSources.mySQLDatasource.connector;
            

            // If only grace_target_balls are achieved by team, then calculate by grace_target_balls
            // If threshold_target_balls are acieved then calculate rank by threshold_target_balls, and discard grace_target_balls

            contestParticipants.find({
                where:{matchContestId:match_contest_id,thresholdTargetBalls:{gt:0}},
                order:'threshold_target_balls asc'
            },function(err,rows){
                if(rows.length>0){
                    update('threshold_target_balls',match_contest_id);
                }else{
                    update('grace_target_balls',match_contest_id);
                }
            });

            function update(condition,match_contest_id){
                
                contestParticipants.find({
                    where:{matchContestId:match_contest_id},
                    order:condition+' asc'
                },function(err,rows){
                    var rank=0;
                    for(let i=0;i<rows.length;i++){
                        if(condition=='threshold_target_balls'){
                            if(rows[i].thresholdTargetBalls==0){
                                rank=0;
                            }else{
                                rank++;
                            }
                            rows[i].updateAttributes({
                                rank: rank
                            },function(err,result){
                                resolve('done');
                            });
                        }

                        if(condition=='grace_target_balls'){
                            if(rows[i].graceTargetBalls==0){
                                rank=0;
                            }else{
                                rank++;
                            }
                            rows[i].updateAttributes({
                                rank: rank
                            },function(err,result){
                                resolve('done');
                            });
                        }
                        
                    }

                    

                });
            }

        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
        
    }


    // Get Rank of user by user Id and match contest Id
    getRank(user_id,match_contest_id){
        return new Promise((resolve, reject) => {
            var contestParticipants = app.models.ContestParticipants;
            const connector = app.dataSources.mySQLDatasource.connector;
            const sql="SELECT user_id, match_contest_id, rank, cp2.total,cp2.top_team_score FROM `contest_participants` as cp1 cross join (select count(*) as total, max( team_points ) AS top_team_score from contest_participants cp2 where match_contest_id="+match_contest_id+" ) cp2 where match_contest_id="+match_contest_id+" and user_id="+user_id;
            connector.execute(sql, null, (err, resultObjects) => {
                console.log('resultObjects===>');
                console.log(resultObjects);
                resolve(resultObjects); 
             });
        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
    }
    // Fast Score Rank
    getFastRank(user_id,match_contest_id){
        console.log('Fast Score Rank==>');
        return new Promise((resolve, reject) => {
            var contestParticipants = app.models.ContestParticipants;
            const connector = app.dataSources.mySQLDatasource.connector;
            var sql;
            contestParticipants.find({
                where:{matchContestId:match_contest_id,thresholdTargetBalls:{gt:0}}
            },function(err,rows){
                if(rows.length>0){
                    sql="SELECT user_id, match_contest_id, rank, cp2.total,cp2.threshold_target_balls as top_team_score,grace_target_balls,cp2.threshold_target_balls FROM `contest_participants` as cp1 cross join (select count(*) as total, min( threshold_target_balls ) AS threshold_target_balls from contest_participants cp2 where match_contest_id="+match_contest_id+" and  threshold_target_balls>0) cp2 where match_contest_id="+match_contest_id+" and user_id="+user_id;
                }else{
                    sql="SELECT user_id, match_contest_id, rank, cp2.total,cp2.grace_target_balls as top_team_score,grace_target_balls,cp2.threshold_target_balls FROM `contest_participants` as cp1 cross join (select count(*) as total, min( grace_target_balls ) AS grace_target_balls from contest_participants cp2 where match_contest_id="+match_contest_id+" and  grace_target_balls>0) cp2 where match_contest_id="+match_contest_id+" and user_id="+user_id;
                }
                
                connector.execute(sql, null, (err, resultObjects) => {
                    resolve(resultObjects); 
                 });
            });

            //const sql="SELECT user_id, match_contest_id, rank, cp2.total,cp2.top_team_score FROM `contest_participants` as cp1 cross join (select count(*) as total, max( team_points ) AS top_team_score from contest_participants cp2 where match_contest_id="+match_contest_id+" ) cp2 where match_contest_id="+match_contest_id+" and user_id="+user_id
            
            
        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
    }
    

    FastScoreData(match_key){
        return new Promise((resolve, reject) => {
            const connector = app.dataSources.mySQLDatasource.connector;
            const sql="select id, match_key, player_key as playerKey,sum(ball_faced) as ballFaced, sum(fastscoretotal) as score,playing_status,batting_team_key as batting,overPlayed as currentOver,`status`,captain,team, player_name as playerName, playing_xi as playingXi,scoringparams_fastscore FROM (select mp.id, mp.match_key, mp.player_key, sum(ball_faced) as ball_faced, sum(fastrunPoints) as fastscoretotal ,playing_status,ms.batting_team_key, ms.current_over_detail as overPlayed, ms.status as `status`, mp.captain as captain, mp.team as team, mp.player_name as player_name ,mp.playing_xi as playing_xi,scoringparams_fastscore from (SELECT id, match_key, player_key, ball_faced,fastrunPoints, playing_status,'' as batting_team_key, '' as current_over_detail,'' as status,'' as captain,'' as team, '' as player_name,'' as playing_xi,scoringparams_fastscore FROM `fastrun_batsman` WHERE fastrun_batsman.match_key='"+match_key+"' group by `fastrun_batsman`.`player_key`,`fastrun_batsman`.`match_key` union all  SELECT id, match_key, player_key, ball_faced,fastrunPoints, playing_status, '' as batting_team_key, '' as current_over_detail, '' as status,'' as captain,'' as team,'' as player_name,' 'as playing_xi, scoringparams_fastscore FROM `fastrun_bowler` WHERE fastrun_bowler.match_key='"+match_key+"' group by `fastrun_bowler`.`player_key`,`fastrun_bowler`.`match_key` union all SELECT id, match_key, player_key, ball_faced,fastrunPoints, playing_status,'' as batting_team_key, '' as current_over_detail, '' as status,'' as captain,'' as team,'' as player_name,' 'as playing_xi,scoringparams_fastscore FROM `fastrun_fielder` WHERE fastrun_fielder.match_key='"+match_key+"' group by `fastrun_fielder`.`player_key`,`fastrun_fielder`.`match_key`) as fastrun INNER join match_stats as ms on ms.match_key=fastrun.match_key INNER join matches_players as mp on mp.player_key = fastrun.player_key and mp.match_key=fastrun.match_key group by fastrun.match_key, fastrun.player_key UNION ALL (select id, match_key, player_key as playerKey,0 as ballFaced, 0  as score ,'' as playing_status,'' as batting, '' as currentOver, '' as status, captain,team, player_name , playing_xi, '' as scoringparams_fastscore from matches_players  ) )as fastscore where fastscore.match_key='"+match_key+"' GROUP by match_key,player_key";
            

            connector.execute(sql, null, (err, resultObjects) => {
                resolve(resultObjects); 
             });
        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });

    }

    maxBashData(match_key){
        return new Promise((resolve, reject) => {
            const connector = app.dataSources.mySQLDatasource.connector;

            const sql="select id, match_key, player_key as playerKey,sum(ball_faced) as ballFaced,sum(blfs) as blfs,sum(nblfs) as nblfs, max(playing_status) AS playing_status,batting_team_key as battingTeamKey,overPlayed as currentOver,`status`,captain,team, player_name as playerName, playing_xi as playingXi, scoringparams FROM  (select mp.id, mp.match_key, mp.player_key, sum(ball_faced) as ball_faced, sum(blfs) as blfs , sum(nblfs) as nblfs,max(playing_status) as playing_status ,ms.batting_team_key, ms.current_over_detail as overPlayed, ms.status as `status`, mp.captain as captain, mp.team as team, mp.player_name as player_name ,mp.playing_xi as playing_xi, scoringparams FROM (SELECT id, match_key, player_key, sum(ball_faced) as ball_faced, blfs,0 as nblfs, max(playing_status) as playing_status,'' as batting_team_key, '' as current_over_detail,'' as status,'' as captain,'' as team, '' as player_name,'' as playing_xi, scoringparams FROM `fastrun_batsman` WHERE fastrun_batsman.match_key='"+match_key+"' group by `fastrun_batsman`.`player_key`,`fastrun_batsman`.`match_key` union all  SELECT id, match_key, player_key, ball_faced,'' as blfs,nblfs, max(playing_status) as playing_status, '' as batting_team_key, '' as current_over_detail, '' as status,'' as captain,'' as team,'' as player_name,' 'as playing_xi, scoringparams FROM `fastrun_bowler` WHERE fastrun_bowler.match_key='"+match_key+"' group by `fastrun_bowler`.`player_key`,`fastrun_bowler`.`match_key` union all SELECT id, match_key, player_key, ball_faced,'' as blfs,nblfs, playing_status,'' as batting_team_key, '' as current_over_detail, '' as status,'' as captain,'' as team, '' as player_name,' 'as playing_xi, scoringparams FROM `fastrun_fielder` WHERE fastrun_fielder.match_key='"+match_key+"' group by `fastrun_fielder`.`player_key`,`fastrun_fielder`.`match_key`) as maxbash INNER join match_stats as ms on ms.match_key=maxbash.match_key INNER join matches_players as mp on mp.player_key = maxbash.player_key and mp.match_key=maxbash.match_key group by maxbash.match_key, maxbash.player_key UNION ALL (select id, match_key, player_key as playerKey,0 as ball_faced, 0  as blfs, 0 as nblfs ,0 as playing_status,'' as battingTeamKey, '' as currentOver, '' as status, captain,team, player_name , playing_xi, '' as scoringparams from matches_players ) )as maxbashscore where maxbashscore.match_key='"+match_key+"' GROUP by match_key,player_key";

            


            connector.execute(sql, null, (err, resultObjects) => {
                resolve(resultObjects); 
            });
            
        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
    }

    maxScoreMaxBoundary(match_key,league_code){
        return new Promise((resolve, reject) => {
        const connector = app.dataSources.mySQLDatasource.connector;
        var sql;
        if(league_code=='max_boundary'){

        sql="select id, match_key, player_key as playerKey,sum(ball_faced) as ballFaced, sum(maxBoundarytotal) as score,playing_status,batting_team_key as batting,overPlayed as currentOver,`status`,captain,team, player_name as playerName, playing_xi as playingXi,scoringparams_maxboundary FROM (select mp.id, mp.match_key, mp.player_key, sum(ball_faced) as ball_faced, sum(maxboundaryPoints) as maxBoundarytotal ,playing_status,ms.batting_team_key, ms.current_over_detail as overPlayed, ms.status as `status`, mp.captain as captain, mp.team as team, mp.player_name as player_name ,mp.playing_xi as playing_xi,scoringparams_maxboundary from (SELECT id, match_key, player_key, ball_faced,maxboundaryPoints, playing_status,'' as batting_team_key, '' as current_over_detail,'' as status,'' as captain,'' as team, '' as player_name,'' as playing_xi,scoringparams_maxboundary FROM `fastrun_batsman` WHERE fastrun_batsman.match_key='"+match_key+"' group by `fastrun_batsman`.`player_key`,`fastrun_batsman`.`match_key` union all  SELECT id, match_key, player_key, ball_faced,maxboundaryPoints, playing_status, '' as batting_team_key, '' as current_over_detail, '' as status,'' as captain,'' as team,'' as player_name,' 'as playing_xi, scoringparams_maxboundary FROM `fastrun_bowler` WHERE fastrun_bowler.match_key='"+match_key+"' group by `fastrun_bowler`.`player_key`,`fastrun_bowler`.`match_key` union all SELECT id, match_key, player_key, ball_faced,maxboundaryPoints, playing_status,'' as batting_team_key, '' as current_over_detail, '' as status,'' as captain,'' as team,'' as player_name,' 'as playing_xi,scoringparams_maxboundary FROM `fastrun_fielder` WHERE fastrun_fielder.match_key='"+match_key+"' group by `fastrun_fielder`.`player_key`,`fastrun_fielder`.`match_key`) as fastrun INNER join match_stats as ms on ms.match_key=fastrun.match_key INNER join matches_players as mp on mp.player_key = fastrun.player_key and mp.match_key=fastrun.match_key group by fastrun.match_key, fastrun.player_key UNION ALL (select id, match_key, player_key as playerKey,0 as ballFaced, 0  as score ,'' as playing_status,'' as batting, '' as currentOver, '' as status, captain,team, player_name , playing_xi, '' as scoringparams_maxboundary from matches_players  ) )as maxboundary where maxboundary.match_key='"+match_key+"' GROUP by match_key,player_key";

        }else if(league_code=='max_score'){

        sql="select id, match_key, player_key as playerKey,sum(ball_faced) as ballFaced, sum(maxScoretotal) as score,playing_status,batting_team_key as batting,overPlayed as currentOver,`status`,captain,team, player_name as playerName, playing_xi as playingXi,scoringparams_maxscore FROM (select mp.id, mp.match_key, mp.player_key, sum(ball_faced) as ball_faced, sum(maxscorePoints) as maxScoretotal ,playing_status,ms.batting_team_key, ms.current_over_detail as overPlayed, ms.status as `status`, mp.captain as captain, mp.team as team, mp.player_name as player_name ,mp.playing_xi as playing_xi,scoringparams_maxscore from (SELECT id, match_key, player_key, ball_faced,maxscorePoints, playing_status,'' as batting_team_key, '' as current_over_detail,'' as status,'' as captain,'' as team, '' as player_name,'' as playing_xi,scoringparams_maxscore FROM `fastrun_batsman` WHERE fastrun_batsman.match_key='"+match_key+"' group by `fastrun_batsman`.`player_key`,`fastrun_batsman`.`match_key` union all  SELECT id, match_key, player_key, ball_faced,maxscorePoints, playing_status, '' as batting_team_key, '' as current_over_detail, '' as status,'' as captain,'' as team,'' as player_name,' 'as playing_xi, scoringparams_maxscore FROM `fastrun_bowler` WHERE fastrun_bowler.match_key='"+match_key+"' group by `fastrun_bowler`.`player_key`,`fastrun_bowler`.`match_key` union all SELECT id, match_key, player_key, ball_faced,maxscorePoints, playing_status,'' as batting_team_key, '' as current_over_detail, '' as status,'' as captain,'' as team,'' as player_name,' 'as playing_xi,scoringparams_maxscore FROM `fastrun_fielder` WHERE fastrun_fielder.match_key='"+match_key+"' group by `fastrun_fielder`.`player_key`,`fastrun_fielder`.`match_key`) as fastrun INNER join match_stats as ms on ms.match_key=fastrun.match_key INNER join matches_players as mp on mp.player_key = fastrun.player_key and mp.match_key=fastrun.match_key group by fastrun.match_key, fastrun.player_key UNION ALL (select id, match_key, player_key as playerKey,0 as ballFaced, 0  as score ,'' as playing_status,'' as batting, '' as currentOver, '' as status, captain,team, player_name , playing_xi, '' as scoringparams_maxscore from matches_players  ) )as maxboundary where maxboundary.match_key='"+match_key+"' GROUP by match_key,player_key";

        }
        
        connector.execute(sql, null, (err, resultObjects) => {
            resolve(resultObjects); 
        });
        
    }).catch(function(err) {
        console.error('Oops we have an error', err);
        reject(err);
    });
    }


    /*
    maxScoreMaxBoundary(match_key,league_id){
        return new Promise((resolve, reject) => {
            const connector = app.dataSources.mySQLDatasource.connector;
            
            const sql="select `pp`.`id` AS `id`,`pp`.`league_id` AS `league_id`,`pp`.`match_key` AS `match_key`,`mp`.`player_name` AS `playerName`,`pp`.`player_key` AS `playerKey`,`mp`.`captain` AS `captain`,`mp`.`team` AS `team`,(case when (`bp`.`wicket` = 1) then 'out' when (`bp`.`wicket` = 0) then 'notout' end) AS `playingStatus`,`mp`.`team_fullname` AS `teamFullname`,(case when (`mp`.`playing_role` = 'batsman') then 'BT' when (`mp`.`playing_role` = 'bowler') then 'BW' when (`mp`.`playing_role` = 'allrounder') then 'AR' when (`mp`.`playing_role` = 'keeper') then 'WK' end) AS `role`,`mp`.`playing_xi` AS `playingXi`,`ms`.`match_overs` AS `match_overs`,`ms`.`status` AS `status`,sum(`pp`.`score`) AS `score`,`ms`.`striker_key` AS `strikerKey`,`ms`.`nonstriker_key` AS `nonStrikerKey`,`ms`.`nonstriker_name` AS `nonstrikerName`,`ms`.`striker_name` AS `strikerName`,`ms`.`batting_team_key` AS `battingTeamKey`,`ms`.`current_over_detail` AS `currentOver`,`ms`.`toss` AS `toss`,`ms`.`innings` AS `totalInningsOver`,`bp`.`ballsFaced` AS `ballsFaced` from (((`rotobash`.`player_points` `pp` join `rotobash`.`matches_players` `mp` on(((convert(`mp`.`player_key` using utf8) = `pp`.`player_key`) and (convert(`mp`.`match_key` using utf8) = `pp`.`match_key`)))) join `rotobash`.`match_stats` `ms` on((`ms`.`match_key` = `pp`.`match_key`))) left join `rotobash`.`batsman_performance` `bp` on(((`pp`.`player_key` = convert(`bp`.`playerKey` using utf8)) and (`pp`.`match_key` = convert(`bp`.`matchKey` using utf8))))) WHERE pp.league_id="+league_id+" and pp.match_key='"+match_key+"' group by `pp`.`player_key`,`pp`.`league_id`";

            connector.execute(sql, null, (err, resultObjects) => {
                resolve(resultObjects); 
            });
            
        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });

    }*/



    matchStatus(match_key){
        return new Promise((resolve, reject) => {
            
            const connector = app.dataSources.mySQLDatasource.connector;
            const sql="SELECT * FROM `match_stats` where match_key='"+match_key+"'";
            connector.execute(sql, null, (err, resultObjects) => {
                resolve(resultObjects); 
            });
        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
    }

    // Get Ball Faced of By Fast Run Points approx
    getBallFaced(match_key,player_key,fastrunPoints){
        console.log(match_key+','+player_key+','+fastrunPoints);

        return new Promise((resolve, reject) => {
            const Batsman_score = app.models.BatsmanScores;
            Batsman_score.findOne({
                where:{fastRunPoints:{gte:fastrunPoints},matchKey: match_key,playerKey:player_key}
            },function(err,result){
                console.log('GET BALL FACED of '+player_key+' here ===============================>');
                console.log(result);
                resolve(result);
            });
            
        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
    }
    // Get Last Ball Faced of By Fast Run Points approx
    getLastBallFaced(match_key,player_key){
        return new Promise((resolve, reject) => {
            const Batsman_score = app.models.BatsmanScores;
            Batsman_score.findOne({
                where:{matchKey: match_key,playerKey:player_key},
                order:  'id desc'
            },function(err,result){
                resolve(result);
            });
            
        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
    }

    updateThresholdBalls(user_id, match_contest_id,ball,score){
        return new Promise((resolve, reject) => {
        const contestParticipants = app.models.ContestParticipants;
        contestParticipants.updateAll(
            {
                userId: user_id,
                matchContestId: match_contest_id
            },
            {
                thresholdTargetBalls: ball,
                teamPoints:score
            },function(err,response){
                resolve(response);
            });

        });
    }

    updateGraceBalls(user_id, match_contest_id,ball,score){
        return new Promise((resolve, reject) => {
        const contestParticipants = app.models.ContestParticipants;
        contestParticipants.updateAll(
            {
                userId: user_id,
                matchContestId: match_contest_id
            },
            {
                graceTargetBalls: ball,
                teamPoints:score
            },function(err,response){
            });
        });
    }
  
    // Function to get Captain, Vice Captain and All rounder points

    getMultipliers(leagueId, match_type,playertype){
        return new Promise((resolve, reject) => {
          var returnData={},captain,vcaptain,allrounder,manofmatch;
          const connector = app.dataSources.mySQLDatasource.connector;
          const sql="SELECT lp.id, lp.league_id, lp.T20, lp.ODI, lp.ball_limit, smp.code, smp.playertype, smp.operation, smp.group_order FROM `league_points` lp INNER JOIN scoring_matrix_params smp ON smp.id = lp.param_id AND smp.playertype = '"+playertype+"' and smp.code in('cap','vcap','ar','mom') WHERE lp.league_id ="+leagueId;
          
          connector.execute(sql, null, (err, rows) => {
              for(let i=0;i<rows.length;i++){
                if(match_type=='t20'){

                    if(rows[i].code=='cap')
                        captain=rows[i].T20;

                    if(rows[i].code=='vcap')
                        vcaptain=rows[i].T20;
                    
                    if(rows[i].code=='ar')
                        allrounder=rows[i].T20;

                    if(rows[i].code=='mom')
                        manofmatch=rows[i].T20;

                  }else{
                    if(rows[i].code=='cap')
                        captain=rows[i].ODI;

                    if(rows[i].code=='vcap')
                        vcaptain=rows[i].ODI;
                
                    if(rows[i].code=='ar')
                        allrounder=rows[i].ODI;

                    if(rows[i].code=='mom')
                        manofmatch=rows[i].ODI;    
                  }
              }
              returnData={captain:captain,vcaptain:vcaptain,allrounder:allrounder,manofmatch:manofmatch};
            resolve(returnData); 
         });
        });
      }

    // Update Scores  

    updateScores(client,totalpoints){
        return new Promise((resolve, reject) => {
            const contestParticipants = app.models.ContestParticipants;
            contestParticipants.updateAll({
              userId: client.user_id, matchContestId: client.match_contest_id
            },
            {
              teamPoints: totalpoints
            },
            function(err,rows){
              resolve(totalpoints);
            });
        });
      }
 

    // Fast Score Rank 

    fastRank(match_key, user_id, match_contest_id,players,target_score, grace, scoringPoints){
        return new Promise((resolve, reject) => {
            //var players=finalData.response.players; 
            var sum=0,ts=0,gs=0,totalballfaced=0;
            var grace_score = target_score - grace;
            var player_achieved_ball=0;
            var total=players.reduce(function(total, players) {
                return players.score + total;
            }, 0);
            var graceFlag=0;
            
            //console.log(players);
            for(let i=0;i<players.length;i++){
                console.log(players[i]);
                console.log('sum ==> '+sum+' + '+ players[i].score);
                sum=parseFloat(sum+players[i].score);
                console.log('ts==> '+sum+' - '+ target_score);
                ts=parseFloat(sum-target_score);
                console.log('gs==>'+sum+'-'+grace_score);

                gs=parseFloat(sum-grace_score);


                // if( ts<=0 ){
                //     totalballfaced=parseFloat(totalballfaced+players[i].ballsFaced);
                // }
                // 250 
                if( ts>=0 ){
                    player_achieved_ball = players[i].ballsFaced;
                    console.log('player_achieved_ball====>'+player_achieved_ball);
                }
                totalballfaced=parseFloat(totalballfaced+players[i].ballsFaced);


                console.log('TS  ==>'+ts);
                console.log('SUM==>'+sum);
                console.log('GS==>'+gs);
                console.log('Score==>'+players[i].score);
                console.log('totalballfaced==>'+totalballfaced);
                


                if(gs>=0){
                    
                    
                    
                    if(graceFlag ==0){
                        console.log('Player who achieved grace score==>');
                        console.log(players[i]);
                        player_achieved_ball = players[i].ballsFaced;
                        console.log('Grace Score==> '+players[i].score+'-'+gs+'=');
                        let expectedGraceScore = players[i].score-gs;
                        console.log(expectedGraceScore);
                        expectedGraceScore = orderpoints.removeInitialPoints(players[i].playingXi,expectedGraceScore,scoringPoints);
                        expectedGraceScore = orderpoints.removeMultipliers(players[i].role,expectedGraceScore,scoringPoints,players[i].player_key,players[i].type,players[i].team_name);
                        console.log('New expectedGraceScore==>'+expectedGraceScore);
                        this.getBallFaced(match_key,players[i].player_key,expectedGraceScore).then((data)=>{
                            console.log('For Grace Score data=============>');
                            console.log(data);
                            if(data==null){
                                this.getLastBallFaced(match_key,players[i].player_key).then((records)=>{
                                    if(records!=null){
                                        let saveballs=records.ballFaced;
                                        if(totalballfaced>0){
                                            saveballs = totalballfaced-player_achieved_ball+records.ballFaced;
                                        }
                                        this.updateGraceBalls(user_id, match_contest_id,saveballs,total).then((updated)=>{
                                            //console.log(updated);
                                        });
                                    }
                                });
                            }else{
                                
                                let saveballs = totalballfaced-data.ballFaced;
                                if(totalballfaced>0){
                                    console.log('saveballs = ' + totalballfaced+'-'+player_achieved_ball+'+'+data.ballFaced);
                                    saveballs = totalballfaced-player_achieved_ball+data.ballFaced;
                                }
                                this.updateGraceBalls(user_id, match_contest_id,saveballs,total).then((updated)=>{
                                    //console.log(updated);
                                });
                            }
                        });
                    } 
                    
                    graceFlag = 1;
                }

                // If sum is updated and becomes less than Grace Score

                if(graceFlag==1 && sum<grace_score){
                    // set 0 as target grace balls
                    this.updateGraceBalls(user_id, match_contest_id,0,total).then((updated)=>{
                        
                    });
                }



                if( ts>=0 ){
                    console.log(players[i].score+'-'+ts);
                    let expectedScore =  players[i].score-ts;
                    console.log('expectedScore==>');
                    console.log(expectedScore);
                    
                    expectedScore = orderpoints.removeInitialPoints(players[i].playingXi,expectedScore,scoringPoints);
                    expectedScore = orderpoints.removeMultipliers(players[i].role,expectedScore,scoringPoints,players[i].player_key,players[i].type,players[i].team_name);
                    
                    console.log('PLayer==> '+players[i].player_key);
                    console.log('new expectedScore==>'+expectedScore);

  
                    this.getBallFaced(match_key,players[i].player_key,expectedScore).then((data)=>{
                        console.log('data=============>');
                        console.log(data);
                        if(data==null){
                            this.getLastBallFaced(match_key,players[i].player_key).then((records)=>{
                                if(records!=null){
                                    let saveballs=records.ballFaced;
                                    if(totalballfaced>0){
                                        saveballs = totalballfaced-player_achieved_ball+records.ballFaced;
                                    }
                                    
                                    this.updateThresholdBalls(user_id, match_contest_id,saveballs,total).then((updated)=>{
                                        //console.log(updated);
                                    });
                                }
                            });
                        }else{
                            let saveballs=data.ballFaced;
                            if(totalballfaced>0){
                                saveballs = totalballfaced-player_achieved_ball+data.ballFaced;
                            }
                            
                            this.updateThresholdBalls(user_id, match_contest_id,saveballs,total).then((updated)=>{
                                //console.log(updated);
                            });
                        }
                    });
                    break;
                }

            }

            resolve('success');
            // console.log('finalData ');
            // console.log(finalData.response.players);

        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
    }
  }

module.exports = new CustomQueries();