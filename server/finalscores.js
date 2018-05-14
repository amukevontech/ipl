// Custom Queries
var app = require('./server');
var async= require("async");
var CustomQuery = require('./customQueries');
var CalculateMultipliers = require('./orderpoints');
var saveFinalScores = require('./savefinalscores');
const fs = require('fs');
var GlovalOver=1,headerMaxBashBool=0,headerFastScoreBool=0,headerMaxBoundaryBool=0,headerMaxScoreBool=0;
class FinalScores {
    constructor() {
        
    }  
   
    // Push final score to client
    fastRunScores(client, match_key, match_type, league_id, userplayers, crickInnings,scoringPoints){
        return new Promise((resolve, reject) => {

            const finalscores = app.models.Finalscores;
            var totalpoints = 0;

            CustomQuery.FastScoreData(match_key).then((rows)=>{
                
                var finalData = {};
                var players=[]; 
                var batting='';
                var currentOver='';
                var playingStatus; 
                var mStatus='';
                var totalInningsOver=0;
                var statusOverview;
                var winningTeam='';
                var innings=1;

              // Handle the case if Player is out from the series but is the part of user team
            for(var j=0;j<userplayers.length;j++){
          
              if(typeof rows.find(x =>x.playerKey === userplayers[j].players().playerKey) === 'undefined'){
                
                rows.push({
                  match_key: match_key,
                  playerKey: userplayers[j].players().playerKey,
                  ballFaced: 0,
                  nblfs: 0,
                  blfs: 0,
                  playerFullname: '',
                  playerName: userplayers[j].players().playerName,
                  team_id:String(userplayers[j].seriesTeamId),
                  user_team_id:String(userplayers[j].user_team_id),
                  row_id: String(userplayers[j].id),
                  player_id: userplayers[j].playerId,
                  id:String(userplayers[j].playerId),
                  matchType: '',
                  captain:0,
                  playingRole:'',
                  team:'-',
                  teamFullname: '',
                  type:userplayers[j].seriesPlayers.type,
                  playingXi: 0,
                  playingStatus: 'out',
                  strikerKey: '',
                  nonstrikerKey: '',
                  strikerName:'',
                  nonstrikerName:'',
                  battingTeamKey: '',
                  status:'',
                  statusOverview: '',
                  innings: '',
                  currentOver: '',
                  totalInningsOver: '',
                  score:0,
                  order:String(userplayers[j].order),
                  role:String(userplayers[j].role)
                });
              }
            }

                for(var i=0;i<rows.length;++i){

                async.each(userplayers, function(uplayer, callback){
                  
                    if(rows[i].score!=''){
                        rows[i].score = parseFloat(rows[i].score);
                         //console.log(parseFloat(rows[i].score));
                    }if(rows[i].score!=''){
                        rows[i].score = parseFloat(rows[i].score);
                         //console.log(parseFloat(rows[i].score));
                    }

                    if(rows[i].ballFaced==''){
                        rows[i].ballFaced=0;
                    }else{
                        rows[i].ballFaced=parseInt(rows[i].ballFaced);
                    }
                   
                    if(rows[i].playerKey==uplayer.players().playerKey){
                        //console.log(rows[i].playerKey);
                        rows[i].vcaptain = 0;
                        rows[i].captain = 0;

                    // captain
                    if(uplayer.role==1){
                      rows[i].captain = 1; // For Captain
                    }
                    // vice captain
                    else if(uplayer.role==2){ 
                      rows[i].vcaptain = 1; // For Vice captain
                    }
                    
                    if(scoringPoints.matchStatus==null){
                      batting='';
                      currentOver='';
                      innings=1;
                    }else{
                        batting = scoringPoints.matchStatus.batting_team_key;
                        currentOver= scoringPoints.matchStatus.current_over_detail;
                        mStatus=scoringPoints.matchStatus.status;
                        innings=scoringPoints.matchStatus.innings;
                    }
                     
                    rows[i].score = CalculateMultipliers.initialPoints(rows[i].playingXi,rows[i].score,scoringPoints);
                    rows[i].score = CalculateMultipliers.getTotalScore(rows[i],uplayer.role,rows[i].score,scoringPoints,
                    uplayer.players().playerKey,uplayer.seriesPlayers.type,rows[i].team); 

                    


                    totalpoints = totalpoints+rows[i].score;
                    
                    let credits = CalculateMultipliers.getPlayerCredits(match_key,match_type,uplayer.seriesPlayers);

                    // Final Players data with scores
                    players.push({
                        player_key: rows[i].playerKey,
                        player_name: rows[i].playerName,
                        playing_status: '',
                        striker_key: '',
                        nonstriker_key: '',
                        striker_name: '',
                        nonstriker_name: '',
                        credits: String(credits),
                        team_name: rows[i].team,
                        team_fullname: rows[i].teamFullname,
                        type: uplayer.seriesPlayers.type,
                        captain: rows[i].captain,
                        team_id:String(uplayer.seriesTeamId),
                        user_team_id:String(uplayer.user_team_id),
                        row_id: String(uplayer.id),
                        player_id: uplayer.playerId,
                        id:String(uplayer.playerId),
                        ballsFaced: rows[i].ballFaced,
                        score: rows[i].score,
                        vcaptain: rows[i].vcaptain,
                        playingXi: rows[i].playingXi,
                        order: String(uplayer.order),
                        role:String(uplayer.role)
                    });
                    }

                });
                }
                
                players.sort(function(a, b) {
                    return parseInt(a.order) - parseInt(b.order);
                });


                CustomQuery.updateScores(client,totalpoints).then((totalpoints)=>{
                  const MatchContests = app.models.MatchContests;
                  console.log(client.match_contest_id+'+'+league_id+'+'+client.match_id);
                  MatchContests.findOne({
                    where:{id: client.match_contest_id, leagueId: league_id, matchId: client.match_id}
                  },function(err,rows){
                    CustomQuery.fastRank(match_key, client.user_id,client.match_contest_id,players,rows.targetScore, rows.targetScoreGrace,scoringPoints).then((data)=>{
                      CustomQuery.updateFastRank(client.match_contest_id).then((data)=>{
                        CustomQuery.getFastRank(client.user_id,client.match_contest_id).then((data)=>{

                          if(mStatus=='started'){
                            mStatus='live';
                          }
                          console.log('here========>');
                          console.log(data);

                          let rank=0,total=0,top_team_score=0,threshold_target_balls=0;
                          if(typeof data==='undefined'){
                            rank=0;
                            total=0;
                            top_team_score=0;
                            threshold_target_balls=0;
                          }else{
                            rank = data[0].rank;
                            total = data[0].total;
                            top_team_score=data[0].top_team_score;
                            threshold_target_balls=data[0].threshold_target_balls;
                          }


                          if(rank==0){
                            rank='-';
                          }
                          
                          if(top_team_score==0 || top_team_score==null || threshold_target_balls==0){
                            top_team_score='-';
                          }


                          // Final Data
                          finalData = {response:
                            {
                            ssid: client.id,
                            matchStatus:mStatus,
                            statusOverview: 'statusOverview',
                            batting: batting, 
                            overPlayed: currentOver,
                            innings: innings,
                            totalInningsOver: 0.0,
                            yourScore: totalpoints,
                            currentPosition:String(rank),
                            totalcontests: total,
                            topTeamScore: 0,
                            topTeamBallsFaced:String(top_team_score),
                            matchContestId:String(client.match_contest_id),
                            players: players
                            },
                          status:'success'};
                          
                          if(mStatus=='completed'){
                            saveFinalScores.saveFastScores(finalData);
                          } 

                          resolve(finalData);
                        });
                      });
                    });
                      
                  });

                });

            });
            
        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
    }
    

    // Max Bash League Final Scores
    //@Params
    // client, match_key, userplayers,matchStatusData,ranks,scoringPoints

    maxbashScores(client, match_key, match_type, userplayers,ranks,scoringPoints){
      return new Promise((resolve, reject) => {
      
      var maxbashscores = app.models.Maxbashscores;
      var totalBallFaced=0,flag=0,maxbash=[];
      var counterUserPlayersLength =  userplayers.length;
      client.counter = userplayers.length;
      var batting,currentOver,matchStatus,innings,totalInningsOver=0;
      var mStatus='';
      var matchendtime,finalData = {};
      var ballLimit=scoringPoints.ballLimit;
      var prev_ballsFaced,prev_playerKey,seriesPlayers={};

      const Batsman_score = app.models.BatsmanScores;
      if(scoringPoints.matchStatus==null){
        batting='';
        currentOver='';
        matchStatus='';
        innings=1;
      }else{
          batting = scoringPoints.matchStatus.batting_team_key;
          currentOver= scoringPoints.matchStatus.current_over_detail;
          matchStatus=scoringPoints.matchStatus.status;
          innings=scoringPoints.matchStatus.innings;
          totalInningsOver=scoringPoints.matchStatus.match_overs;
      }

    // Uncomment when live
    if(matchStatus=='completed'){
      
      matchendtime=scoringPoints.matchStatus.match_end_time;
      console.log('ENd time==>');
      var date = new Date(matchendtime);
      console.log(date.getUTCHours());
      matchendtime = date.getUTCFullYear()+'-'+(date.getUTCMonth()+1)+'-'+date.getUTCDate()+' '+date.getUTCHours()+':'+date.getUTCMinutes()+':'+date.getUTCSeconds();
      console.log(matchendtime);      
    }else{
      matchendtime = '';
    }

    if(matchStatus=='started'){
      matchStatus='live';
    }
         
    
      CustomQuery.maxBashData(match_key).then((rows)=>{
        if(rows.length>0){
        
        userplayers.sort(function(a, b) {
          return parseInt(a.order) - parseInt(b.order);
        });

        // Handle the case if Player is out from the series but is the part of user team
        for(var j=0;j<userplayers.length;j++){
          
          if(typeof rows.find(x =>x.playerKey === userplayers[j].players().playerKey) === 'undefined'){

            rows.push({
              match_key: match_key,
              playerKey: userplayers[j].players().playerKey,
              ballFaced: 0,
              nblfs: 0,
              blfs: 0,
              playerFullname: '',
              playerName: userplayers[j].players().playerName,
              team_id:String(userplayers[j].seriesTeamId),
              user_team_id:String(userplayers[j].user_team_id),
              row_id: String(userplayers[j].id),
              player_id: userplayers[j].playerId,
              id:String(userplayers[j].playerId),
              matchType: '',
              captain:0,
              playingRole:'',
              team:'-',
              teamFullname: '',
              type:userplayers[j].seriesPlayers.type,
              playingXi: 0,
              playingStatus: 'out',
              strikerKey: '',
              nonstrikerKey: '',
              strikerName:'',
              nonstrikerName:'',
              battingTeamKey: '',
              status:'',
              statusOverview: '',
              innings: '',
              currentOver: '',
              totalInningsOver: '',
              score:0,
              order:String(userplayers[j].order),
              role:String(userplayers[j].role)
            });

          }
        }

        var checksum=0;
        var row_total_score;
        var array_index;
        var ballLimitRow=[];
        
        

        async.each(userplayers, function(uplayer, callback){
          for(var i=0;i<rows.length;++i){

            if(rows[i].playerKey==uplayer.players().playerKey){  
                rows[i].vcaptain = 0;
                rows[i].captain = 0;

              // captain
              if(uplayer.role==1){
                rows[i].captain = 1; // For Captain
              }
              // vice captain
              else if(uplayer.role==2){ 
                rows[i].vcaptain = 1; // For Vice captain
              }

               mStatus = rows[i].status;                                            

              var net_blfs=0;
              var extraballsfaced=0;

              if(rows[i].ballFaced==null)
                rows[i].ballFaced=0;

              if(rows[i].nblfs==null)
                rows[i].nblfs=0;

              if(rows[i].blfs==null)  
                rows[i].blfs=0;

              var player_type ;
              console.log('====UserPlayers===')
              console.log(uplayer);
              if(uplayer.seriesPlayers===null){
                seriesPlayers={playerId:0,seriesId:0,creditsOdi:0,creditsT20:0,creditsIpl:0,teamId:0,type:'OTH',player_id:0};
                player_type = 'OTH';
              }else{
                seriesPlayers = {
                  playerId:uplayer.seriesPlayers.playerId,
                  seriesId:uplayer.seriesPlayers.seriesId,
                  creditsOdi:uplayer.seriesPlayers.creditsOdi,
                  creditsT20:uplayer.seriesPlayers.creditsT20,
                  creditsIpl:uplayer.seriesPlayers.creditsIpl,
                  teamId:uplayer.seriesPlayers.teamId,
                  type:uplayer.seriesPlayers.type,
                  player_id:uplayer.seriesPlayers.player_id
                };
              }
              
              

              rows[i].nblfs = CalculateMultipliers.initialPoints(rows[i].playingXi,rows[i].nblfs,scoringPoints);
              rows[i].nblfs = CalculateMultipliers.getTotalScore(rows[i],uplayer.role,rows[i].nblfs,scoringPoints,uplayer.players().playerKey,seriesPlayers.type,rows[i].team);
              rows[i].blfs = CalculateMultipliers.getTotalScore(rows[i],uplayer.role,rows[i].blfs,scoringPoints,uplayer.players().playerKey,seriesPlayers.type,rows[i].team);
              
              totalBallFaced=parseFloat(totalBallFaced+rows[i].ballFaced);

              // Start
              checksum=parseFloat(totalBallFaced-ballLimit);
              if(checksum<0){
                net_blfs=rows[i].blfs;
                row_total_score=parseFloat(net_blfs+rows[i].nblfs);
                console.log(rows[i].playerName+'==>Ball Limit Not Reached==>'+row_total_score);

              }


              if(checksum>0 || checksum==0){
                if(flag==0){
                  
                 prev_ballsFaced=parseFloat(rows[i].ballFaced-(totalBallFaced-ballLimit));
                 row_total_score=parseFloat(net_blfs+rows[i].nblfs);
                 prev_playerKey=rows[i].playerKey;
                 flag=1;
                 
                 console.log(rows[i].playerName+'==>Ball Limit==>'+row_total_score);
                 array_index=maxbash.length;

                 ballLimitRow.push(rows[i]);

                }else{
                 row_total_score=rows[i].nblfs;
                 console.log(rows[i].playerName+'==>NBLFS ==>'+row_total_score);
                }
                //tbf=limit;
             }


             var playingStatus='out';
             
             if(scoringPoints.matchStatus.innings==1){
                if(rows[i].playing_status==null || rows[i].playing_status==0){
                  playingStatus='notout';
                }
             }

             if(scoringPoints.matchStatus.innings==2 && rows[i].team==scoringPoints.matchStatus.secondinningteam){
                  if(rows[i].playing_status==null || rows[i].playing_status==0){
                    playingStatus='notout';
                  }
             }

             if(scoringPoints.matchStatus.innings==2 && rows[i].team==scoringPoints.matchStatus.firstinningteam && rows[i].ballFaced==0){
                playingStatus='notout';
             }

             if(rows[i].playingXi==0){
                playingStatus='notout';
             }

             
             


             

            //  if(scoringPoints.matchStatus.batting_team_key==rows[i].team || scoringPoints.matchStatus.batting_team_key==''){
            //     playingStatus='notout';
            //  }
            //  else{
            //     playingStatus='out';
            //  }

              // if(rows[i].playing_status==null || rows[i].playing_status==0){
              //       playingStatus='notout';
              // }else{
              //   playingStatus='out';
              // }
              

              // Change request
              //row_total_score = CalculateMultipliers.getTotalScore(rows[i],uplayer.role,row_total_score,scoringPoints,uplayer.players().playerKey,uplayer.players().type,rows[i].team);
              

              let credits = CalculateMultipliers.getPlayerCredits(match_key,match_type,seriesPlayers);
              

              maxbash.push({
                match_key: match_key,
                player_name: rows[i].playerName,
                player_key:rows[i].playerKey,
                playing_status: playingStatus,
                striker_key: rows[i].strikerKey,
                nonstriker_key: rows[i].nonStrikerKey,
                striker_name: rows[i].strikerName,
                nonstriker_name: rows[i].nonstrikerName,
                credits: String(credits),
                team_name: rows[i].team,
                team_fullname: rows[i].teamFullname,
                type: seriesPlayers.type,
                captain: rows[i].captain,
                vcaptain: rows[i].vcaptain,
                team_id:String(uplayer.seriesTeamId),
                user_team_id:String(uplayer.user_team_id),
                row_id: String(uplayer.id),
                player_id: uplayer.playerId,
                id:String(uplayer.playerId),
                playingXi: rows[i].playingXi,
                ballsFaced:parseFloat(rows[i].ballFaced),
                prev_ballsFaced:prev_ballsFaced,
                totalBallsFaced: totalBallFaced,
                nblfs: parseFloat(rows[i].nblfs),
                blfs:parseFloat(rows[i].blfs),
                prev_blfs:0,
                netblfs:net_blfs,
                score:row_total_score,
                order:uplayer.order,
                role: String(uplayer.role)
              });

               // End


            }
          }

        });
        //console.log(maxbash);
        if(flag==1){
          console.log('matchKey:'+ match_key+','+'playerKey:'+prev_playerKey+','+'ballFaced:'+ prev_ballsFaced);
          Batsman_score.findOne({
            where: {matchKey: match_key,playerKey:prev_playerKey,ballFaced: prev_ballsFaced}
          },function(err,row){
            
              if(row!=null){
                maxbash[array_index].prev_blfs=maxbash[array_index].blfs;
                maxbash[array_index].blfs=row.blfs;
                
                maxbash[array_index].nblfs = CalculateMultipliers.getTotalScore(ballLimitRow,maxbash[array_index].role,maxbash[array_index].nblfs,
                  scoringPoints,
                maxbash[array_index].player_key,
                maxbash[array_index].type,
                maxbash[array_index].team_name);

                maxbash[array_index].blfs = CalculateMultipliers.getTotalScore(ballLimitRow,maxbash[array_index].role,maxbash[array_index].blfs,
                  scoringPoints,
                maxbash[array_index].player_key,
                maxbash[array_index].type,
                maxbash[array_index].team_name);
                
                maxbash[array_index].netblfs=maxbash[array_index].blfs;

                maxbash[array_index].score=maxbash[array_index].netblfs+maxbash[array_index].nblfs;

                // row_total_score = CalculateMultipliers.getTotalScore(ballLimitRow,maxbash[array_index].role,maxbash[array_index].score,
                //   scoringPoints,
                // maxbash[array_index].player_key,
                // maxbash[array_index].type,
                // maxbash[array_index].team_name);

                //maxbash[array_index].score = row_total_score;

              }

             var totalTeamPoints= maxbash.slice(0,11).reduce(function(total, maxbash) {
                return maxbash.score + total;
            }, 0);

            finalData = {response:{
              ssid: client.id,
              matchStatus:matchStatus,
              statusOverview: 'statusOverview',
              batting: batting, 
              overPlayed: currentOver,
              innings: innings,
              totalInningsOver: totalInningsOver,
              yourScore: totalTeamPoints,
              currentPosition: String(ranks.currentPosition),
              totalcontests: ranks.totalcontests,
              topTeamScore: ranks.topTeamScore,
              matchContestId:String(client.match_contest_id),
              matchendtime:matchendtime,
              players: maxbash,
              topTeamBallsFaced:0
              },
              status:'success'};


            nextcallback(client,finalData).then((data)=>{
              resolve(data);
            });
              
          });
        }else{
          var totalTeamPoints= maxbash.slice(0,11).reduce(function(total, maxbash) {
            return maxbash.score + total;
        }, 0);
          finalData = {response:{
            ssid: client.id,
            matchStatus:matchStatus,
            statusOverview: 'statusOverview',
            batting: batting, 
            overPlayed: currentOver,
            innings: innings,
            totalInningsOver: totalInningsOver,
            yourScore: totalTeamPoints,
            currentPosition: String(ranks.currentPosition),
            totalcontests: ranks.totalcontests,
            topTeamScore: ranks.topTeamScore,
            matchendtime:matchendtime,
            matchContestId:String(client.match_contest_id),
            players: maxbash,
            topTeamBallsFaced:0
            },
            status:'success'};
            nextcallback(client,finalData).then((data)=>{
              resolve(data);
            });
        }

        function nextcallback(client,finalData){
          return new Promise((resolve, reject) => {
              const contestParticipants = app.models.ContestParticipants;
              contestParticipants.updateAll({
                userId: client.user_id, matchContestId: client.match_contest_id
              },
              {
                teamPoints: finalData.response.yourScore
              },
              function(err,rows){
                if(matchStatus=='completed'){
                  saveFinalScores.saveMaxBash(finalData);
                }


                resolve(finalData);
              });
          });
        }

      }else{
        
        resolve('null value');
      }
      });
  }).catch(function(err) {
      console.error('Oops we have an error', err);
      reject(err);
  });
    }
 
 
      // Max Boundary and Max Score 

      getFinalScores(client, match_key, match_type, league_code, userplayers,ranks,scoringPoints){
        return new Promise((resolve, reject) => {
          var totalpoints = 0;
          const finalscores = app.models.Finalscores;
        

        CustomQuery.maxScoreMaxBoundary(match_key,league_code).then((rows)=>{
        
            var finalData = {};
            var players=[]; 
            var batting='';
            var currentOver='';
            var playingStatus; 
            var mStatus='';
            var totalInningsOver=0;
            var statusOverview;
            var innings=1;
            var winningTossCaptain;
            var winningTeam='';
            var matchStatus;

            if(scoringPoints.matchStatus==null){
              batting='';
              currentOver='';
              winningTossCaptain='';
              matchStatus='';
              innings=1;
              totalInningsOver=0;
            }else{
                  batting = scoringPoints.matchStatus.batting_team_key;
                  currentOver= scoringPoints.matchStatus.current_over_detail;
                  winningTossCaptain=scoringPoints.matchStatus.captain_toss_winner;
                  innings=scoringPoints.matchStatus.innings;
                  winningTeam=scoringPoints.matchStatus.winner_team;
                  matchStatus=scoringPoints.matchStatus.status;
                  currentOver= scoringPoints.matchStatus.current_over_detail;
                  totalInningsOver=scoringPoints.matchStatus.match_overs;
              }
              //console.log(rows);
            // Handle the case if Player is out from the series but is the part of user team
          for(var j=0;j<userplayers.length;j++){
            if(typeof rows.find(x =>x.playerKey === userplayers[j].players().playerKey) === 'undefined'){
              
              rows.push({
                match_key: match_key,
                playerKey: userplayers[j].players().playerKey,
                ballFaced: 0,
                nblfs: 0,
                blfs: 0,
                playerFullname: '',
                playerName: userplayers[j].players().playerName,
                team_id:String(userplayers[j].seriesTeamId),
                user_team_id:String(userplayers[j].user_team_id),
                row_id: String(userplayers[j].id),
                player_id: userplayers[j].playerId,
                id:String(userplayers[j].playerId),
                matchType: '',
                captain:0,
                playingRole:'',
                team:'-',
                teamFullname: '',
                type:userplayers[j].seriesPlayers.type,
                playingXi: 0,
                playingStatus: 'out',
                strikerKey: '',
                nonstrikerKey: '',
                strikerName:'',
                nonstrikerName:'',
                battingTeamKey: '',
                status:'',
                statusOverview: '',
                innings: '',
                currentOver: '',
                totalInningsOver: '',
                score:0,
                order:String(userplayers[j].order),
                role:String(userplayers[j].role)
              });
            }
          }

            for(var i=0;i<rows.length;++i){

              async.each(userplayers, function(uplayer, callback){
                if(rows[i].playerKey==uplayer.players().playerKey){
                  rows[i].vcaptain = 0;
                  rows[i].captain = 0;
                  
                  // captain
                  if(uplayer.role==1){
                    rows[i].captain = 1; // For Captain
                  }
                  // vice captain
                  else if(uplayer.role==2){ 
                    rows[i].vcaptain = 1; // For Vice captain
                  }

                  rows[i].score = CalculateMultipliers.initialPoints(rows[i].playingXi,rows[i].score,scoringPoints);
                  rows[i].score = CalculateMultipliers.getTotalScore(rows[i],uplayer.role,rows[i].score,
                    scoringPoints,
                  uplayer.players().playerKey,
                  uplayer.seriesPlayers.type,
                  rows[i].team);

                  mStatus = rows[i].status;

                  if(rows[i].playingStatus==null)
                    playingStatus='notout';
                  else
                    playingStatus=rows[i].playingStatus;

                  totalpoints = parseFloat(totalpoints+rows[i].score);
                  let credits = CalculateMultipliers.getPlayerCredits(match_key,match_type,uplayer.seriesPlayers);
                  
                  // Final Players data with scores
                  players.push({
                      player_key: rows[i].playerKey,
                      player_name: rows[i].playerName,
                      playing_status: playingStatus,
                      striker_key: rows[i].strikerKey,
                      nonstriker_key: rows[i].nonStrikerKey,
                      striker_name: rows[i].strikerName,
                      nonstriker_name: rows[i].nonstrikerName,
                      credits: String(credits),
                      team_name: rows[i].team,
                      team_fullname: rows[i].teamFullname,
                      type: uplayer.seriesPlayers.type,
                      team_id:String(uplayer.seriesTeamId),
                      user_team_id:String(uplayer.user_team_id),
                      row_id: String(uplayer.id),
                      player_id: uplayer.playerId,
                      id:String(uplayer.playerId),
                      captain: rows[i].captain,
                      score: rows[i].score,
                      role: uplayer.role,
                      vcaptain: rows[i].vcaptain,
                      playingXi: rows[i].playingXi,
                      order: uplayer.order
                  });
                }

              });
            }
            
            players.sort(function(a, b) {
              return parseInt(a.order) - parseInt(b.order);
            });

            if(matchStatus=='started'){
              matchStatus='live';
            }

                CustomQuery.updateScores(client,totalpoints).then((totalpoints)=>{
                  CustomQuery.updateRank(client.match_contest_id).then((data)=>{
                    CustomQuery.getRank(client.user_id,client.match_contest_id).then((data)=>{
                      // Final Data
                      finalData = {response:
                        {
                          ssid: client.id,
                          matchStatus:matchStatus,
                          statusOverview: 'statusOverview',
                          batting: batting, 
                          overPlayed: currentOver,
                          innings: innings,
                          totalInningsOver: totalInningsOver,
                          yourScore: totalpoints,
                          currentPosition: String(data[0].rank),
                          totalcontests: data[0].total,
                          topTeamScore: data[0].top_team_score,
                          matchContestId:String(client.match_contest_id),
                          players: players
                        },
                        status:'success'};
                        if(matchStatus=='completed'){
                          saveFinalScores.saveScores(finalData);
                        }  
                      resolve(finalData);
                    });
                  });
                  
                });

        });
      }).catch(function(err) {
          console.error('Oops we have an error', err);
          reject(err);
      });
    }






      /*
      getFinalScores(client, match_key, match_type, league_id, userplayers,ranks,scoringPoints){
          return new Promise((resolve, reject) => {
            var totalpoints = 0;
            const finalscores = app.models.Finalscores;
          

          CustomQuery.maxScoreMaxBoundary(match_key,league_id).then((rows)=>{
          //   console.log(data);
          // });

          // finalscores.find({
          //     where:{matchKey: match_key, leagueId: league_id}
          // },function(err,rows){ 
              var finalData = {};
              var players=[]; 
              var batting='';
              var currentOver='';
              var playingStatus; 
              var mStatus='';
              var totalInningsOver=0;
              var statusOverview;
              var innings=1;
              var winningTossCaptain;
              var winningTeam='';
              var matchStatus;

              if(scoringPoints.matchStatus==null){
                batting='';
                currentOver='';
                winningTossCaptain='';
                matchStatus='';
                innings=1;
                totalInningsOver=0;
              }else{
                    batting = scoringPoints.matchStatus.batting_team_key;
                    currentOver= scoringPoints.matchStatus.current_over_detail;
                    winningTossCaptain=scoringPoints.matchStatus.captain_toss_winner;
                    innings=scoringPoints.matchStatus.innings;
                    winningTeam=scoringPoints.matchStatus.winner_team;
                    matchStatus=scoringPoints.matchStatus.status;
                    currentOver= scoringPoints.matchStatus.current_over_detail;
                    totalInningsOver=scoringPoints.matchStatus.match_overs;
                }
                //console.log(rows);
              // Handle the case if Player is out from the series but is the part of user team
            for(var j=0;j<userplayers.length;j++){
              if(typeof rows.find(x =>x.playerKey === userplayers[j].players().playerKey) === 'undefined'){
                
                rows.push({
                  match_key: match_key,
                  playerKey: userplayers[j].players().playerKey,
                  ballFaced: 0,
                  nblfs: 0,
                  blfs: 0,
                  playerFullname: '',
                  playerName: userplayers[j].players().playerName,
                  team_id:String(userplayers[j].seriesTeamId),
                  user_team_id:String(userplayers[j].user_team_id),
                  row_id: String(userplayers[j].id),
                  player_id: userplayers[j].playerId,
                  id:String(userplayers[j].playerId),
                  matchType: '',
                  captain:0,
                  playingRole:'',
                  team:'-',
                  teamFullname: '',
                  type:userplayers[j].seriesPlayers.type,
                  playingXi: 0,
                  playingStatus: 'out',
                  strikerKey: '',
                  nonstrikerKey: '',
                  strikerName:'',
                  nonstrikerName:'',
                  battingTeamKey: '',
                  status:'',
                  statusOverview: '',
                  innings: '',
                  currentOver: '',
                  totalInningsOver: '',
                  score:0,
                  order:String(userplayers[j].order),
                  role:String(userplayers[j].role)
                });
              }
            }

              for(var i=0;i<rows.length;++i){

                async.each(userplayers, function(uplayer, callback){
                  if(rows[i].playerKey==uplayer.players().playerKey){
                    rows[i].vcaptain = 0;
                    rows[i].captain = 0;
                    
                    // captain
                    if(uplayer.role==1){
                      rows[i].captain = 1; // For Captain
                    }
                    // vice captain
                    else if(uplayer.role==2){ 
                      rows[i].vcaptain = 1; // For Vice captain
                    }

                    rows[i].score = CalculateMultipliers.initialPoints(rows[i].playingXi,rows[i].score,scoringPoints);
                    rows[i].score = CalculateMultipliers.getTotalScore(rows[i],uplayer.role,rows[i].score,
                      scoringPoints,
                    uplayer.players().playerKey,
                    uplayer.seriesPlayers.type,
                    rows[i].team);

                    mStatus = rows[i].status;

                    if(rows[i].playingStatus==null)
                      playingStatus='notout';
                    else
                      playingStatus=rows[i].playingStatus;

                    totalpoints = parseFloat(totalpoints+rows[i].score);
                    let credits = CalculateMultipliers.getPlayerCredits(match_key,match_type,uplayer.seriesPlayers);
                    
                    // Final Players data with scores
                    players.push({
                        player_key: rows[i].playerKey,
                        player_name: rows[i].playerName,
                        playing_status: playingStatus,
                        striker_key: rows[i].strikerKey,
                        nonstriker_key: rows[i].nonStrikerKey,
                        striker_name: rows[i].strikerName,
                        nonstriker_name: rows[i].nonstrikerName,
                        credits: String(credits),
                        team_name: rows[i].team,
                        team_fullname: rows[i].teamFullname,
                        type: uplayer.seriesPlayers.type,
                        team_id:String(uplayer.seriesTeamId),
                        user_team_id:String(uplayer.user_team_id),
                        row_id: String(uplayer.id),
                        player_id: uplayer.playerId,
                        id:String(uplayer.playerId),
                        captain: rows[i].captain,
                        score: rows[i].score,
                        role: uplayer.role,
                        vcaptain: rows[i].vcaptain,
                        playingXi: rows[i].playingXi,
                        order: uplayer.order
                    });
                  }

                });
              }
              
              players.sort(function(a, b) {
                return parseInt(a.order) - parseInt(b.order);
              });

              if(matchStatus=='started'){
                matchStatus='live';
              }

                  CustomQuery.updateScores(client,totalpoints).then((totalpoints)=>{
                    CustomQuery.updateRank(client.match_contest_id).then((data)=>{
                      CustomQuery.getRank(client.user_id,client.match_contest_id).then((data)=>{
                        // Final Data
                        finalData = {response:
                          {
                            ssid: client.id,
                            matchStatus:matchStatus,
                            statusOverview: 'statusOverview',
                            batting: batting, 
                            overPlayed: currentOver,
                            innings: innings,
                            totalInningsOver: totalInningsOver,
                            yourScore: totalpoints,
                            currentPosition: String(data[0].rank),
                            totalcontests: data[0].total,
                            topTeamScore: data[0].top_team_score,
                            matchContestId:String(client.match_contest_id),
                            players: players
                          },
                          status:'success'};
                          if(matchStatus=='completed'){
                            saveFinalScores.saveScores(finalData);
                          }  
                        resolve(finalData);
                      });
                    });
                    
                  });

          });
        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
      }*/


       // Before match begins set Zero Points
       setZeroPoints(match_key, match_type, userplayers){
        return new Promise((resolve, reject) => {
            var players=[],finalData=[];
            //console.log(userplayers);
            //console.log('*****************************');
            for(let i=0;i<userplayers.length;i++){
              //console.log(userplayers[i].seasonTeams());
                var captain=0,vcaptain=0;
                // captain
                if(userplayers[i].role==1){
                    captain=1;
                }
                // vice captain
                else if(userplayers[i].role==2){
                    vcaptain=1;
                }


                let credits = CalculateMultipliers.getPlayerCredits(match_key,match_type,userplayers[i].seriesPlayers);

                players.push({
                  match_key: '',
                  player_key: userplayers[i].players().playerKey,
                  ballsFaced: 0,
                  nblfs: 0,
                  blfs: 0,
                  playerFullname: '',
                  player_name: userplayers[i].players().playerName,
                  team_id:String(userplayers[i].seriesTeamId),
                  user_team_id:String(userplayers[i].user_team_id),
                  row_id: String(userplayers[i].id),
                  player_id: userplayers[i].playerId,
                  id:String(userplayers[i].playerId),
                  matchType: '',
                  captain: 0,
                  vcaptain: 0,
                  playingRole:'',
                  credits: String(credits),
                  team_name:userplayers[i].seasonTeams().teamKey,
                  teamFullname: userplayers[i].seasonTeams().teamName,
                  type:userplayers[i].seriesPlayers.type,
                  playingXi: 0,
                  playingStatus: '',
                  strikerKey: '',
                  nonstrikerKey: '',
                  battingTeamKey: '',
                  status:'',
                  statusOverview: '',
                  innings: '',
                  currentOver: '',
                  totalInningsOver: '',
                  score:0,
                  order:String(userplayers[i].order),
                  role:String(userplayers[i].role)
                });
            }


            finalData = {response:
                {
                  matchStatus:'active',
                  statusOverview: 'statusOverview',
                  batting: '-', 
                  overPlayed: 0.0,
                  innings: 0,
                  totalInningsOver: 0,
                  yourScore: 0,
                  matchContestId:"0",
                  players: players
                },
            status:'success'};

            resolve(finalData);    

        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
       } 



       // Max Bash Log Files 
    genericMaxbashScores(match_key, match_type,scoringPoints,overdetail){
      return new Promise((resolve, reject) => {
        if(headerMaxBashBool==0){
          let maxbashHeader='Over \t PlayerName \t BallsFaced \t blfs \t nblfs \t isOut \n\r';
          fs.appendFile('generic_'+match_key+'_max_bash.xlsx', maxbashHeader, function(err) {
            if (err) throw err;
          });
        }
        headerMaxBashBool=1;  
  
        CustomQuery.maxBashData(match_key).then((rows)=>{
          var counterLength= rows.length;
          var item = rows[rows.length-counterLength];
          maxbashXlsx(item);

          function maxbashXlsx(item){
            
            setTimeout(() => {
              fs.appendFile('generic_'+match_key+'_max_bash.xlsx', overdetail+ '\t' +item.playerName+ '\t' + item.ballFaced + '\t' + item.blfs +'\t'+ item.nblfs +'\t'+ item.playing_status + '\t' + item.scoringparams +'\n\r', function(err) {
                if (err) throw err;

                nextcallback();
                
              });    
            }, 100);
          }

          function nextcallback(){
            counterLength--;
            if(counterLength==0){
              fs.appendFile('generic_'+match_key+'_max_bash.xlsx','\n\r', function(err) {
                if (err) throw err;
              });
              console.log('**Max Bash Logs**');
              resolve('success');
            }else{
              maxbashXlsx(rows[rows.length-counterLength]);
            }
          }
          
        });

      });

    }


       // Fast Score Log Files
       genericFastScores(match_key, match_type,scoringPoints,overdetail){
        return new Promise((resolve, reject) => {
          if(headerFastScoreBool==0){
            let fastscoreHeader='Over \t PlayerName \t BallsFaced \t score \t isOut \n\r';
            fs.appendFile('generic_'+match_key+'_fast_score.xlsx', fastscoreHeader, function(err) {
              if (err) throw err;
            });
          }
          headerFastScoreBool=1;  
    
          CustomQuery.FastScoreData(match_key).then((rows)=>{
            
            var counterLength= rows.length;
            var item = rows[rows.length-counterLength];
            fastScoreXlsx(item);
  
            function fastScoreXlsx(item){
              
              setTimeout(() => {
                fs.appendFile('generic_'+match_key+'_fast_score.xlsx', overdetail+ '\t' +item.playerName+ '\t' + item.ballFaced + '\t'+ item.score + '\t' + item.playing_status + '\t' + item.scoringparams_fastscore +'\n\r', function(err) {
                  if (err) throw err;
  
                  nextcallback();
                  
                });    
              }, 100);
            }
  
            function nextcallback(){
              counterLength--;
              if(counterLength==0){
                fs.appendFile('generic_'+match_key+'_fast_score.xlsx','\n\r', function(err) {
                  if (err) throw err;
                });
                console.log('**Fast Score Logs**');
                resolve('success');
              }else{
                fastScoreXlsx(rows[rows.length-counterLength]);
              }
            }
            
          });
  
        });
  
      }

      // Max Boundary Log files

      genericMaxBoundaryLogs(match_key, match_type,scoringPoints,overdetail,league_code){
        return new Promise((resolve, reject) => {
          if(headerMaxBoundaryBool==0){
            let fastscoreHeader='Over \t PlayerName \t BallsFaced \t score \t isOut \n\r';
            fs.appendFile('generic_'+match_key+'_'+league_code+'.xlsx', fastscoreHeader, function(err) {
              if (err) throw err;
            });
          }
          headerMaxBoundaryBool=1; 

          CustomQuery.maxScoreMaxBoundary(match_key,league_code).then((rows)=>{
            var counterLength= rows.length;
            var item = rows[rows.length-counterLength];

            MaxXlsx(item);
  
            function MaxXlsx(item){
              
              setTimeout(() => {
                fs.appendFile('generic_'+match_key+'_'+league_code+'.xlsx', overdetail+ '\t' +item.playerName+ '\t' + item.ballFaced + '\t'+ item.score + '\t' + item.playing_status + '\t' + item.scoringparams_maxboundary +'\n\r', function(err) {
                  if (err) throw err;
  
                  nextcallback();
                  
                });    
              }, 100);
            }

            function nextcallback(){
              counterLength--;
              if(counterLength==0){
                fs.appendFile('generic_'+match_key+'_'+league_code+'.xlsx','\n\r', function(err) {
                  if (err) throw err;
                });
                console.log('**'+league_code+' Logs**');
                resolve('success');
              }else{
                MaxXlsx(rows[rows.length-counterLength]);
              }
            }
          });

        }).catch(function(err) {
          console.error('Oops we have an error', err);
          reject(err);
        });
      }


      // Max Score Log files

      genericMaxScoreLogs(match_key, match_type,scoringPoints,overdetail,league_code){
        return new Promise((resolve, reject) => {
          if(headerMaxScoreBool==0){
            let fastscoreHeader='Over \t PlayerName \t BallsFaced \t score \t isOut \n\r';
            fs.appendFile('generic_'+match_key+'_'+league_code+'.xlsx', fastscoreHeader, function(err) {
              if (err) throw err;
            });
          }
          headerMaxScoreBool=1; 

          CustomQuery.maxScoreMaxBoundary(match_key,league_code).then((rows)=>{
            var counterLength= rows.length;
            var item = rows[rows.length-counterLength];

            MaxXlsx(item);
  
            function MaxXlsx(item){
              
              setTimeout(() => {
                fs.appendFile('generic_'+match_key+'_'+league_code+'.xlsx', overdetail+ '\t' +item.playerName+ '\t' + item.ballFaced + '\t'+ item.score + '\t' + item.playing_status + '\t' + item.scoringparams_maxscore +'\n\r', function(err) {
                  if (err) throw err;
  
                  nextcallback();
                  
                });    
              }, 100);
            }

            function nextcallback(){
              counterLength--;
              if(counterLength==0){
                fs.appendFile('generic_'+match_key+'_'+league_code+'.xlsx','\n\r', function(err) {
                  if (err) throw err;
                });
                console.log('**'+league_code+' Logs**');
                resolve('success');
              }else{
                MaxXlsx(rows[rows.length-counterLength]);
              }
            }
          });

        }).catch(function(err) {
          console.error('Oops we have an error', err);
          reject(err);
        });
      }

  }

module.exports = new FinalScores();