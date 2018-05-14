var overPlayed, score, scoringmatrix, points=0,  player_achieved=0, subpoints = [], everyFiveBalls=0, maxbash=[];
var app = require('./server');
var async= require("async");
const fs = require('fs');
var headerBool=0;

class CalculatePlayerPoints {
    constructor() {
      
    }

    // Get Applicable rules
    getBatsmanApplicableRules(match_type, leagueId){
      
      return new Promise((resolve, reject) => {
        

        const ScoringMatricesParams = app.models.ScoringMatricesParams;
        const leagues = app.models.LeaguePoints;
        var applicable={thres_runs:0,thres_ball_faced:0,thres_ball_faced_bound:0};
        const connector = app.dataSources.mySQLDatasource.connector;
        const sql="SELECT lp.id,lp.league_id,lp.param_id,lp.T20,lp.ODI,lp.ball_limit,lp.status,smp.name, smp.playertype,smp.code,smp.operation,smp.group_order FROM `league_points` lp inner join scoring_matrix_params smp on smp.id=lp.param_id where smp.group_order=0 and lp.league_id="+leagueId+" and smp.playertype='batsman'";
        
        connector.execute(sql, null, (err, rows) => {
        
          if(rows.length>0){
            for(let i=0;i<rows.length;i++){
              if(match_type=='t20'){
                
                if(rows[i].T20==null || rows[i].T20==''){
                  rows[i].T20=0; 
                }

                if(rows[i].code=='thres_runs'){
                  applicable.thres_runs=rows[i].T20;
                }

                if(rows[i].code=='thres_ball_faced'){
                  applicable.thres_ball_faced=rows[i].T20;
                }

                if(rows[i].code=='thres_ball_faced_bound'){
                  applicable.thres_ball_faced_bound=rows[i].T20;
                }


              }else{
                if(rows[i].ODI==null || rows[i].ODI==''){
                  rows[i].ODI=0;
                }

                if(rows[i].code=='thres_runs'){
                  applicable.thres_runs=rows[i].ODI;
                }

                if(rows[i].code=='thres_ball_faced'){
                  applicable.thres_ball_faced=rows[i].ODI;
                }

                if(rows[i].code=='thres_ball_faced_bound'){
                  applicable.thres_ball_faced_bound=rows[i].ODI;
                }
              }
            }
            
            resolve(applicable)
          }
        });

        }).catch(function(err) {
          console.error('Oops we have an error', err);
          reject(err);
      });

    }

    // Get Bowler Applicable rules
    getBowlerApplicableRules(match_type, leagueId){
      
      return new Promise((resolve, reject) => {
        const ScoringMatricesParams = app.models.ScoringMatricesParams;
        const leagues = app.models.LeaguePoints;
        var applicable={thres_bowl_overs:0};
        const connector = app.dataSources.mySQLDatasource.connector;
        const sql="SELECT lp.id,lp.league_id,lp.param_id,lp.T20,lp.ODI,lp.ball_limit,lp.status,smp.name, smp.playertype,smp.code,smp.operation,smp.group_order FROM `league_points` lp inner join scoring_matrix_params smp on smp.id=lp.param_id where smp.group_order=0 and lp.league_id="+leagueId+" and smp.playertype='bowler'";
        
        connector.execute(sql, null, (err, rows) => {
          if(rows.length>0){
            for(let i=0;i<rows.length;i++){
              if(match_type=='t20'){
                
                if(rows[i].T20==null || rows[i].T20==''){
                  rows[i].T20=0; 
                }

                if(rows[i].code=='thres_bowl_overs'){
                  applicable.thres_bowl_overs=rows[i].T20;
                }

              }else{
                if(rows[i].ODI==null || rows[i].ODI==''){
                  rows[i].ODI=0;
                }

                if(rows[i].code=='thres_bowl_overs'){
                  applicable.thres_bowl_overs=rows[i].ODI;
                }

              }
            }
            resolve(applicable)
          }
        });

        }).catch(function(err) {
          console.error('Oops we have an error', err);
          reject(err);
      });

    }




    getTossPoints(match_key, leagueId, match_type){
      return new Promise((resolve, reject) => {
        
        // Toss Won
        const matchesPlayers = app.models.MatchesPlayers;
        const leagues = app.models.LeaguePoints;
        var points=0;

        leagues.findOne({
          where: {leagueId: leagueId },
          include: {
            relation: 'ScoringMatrixParams',
            scope: {
              where: {playertype: 'all',code:'tw'}
            }
          }
        }, function(err, rows){
          console.log('captain points');
          if(rows.length!=0){
            if(match_type=='t20'){
              points=rows.t20;
            }else{
              points=rows.odi;
            }
          }else{
            points=0;
          }
          resolve(points);
        });
      });
    }

    getplayingXiPoints(match_key, leagueId, match_type){
      return new Promise((resolve, reject) => {
        const matchesPlayers = app.models.MatchesPlayers;
        const leagues = app.models.LeaguePoints;
        var points=0;

        leagues.findOne({
          where: {leagueId: leagueId },
          include: {
            relation: 'ScoringMatrixParams',
            scope: {
              where: {playertype: 'all',code:'starting11'}
            }
          }
        }, function(err, rows){
          console.log('captain points');
          if(rows.length!=0){
            if(match_type=='t20'){
              points=rows.t20;
            }else{
              points=rows.odi;
            }
          }else{
            points=0;
          }
          resolve(points);
        });
      });
    }

    getPoints(match_key, leagueId, match_type,playertype,code){
      return new Promise((resolve, reject) => {
        var returnData={};
        const connector = app.dataSources.mySQLDatasource.connector;
        const sql="SELECT lp.id, lp.league_id, lp.T20, lp.ODI, lp.ball_limit, smp.code, smp.playertype, smp.operation, smp.group_order FROM `league_points` lp INNER JOIN scoring_matrix_params smp ON smp.id = lp.param_id AND smp.code = '"+code+"' WHERE lp.league_id ="+leagueId;
        
        connector.execute(sql, null, (err, rows) => {
          
          if(rows.length!=0){
            if(match_type=='t20'){
              returnData={points: rows[0].T20,operation:rows[0].operation}
            }else{
              returnData={points: rows[0].ODI,operation:rows[0].operation}
            }
        }else{
          returnData={points: 0,operation:1}
        }
          resolve(returnData); 
       });
      });
    }




    batsmanPoints(match_key, match_type, leagueId, league_code, batsmanInstance, applicableRules, overdetail){
      var leagues = app.models.LeaguePoints;
      var batsmanPerformance = app.models.BatsmanPerformance;
      var Batsman_score = app.models.BatsmanScores;
        
        leagues.find({
          where: {leagueId: leagueId },
          include: {
            relation: 'ScoringMatrixParams',
            scope: {
              where: {playertype: 'batsman'}
            }
          }
        }, function(err, rows){

          batsmanPerformance.find(
            { order: 'currentOverStr ASC',
              where: {matchkey: match_key}
            }, function(err, batsmanrow){
            //console.log('Batsman Performance');

            async.each(batsmanrow, function(batsman, callback) {
              var scoringparams_maxbash='';
              var scoringparams_fastscore='';
              var scoringparams_maxboundary='';
              var scoringparams_maxscore='';

              overPlayed = batsman.currentoverstr;
              batsman.score = 0;
              score = 0;
              batsman.playing_status = 'notout';
              for(var i=0;i<rows.length;++i){
                if(rows[i].ScoringMatrixParams()!==null){
                  if(match_type=='t20'){
                    points = rows[i].t20;
                  }else{
                    points = rows[i].odi;
                  }

                  if(points==null){
                     points = 0;
                  }


                  scoringmatrix = JSON.parse(JSON.stringify(rows[i].ScoringMatrixParams()));
                  
                  function savefile(filename,text){
                    fs.appendFile(batsmanInstance.overStr+'.txt', text, function(err) {
                      if (err) throw err;
                      // console.log('file saved');
                    });
                  }

                  switch (scoringmatrix.code) {
                                
                    // Batsman Not Out
                    case 'no':
                    // savefile(batsmanInstance.overStr+'.txt', 'league: '+league_code+' code: '+scoringmatrix.code+'==> \n\r');
                      if(batsman.wicket == 0){
                        player_achieved = 0;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }else{
                        batsman.playing_status = 'out';
                        //scoringmatrix.operation = 3; // Do nothing
                      }
                      break;
            
                    // Runs Scored  
                    case 'rs':
                      if(batsman.runsscored>0){
                        player_achieved = batsman.runsscored;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
            
                    // Runs scored by running  
                    case 'rsr':
                      if(batsman.running>0){
                        player_achieved = batsman.running;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
            
                    // Runs scored by hitting 4s  
                    case 'rs4':
                      if(batsman.runsbyfour>0){
                        player_achieved = batsman.runsbyfour;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
                    
                    //Runs scored by hitting 6s  
                    case 'rs6':
                      if(batsman.runsbysix>0){
                        player_achieved = batsman.runsbysix;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
            
                    // Dismissal for duck  
                    case 'duck':
                      if(batsman.runsscored==0 && batsman.wicket==1 && batsman.ballsFaced==0){
                        player_achieved = 0;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
                      
                    // Every 4 hit  
                    case '4s':
                      if(batsman.totalfour>0){
                        player_achieved = batsman.totalfour;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
            
                    // Every six hit  
                    case '6s':
                      if(batsman.totalsix>0){
                        player_achieved = batsman.totalsix;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;  
                    
                    // 3 fours or higher  
                    case '3_4s':
                      if(batsman.totalfour>=3 && batsman.totalfour<=4){
                        player_achieved = 0;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break; 
                      
                    // 5 fours or higher  
                    case '5_4s':
                      if(batsman.totalfour>=5 && batsman.totalfour<=6){
                        player_achieved = 0;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
                    
                    // 7 fours or higher  
                    case '7_4s':
                      if(batsman.totalfour>=7 && batsman.totalfour<=8){
                        player_achieved = 0;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
                    
                    // 9 fours or higher
                    case '9_4s':
                      if(batsman.totalfour>=9){
                        player_achieved = 0;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
                    
                    // 2 sixes or higher  
                    case '2_6s':
                      if(batsman.totalsix>=2 && batsman.totalsix<=3){
                        player_achieved = 0;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
            
            
                    // 4 sixes or higher
                    case '4_6s':
                      if(batsman.totalsix>=4 && batsman.totalsix<=5){
                        player_achieved = 0;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;  
                    
                    // 6 sixes or higher  
                    case '6_6s':
                      if(batsman.totalsix>=6 && batsman.totalsix<=7){
                        player_achieved = 0;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;  
                    
                    // 8 sixes or higher  
                    case '8_6s':
                      if(batsman.totalsix>=8){
                        player_achieved = 0;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;  
                    
                    // Runs 25 or higher  
                    case '25r':
                      if(batsman.runsscored>=25 && batsman.runsscored<=49){
                        player_achieved = 0;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;  
                    
                    // Runs 50 or higher  
                    case '50r':
                      if(batsman.runsscored>=50 && batsman.runsscored<=74){
                        player_achieved = 0;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break; 
            
                    // Runs 75 or higher  
                    case '75r':
                      if(batsman.runsscored>=75 && batsman.runsscored<=99){
                        player_achieved = 0;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
                    
                    // Runs 100 or higher  
                    case '100r':
                      if(batsman.runsscored>=100){
                        player_achieved = 0;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
                      
                    // Applicable for players scoring minimum runs of 20
                    // > 20 but <= 40 
                    case '25_40r':
                      if(batsman.runsscored>=applicableRules.thres_runs && batsman.percentrunsscoredinboundary>20 && batsman.percentrunsscoredinboundary<=40 ){
                        player_achieved = batsman.totalfour + batsman.totalsix;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;  
                    
                    // > 40 but <= 60 
                    case '40_60r':
                      if(batsman.runsscored>=applicableRules.thres_runs && batsman.percentrunsscoredinboundary>40 && batsman.percentrunsscoredinboundary<=60 ){
                        player_achieved = batsman.totalfour + batsman.totalsix;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;  
            
                    // > 60 but <= 80 
                    case '60_80r':
                      if(batsman.runsscored>=applicableRules.thres_runs && batsman.percentrunsscoredinboundary>60 && batsman.percentrunsscoredinboundary<=80 ){
                        player_achieved = batsman.totalfour + batsman.totalsix;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
            
                    // > 80 but <= 100 
                    case '80_100r':
                      if(batsman.runsscored>=applicableRules.thres_runs && batsman.percentrunsscoredinboundary>80 && batsman.percentrunsscoredinboundary<=100 ){
                        player_achieved = batsman.totalfour + batsman.totalsix;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
            
                    // > 100
                    case 'gt_100r':
                      if(batsman.runsscored>=applicableRules.thres_runs && batsman.percentrunsscoredinboundary>100){
                        player_achieved = batsman.totalfour + batsman.totalsix;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;  
            
            
                    // Strike Rate (per 100 balls) --Bonus Every 5 balls faced
                    // Applicable for players batting minimum balls 10
            
                    // > 100  but <= 150
                    case '100_150sr':
                      if(batsman.ballsfaced>=applicableRules.thres_ball_faced && batsman.strikerate>100 && batsman.strikerate<=150){
                        everyFiveBalls =  batsman.ballsfaced - batsman.ballsfaced%5;
                        player_achieved = (everyFiveBalls)/5;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break; 
                      
                    // > 150 but <= 200
                    case '150_200sr':
                      if(batsman.ballsfaced>=applicableRules.thres_ball_faced && batsman.strikerate>150 && batsman.strikerate<=200){
                        everyFiveBalls =  batsman.ballsfaced - batsman.ballsfaced%5;
                        player_achieved = (everyFiveBalls)/5;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
            
                    // > 200
                    case 'gt200sr':
                      if(batsman.ballsfaced>=applicableRules.thres_ball_faced && batsman.strikerate>200){
                        everyFiveBalls =  batsman.ballsfaced - batsman.ballsfaced%5;
                        player_achieved = (everyFiveBalls)/5;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break; 
                      
                    // < 70 but >=60
                    case '70_60sr':
                      if(batsman.ballsfaced>=applicableRules.thres_ball_faced && batsman.strikerate>=60 && batsman.strikerate<70){
                        everyFiveBalls =  batsman.ballsfaced - batsman.ballsfaced%5;
                        player_achieved = (everyFiveBalls)/5;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;  
            
                    // < 60 but >=50
                    case '60_50sr':
                      if(batsman.ballsfaced>=applicableRules.thres_ball_faced && batsman.strikerate>=50 && batsman.strikerate<60){
                        everyFiveBalls =  batsman.ballsfaced - batsman.ballsfaced%5;
                        player_achieved = (everyFiveBalls)/5;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
            
                    // < 50
                    case 'lt50sr':
                      if(batsman.ballsfaced>=applicableRules.thres_ball_faced && batsman.strikerate<50){
                        everyFiveBalls =  batsman.ballsfaced - batsman.ballsfaced%5;
                        player_achieved = (everyFiveBalls)/5;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
            
                    // Runs scored (by running) in First 5 overs of an inning 
                    case 'rs_f5o':
                      player_achieved = batsman.first5oversRunning;
                      score = scoringpoints(scoringmatrix, points, player_achieved);
                      subpoints.push(score);
                      break;    
            
                    // 4s hit in First 5 overs of an inning
                    case '4s_f5o':
                      player_achieved = batsman.first5overs4s;
                      score = scoringpoints(scoringmatrix, points, player_achieved);
                      subpoints.push(score);
                      break;  
            
                    // 6s hit in First 5 overs of an inning
                    case '6s_f5o':
                      player_achieved = batsman.first5overs6s;
                      score = scoringpoints(scoringmatrix, points, player_achieved);
                      subpoints.push(score);
                      break;   
                    
                    // Runs scored (by running) in Last 5 overs of an inning
                    case 'rs_l5o':
                      player_achieved = batsman.last5oversRunning;
                      score = scoringpoints(scoringmatrix, points, player_achieved);
                      subpoints.push(score);
                      break; 
            
                    // 4s hit in Last 5 overs of an inning
                    case '4s_l5o':
                      player_achieved = batsman.last5overs4s;
                      score = scoringpoints(scoringmatrix, points, player_achieved);
                      subpoints.push(score);
                      break;
            
                    // 6s hit in Last 5 overs of an inning
                    case '6s_l5o':
                      player_achieved = batsman.last5overs6s;
                      score = scoringpoints(scoringmatrix, points, player_achieved);
                      subpoints.push(score);
                      break;
            
                    // % balls faced hit for Four and Sixes - Bonus pts per boundary
                    // > 10 but <=20
                    case '10_20_46':
                      if(batsman.ballsfaced>=applicableRules.thres_ball_faced_bound && batsman.percentballsfacedtohitboundary>10 && batsman.percentballsfacedtohitboundary<=20){
                        player_achieved = 1;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;    
                      
                    // > 20 but <=30
                    case '20_30_46':
                      if(batsman.ballsfaced>=applicableRules.thres_ball_faced_bound && batsman.percentballsfacedtohitboundary>20 && batsman.percentballsfacedtohitboundary<=30){
                        player_achieved = 1;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;    
                      
                    // > 30 but <=40
                    case '30_40_46':
                      if(batsman.ballsfaced>=applicableRules.thres_ball_faced_bound && batsman.percentballsfacedtohitboundary>30 && batsman.percentballsfacedtohitboundary<=40){
                        player_achieved = 1;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
                      
                    // > 40 but <=50
                    case '40_50_46':
                      if(batsman.ballsfaced>=applicableRules.thres_ball_faced_bound && batsman.percentballsfacedtohitboundary>40 && batsman.percentballsfacedtohitboundary<=50){
                        player_achieved = 1;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
                      
                    // > 50
                    case 'gt50sr':
                      if(batsman.ballsfaced>=applicableRules.thres_ball_faced_bound && batsman.percentballsfacedtohitboundary>50){
                        player_achieved = 1;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;  
                  
                    default:
                      break;
                  }


                  function scoringpoints(scoringmatrix, points, player_achieved){
                    let player_score = 0;
                    if(scoringmatrix.operation==1)        // Addition
                    {   
                        player_score = points + player_achieved;
                        if(league_code=='max_bash'){
                          scoringparams_maxbash+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points + player_activity) =>  '+points+' + '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='fast_run'){
                          scoringparams_fastscore+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points + player_activity) =>  '+points+' + '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='max_boundary'){
                          scoringparams_maxboundary+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points + player_activity) =>  '+points+' + '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='max_score'){
                          scoringparams_maxscore+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points + player_activity) =>  '+points+' + '+player_achieved+' = '+player_score+' \t ';
                        }

                        
                    }
                    else if(scoringmatrix.operation==2)    // Multiply
                    { 
                        player_score = points * player_achieved;
                        if(league_code=='max_bash'){
                          scoringparams_maxbash+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points * player_activity) =>  '+points+' * '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='fast_run'){
                          scoringparams_fastscore+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points * player_activity) =>  '+points+' * '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='max_boundary'){
                          scoringparams_maxboundary+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points * player_activity) =>  '+points+' * '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='max_score'){
                          scoringparams_maxscore+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points * player_activity) =>  '+points+' * '+player_achieved+' = '+player_score+' \t ';
                        }

                        
                    }
                    else                                  // Do nothing
                    {
                      player_score = 0;
                    }

                    return player_score;

                  }


                  if(subpoints.length>0){
                    batsman.score = subpoints.reduce(add);
                  }

                  
                  
                }
              }

              function add(total, num) {
                return parseFloat(total + num);
              }
              
              // Update batsman points

              var batsmanPlayerKey = batsman.playerkey;
              var batsmanTeam = batsman.team;
              var newscore = batsman.score;
              var playingStatus = batsman.playing_status;
              //console.log('League  is '+league_code);

              
              console.log("Actual score ="+newscore);
              console.log('');

              if(league_code=='max_bash'){
                console.log('"'+league_code+'" '+batsmanPlayerKey+' score: '+newscore);
                maxBash(batsmanInstance, newscore, leagueId, match_key, batsmanPlayerKey, batsmanTeam, batsman);
              }

              else if(league_code=='fast_run'){
                console.log('"'+league_code+'" '+batsmanPlayerKey+' score: '+newscore);
                fastRun(batsmanInstance, newscore, leagueId, match_key, batsmanPlayerKey, batsmanTeam, batsman);
              }

              else if(league_code=='max_boundary'){
                console.log('"'+league_code+'" '+batsmanPlayerKey+' score: '+newscore);
                maxBoundary(batsmanInstance, newscore, leagueId, match_key, batsmanPlayerKey, batsmanTeam, batsman);
              }
              else if(league_code=='max_score'){
                console.log('"'+league_code+'" '+batsmanPlayerKey+' score: '+newscore);
                maxScore(batsmanInstance, newscore, leagueId, match_key, batsmanPlayerKey, batsmanTeam, batsman);
              }



              // Maxboundary Points

              function maxBoundary(batsmanInstance, newscore, leagueId, match_key, batsmanPlayerKey, batsmanTeam, batsman){
                if(batsmanInstance.playerKey==batsmanPlayerKey){
                  batsmanInstance.updateAttributes({'maxboundaryPoints':newscore ,'scoringparams_maxboundary':scoringparams_maxboundary},function(err, updatedrow){
                    console.log('  ');
                    
                  });
                }
              }

              // maxScore Points

              function maxScore(batsmanInstance, newscore, leagueId, match_key, batsmanPlayerKey, batsmanTeam, batsman){
                if(batsmanInstance.playerKey==batsmanPlayerKey){
                  batsmanInstance.updateAttributes({'maxscorePoints':newscore ,'scoringparams_maxscore':scoringparams_maxscore},function(err, updatedrow){
                    console.log('  ');
                    
                  });
                }
              }


              // Calculate fast Run Batsman points 
              function fastRun(batsmanInstance, newscore, leagueId, match_key, batsmanPlayerKey, batsmanTeam, batsman){
                if(batsmanInstance.playerKey==batsmanPlayerKey){
                  batsmanInstance.updateAttributes({'fastRunPoints': newscore,'scoringparams_fastscore':scoringparams_fastscore},function(err, updatedrow){
                    console.log('  ');
                    
                  });
                }
              }

              // Calculate maxbash ball limit factor score
              function maxBash(batsmanInstance, newscore, leagueId, match_key, batsmanPlayerKey, batsmanTeam, batsman){
                if(batsmanInstance.playerKey==batsmanPlayerKey){

                  batsmanInstance.updateAttributes({'blfs': newscore,'scoringparams': scoringparams_maxbash},function(err, updatedrow){
                    console.log('  ');
                    
                  });
                }
              }

              

              subpoints=[];

            });  
            
          });
        });
        return 1;
    }

    // Rules for Bowler
    bowlerPoints(match_key, match_type, leagueId, league_code, bowlerInstance, applicableRules){
      
      var leagues = app.models.LeaguePoints;
      var bowlerPerformance = app.models.BowlerPerformance;
      var playerPoints = app.models.PlayerPoints;
      
      leagues.find({
        where: {leagueId: leagueId },
        include: {
          relation: 'ScoringMatrixParams',
          scope: {
            where: {playertype: 'bowler'}
          }
        }
      }, function(err, rows){



        bowlerPerformance.find({
          where:{matchKey: match_key},
          order:  'over_str ASC'
          }, function(err, bowlersrow){
            async.each(bowlersrow, function(bowler, callback) {
              var scoringparams_maxbash='';
              var scoringparams_fastscore='';
              var scoringparams_maxboundary='';
              var scoringparams_maxscore='';
              
              overPlayed = bowler.overstr;
              bowler.score = 0;
              score = 0;
              for(var i=0;i<rows.length;++i){
                if(rows[i].ScoringMatrixParams()!==null){

                  if(match_type=='t20'){
                    points = rows[i].t20;
                  }else{
                    points = rows[i].odi;
                  }

                  
                  scoringmatrix = JSON.parse(JSON.stringify(rows[i].ScoringMatrixParams()));
                  
                  
                  switch (scoringmatrix.code) {
                    // bold
                    case 'bold':
                      if(bowler.bowled>0){
                        player_achieved = bowler.bowled;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;

                     // caught & bold
                     case 'cb':
                     if(bowler.caughtBowled>0){
                       player_achieved = bowler.caughtBowled;
                       score = scoringpoints(scoringmatrix, points, player_achieved);
                       subpoints.push(score);
                     }
                     break;  
        
                    // lbw  
                    case 'lbw':
                      if(bowler.lbw>0){
                        player_achieved = bowler.lbw;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
        
                    // 3 wickets  
                    case '3w':
                    if(bowler.totalWickets==3){
                      player_achieved = bowler.totalWickets;
                      score = scoringpoints(scoringmatrix, points, player_achieved);
                      subpoints.push(score);
                    }
                      break;  
        
                    // 4 wickets  
                    case '4w':
                    if(bowler.totalWickets==4){
                      player_achieved = bowler.totalWickets;
                      score = scoringpoints(scoringmatrix, points, player_achieved);
                      subpoints.push(score);
                    }
                      break;  
        
                    // 5 wickets  
                    case '5w':
                    if(bowler.totalWickets==5){
                      player_achieved = bowler.totalWickets;
                      score = scoringpoints(scoringmatrix, points, player_achieved);
                      subpoints.push(score);
                    }
                      break;  
        
                    // No Balls
                    case 'nb':
                      if(bowler.noball>0){
                        player_achieved = bowler.noball;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;  
        
                    // Wide Balls
                    case 'wb':
                      if(bowler.wide>0){
                        player_achieved = bowler.wide;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break; 
                      
                    // Economy Rate - Bonus per over bowled
                    
                    // <= 4 runs per over
                    case '4rpo':
                      if(bowler.economy<=4 && bowler.totalOvers>=applicableRules.thres_bowl_overs){
                        player_achieved = bowler.totalOvers;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
                    
                    // > 4 but <=5
                    case '5rpo':
                      if(bowler.economy>4 && bowler.economy<=5 && bowler.totalOvers>=applicableRules.thres_bowl_overs){
                        player_achieved = bowler.totalOvers;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
                      
                    // >5 but <=6
                    case '6rpo':
                      if(bowler.economy>5 && bowler.economy<=6 && bowler.totalOvers>=applicableRules.thres_bowl_overs){
                        player_achieved = bowler.totalOvers;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;

                    // >6 but <= 9
                    case '9rpo':
                      if(bowler.economy>6 && bowler.economy<=9 && bowler.totalOvers>=applicableRules.thres_bowl_overs){
                        player_achieved = bowler.totalOvers;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;  
        
                    // >9 but <=10
                    case '10rpo':
                      if(bowler.economy>9 && bowler.economy<=10 && bowler.totalOvers>=applicableRules.thres_bowl_overs){
                        player_achieved = bowler.totalOvers;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
                      
                    // >10 but <=11
                    case '11rpo':
                      if(bowler.economy>10 && bowler.economy<=11 && bowler.totalOvers>=applicableRules.thres_bowl_overs){
                        player_achieved = bowler.totalOvers;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
        
                    // >11
                    case 'gt11rpo':
                      if(bowler.economy>11 && bowler.totalOvers>=applicableRules.thres_bowl_overs){
                        player_achieved = bowler.totalOvers;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;  
        
                    // Maiden over
                    case 'mo':
                      if(bowler.maiden>0){
                        player_achieved = bowler.maiden;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;
        
                    // Wicket - Hit Wicket
                    case 'hw':
                    if(bowler.hitwicket>0){
                        player_achieved = bowler.hitwicket;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                    }
                      break;

                    // Wicket-Caught -Baller
                    case 'caught':
                    if(bowler.catches>0){
                        player_achieved = bowler.catches;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                    }
                      break;  

                    // Wicket-Caught -Baller
                    case 'stump':
                    if(bowler.totalStumps>0){
                        player_achieved = bowler.totalStumps;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                    }
                      break;   
                      
                    // Wickets taken in First 5 overs of an inning
                    case 'wk_f5o':
                      if(bowler.first5oversWickets>0){
                        player_achieved = bowler.first5oversWickets;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break; 
        
                    // Maiden overs in First 5 overs of an inning
                    case 'mo_f5o':
                      if(bowler.first5oversMaiden>0){
                        player_achieved = bowler.first5oversMaiden;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;   
        
                    // No balls in First overs of an inning
                    case 'nb_f5o':
                      if(bowler.first5oversNoball>0){
                        player_achieved = bowler.first5oversNoball;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;   
        
                    // Wide balls in First 5 overs of an inning
                    case 'wb_f5o':
                      if(bowler.first5oversWideball>0){
                        player_achieved = bowler.first5oversWideball;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;   
        
                    // Wickets taken in Last 5 overs of an inning
                    case 'wk_l5o':
                      if(bowler.last5oversWickets>0){
                        player_achieved = bowler.last5oversWickets;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;  
                      
                    // Maiden overs in last 5 overs of an inning
                    case 'mo_l5o':
                      if(bowler.last5oversMaiden>0){
                        player_achieved = bowler.last5oversMaiden;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;    
        
                    // No balls in Last overs of an inning
                    case 'nb_l5o':
                      if(bowler.last5oversNoball>0){
                        player_achieved = bowler.last5oversNoball;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;    
        
                    // Wide balls in Last overs of an inning
                    case 'wb_l5o':
                      if(bowler.last5oversWideball>0){
                        player_achieved = bowler.last5oversWideball;
                        score = scoringpoints(scoringmatrix, points, player_achieved);
                        subpoints.push(score);
                      }
                      break;      
                              
                    default:
                      break;
                  }


                  function scoringpoints(scoringmatrix, points, player_achieved){
                    let player_score = 0;
                    if(scoringmatrix.operation==1)        // Addition
                    {   
                        player_score = points + player_achieved;
                        if(league_code=='max_bash'){
                          scoringparams_maxbash+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points + player_activity) =>  '+points+' + '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='fast_run'){
                          scoringparams_fastscore+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points + player_activity) =>  '+points+' + '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='max_boundary'){
                          scoringparams_maxboundary+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points + player_activity) =>  '+points+' + '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='max_score'){
                          scoringparams_maxscore+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points + player_activity) =>  '+points+' + '+player_achieved+' = '+player_score+' \t ';
                        }
                        //console.log(scoringmatrix.code+'=>'+points +'+' +player_achieved);
                        //console.log('score: '+score);
                    }
                    else if(scoringmatrix.operation==2)    // Multiply
                    { 
                        player_score = points * player_achieved;
                        if(league_code=='max_bash'){
                          scoringparams_maxbash+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points * player_activity) =>  '+points+' * '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='fast_run'){
                          scoringparams_fastscore+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points * player_activity) =>  '+points+' * '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='max_boundary'){
                          scoringparams_maxboundary+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points * player_activity) =>  '+points+' * '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='max_score'){
                          scoringparams_maxscore+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points * player_activity) =>  '+points+' * '+player_achieved+' = '+player_score+' \t ';
                        }
                        //console.log(scoringmatrix.code+'=>'+points +'*'+ player_achieved);
                        //console.log('score: '+score);
                    }
                    else
                    {
                      player_score = 0;
                    }

                    return player_score;

                  }

                  

                  if(subpoints.length>0){
                    bowler.score = subpoints.reduce(add);
                  }
                  
                }
              }

              function add(total, num) {
                return total + num;
              }

              // Update Bowler points
            
              var bowlerPlayerKey = bowler.playerKey;
              var bowlerTeam = bowler.team;
              var newscore = parseFloat(bowler.score);
              

              if(league_code=='max_bash'){
                console.log('"'+league_code+'" '+bowlerPlayerKey+' score: '+newscore);
                maxBash(bowlerInstance, newscore, leagueId, match_key, bowlerPlayerKey, bowlerTeam, bowler);
              }
              else if(league_code=='fast_run'){
                console.log('"'+league_code+'" '+bowlerPlayerKey+' score: '+newscore);
                fastRun(bowlerInstance, newscore, leagueId, match_key, bowlerPlayerKey, bowlerTeam, bowler);
              }
              else if(league_code=='max_boundary'){
                console.log('"'+league_code+'" '+bowlerPlayerKey+' score: '+newscore);
                maxBoundary(bowlerInstance, newscore, leagueId, match_key, bowlerPlayerKey, bowlerTeam, bowler);
              }
              else if(league_code=='max_score'){
                console.log('"'+league_code+'" '+bowlerPlayerKey+' score: '+newscore);
                maxScore(bowlerInstance, newscore, leagueId, match_key, bowlerPlayerKey, bowlerTeam, bowler);
              }
              
             

              // Maxboundary Points
              function maxBoundary(bowlerInstance, newscore, leagueId, match_key, bowlerPlayerKey, bowlerTeam, bowler){
                if(bowlerInstance.playerKey==bowlerPlayerKey){
                  bowlerInstance.updateAttributes({'maxboundaryPoints':newscore ,'scoringparams_maxboundary':scoringparams_maxboundary},function(err, updatedrow){
                    
                  });
                }
              }

              // maxScore Points
              function maxScore(bowlerInstance, newscore, leagueId, match_key, bowlerPlayerKey, bowlerTeam, bowler){
                if(bowlerInstance.playerKey==bowlerPlayerKey){
                  bowlerInstance.updateAttributes({'maxscorePoints':newscore ,'scoringparams_maxscore':scoringparams_maxscore},function(err, updatedrow){
                    
                  });
                }
              }

              // fastrun Points
              function fastRun(bowlerInstance, newscore, leagueId, match_key, bowlerPlayerKey, bowlerTeam, bowler){
                if(bowlerInstance.playerKey==bowlerPlayerKey){
                  bowlerInstance.updateAttributes({'fastrunPoints': newscore,'scoringparams_fastscore':scoringparams_fastscore},function(err, updatedrow){
                    
                  });
                }
              }

              // maxbash points
              function maxBash(bowlerInstance, newscore, leagueId, match_key, bowlerPlayerKey, bowlerTeam, bowler){
                if(bowlerInstance.playerKey==bowlerPlayerKey){
                  bowlerInstance.updateAttributes({'nblfs': newscore,'scoringparams':scoringparams_maxbash},function(err, updatedrow){
                    
                  });
                }
              }

            subpoints=[];

            });
          });
      });
      return 1;
    }

    // Rules for Fielder

    fielderPoints(match_key, match_type, leagueId, league_code, fielderInstance){

      var leagues = app.models.LeaguePoints;
      var fielderPerformance = app.models.FielderPerformance;
      var playerPoints = app.models.PlayerPoints;

      leagues.find({
        where: {leagueId: leagueId },
        include: {
          relation: 'ScoringMatrixParams',
          scope: {
            where: {playertype: 'fielder'}
          }
        }
      }, function(err, rows){

        fielderPerformance.find({
          where:{matchKey: match_key},
          order:  'over_str ASC'
          }, function(err, fielderRow){
            
            async.each(fielderRow, function(fielder, callback) {
              var scoringparams_maxbash='';
              var scoringparams_fastscore='';
              var scoringparams_maxboundary='';
              var scoringparams_maxscore='';
              overPlayed = fielder.overstr;
              fielder.score = 0;
              score = 0;
              for(var i=0;i<rows.length;++i){
                if(rows[i].ScoringMatrixParams()!==null){
                  
                  if(match_type=='t20'){
                    points = rows[i].t20;
                  }else{
                    points = rows[i].odi;
                  }

                  scoringmatrix = JSON.parse(JSON.stringify(rows[i].ScoringMatrixParams()));
                  switch (scoringmatrix.code) {
                    // Catches
                    case 'catch':
                      player_achieved = fielder.catch;
                      score = scoringpoints(scoringmatrix, points, player_achieved);
                      subpoints.push(score);
                      break;
        
                    // Stumps
                    case 'stump':
                      player_achieved = fielder.stump;
                      score = scoringpoints(scoringmatrix, points, player_achieved);
                      subpoints.push(score);
                      break;
        
                    // runout
                    case 'ro':
                      player_achieved = fielder.runout;
                      score = scoringpoints(scoringmatrix, points, player_achieved);
                      subpoints.push(score);
                      break;  
                  
                    default:
                      break;
                  }


                  function scoringpoints(scoringmatrix, points, player_achieved){
                    let player_score = 0;
                    if(scoringmatrix.operation==1)        // Addition
                    {   
                        player_score = points + player_achieved;
                        if(league_code=='max_bash'){
                          scoringparams_maxbash+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points + player_activity) =>  '+points+' + '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='fast_run'){
                          scoringparams_fastscore+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points + player_activity) =>  '+points+' + '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='max_boundary'){
                          scoringparams_maxboundary+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points + player_activity) =>  '+points+' + '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='max_score'){
                          scoringparams_maxscore+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points + player_activity) =>  '+points+' + '+player_achieved+' = '+player_score+' \t ';
                        }
                        
                    }
                    else if(scoringmatrix.operation==2)    // Multiply
                    { 
                        player_score = points * player_achieved;
                        if(league_code=='max_bash'){
                          scoringparams_maxbash+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points * player_activity) =>  '+points+' * '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='fast_run'){
                          scoringparams_fastscore+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points * player_activity) =>  '+points+' * '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='max_boundary'){
                          scoringparams_maxboundary+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points * player_activity) =>  '+points+' * '+player_achieved+' = '+player_score+' \t ';
                        }else if(league_code=='max_score'){
                          scoringparams_maxscore+=  scoringmatrix.code+' \t '+scoringmatrix.name+'=> (score = points * player_activity) =>  '+points+' * '+player_achieved+' = '+player_score+' \t ';
                        }
                        
                    }
                    else
                    {
                      player_score = 0;
                    }

                    return player_score;

                  }

                  

                  if(subpoints.length>0){
                    fielder.score = subpoints.reduce(add);
                  }

                  //subpoints.push(score);
                  //fielder.score = subpoints.reduce(add);
                }
              }

              function add(total, num) {
                return total + num;
              }

              
              // Update Fielder points
            
              var fielderPlayerKey = fielder.playerKey;
              var fielderTeam = fielder.team;
              var newscore = fielder.score;


              if(league_code=='max_bash'){
                console.log('"'+league_code+'" '+fielderPlayerKey+' score: '+newscore);
                maxBash(fielderInstance, newscore, leagueId, match_key, fielderPlayerKey, fielderTeam, fielder);
              }
              else if(league_code=='fast_run'){
                console.log('"'+league_code+'" '+fielderPlayerKey+' score: '+newscore);
                fastRun(fielderInstance, newscore, leagueId, match_key, fielderPlayerKey, fielderTeam, fielder);
              }
              else if(league_code=='max_boundary'){
                console.log('"'+league_code+'" '+fielderPlayerKey+' score: '+newscore);
                maxBoundary(fielderInstance, newscore, leagueId, match_key, fielderPlayerKey, fielderTeam, fielder);
              }
              else if(league_code=='max_score'){
                console.log('"'+league_code+'" '+fielderPlayerKey+' score: '+newscore);
                maxScore(fielderInstance, newscore, leagueId, match_key, fielderPlayerKey, fielderTeam, fielder);
              }
              

              // Maxboundary Points
              function maxBoundary(fielderInstance, newscore, leagueId, match_key, fielderPlayerKey, fielderTeam, fielder){
                if(fielderInstance.playerKey==fielderPlayerKey){
                  fielderInstance.updateAttributes({'maxboundaryPoints':newscore ,'scoringparams_maxboundary':scoringparams_maxboundary},function(err, updatedrow){
                    playerpoints(newscore, leagueId, match_key, fielderPlayerKey, fielderTeam, fielder);
                  });
                }
              }

              // maxScore Points
              function maxScore(fielderInstance, newscore, leagueId, match_key, fielderPlayerKey, fielderTeam, fielder){
                if(fielderInstance.playerKey==fielderPlayerKey){
                  fielderInstance.updateAttributes({'maxscorePoints':newscore ,'scoringparams_maxscore':scoringparams_maxscore},function(err, updatedrow){
                    playerpoints(newscore, leagueId, match_key, fielderPlayerKey, fielderTeam, fielder);
                  });
                }
              }

              // fastRun Points
              function fastRun(fielderInstance, newscore, leagueId, match_key, fielderPlayerKey, fielderTeam, fielder){
                if(fielderInstance.playerKey==fielderPlayerKey){
                  fielderInstance.updateAttributes({'fastrunPoints': newscore,'scoringparams_fastscore':scoringparams_fastscore},function(err, updatedrow){
                    playerpoints(newscore, leagueId, match_key, fielderPlayerKey, fielderTeam, fielder);
                  });
                }
              }

              // maxBash Points
              function maxBash(fielderInstance, newscore, leagueId, match_key, fielderPlayerKey, fielderTeam, fielder){
                if(fielderInstance.playerKey==fielderPlayerKey){
                  fielderInstance.updateAttributes({'nblfs': newscore,'scoringparams':scoringparams_maxbash},function(err, updatedrow){                    
                    playerpoints(newscore, leagueId, match_key, fielderPlayerKey, fielderTeam, fielder);
                  });
                }
              }

              function playerpoints(newscore, leagueId, match_key, fielderPlayerKey, fielderTeam, fielder){
                if (!fs.existsSync(match_key+'_fielder')){
                  fs.mkdirSync(match_key+'_fielder');
                }
                var fielderfile='\n\r'+fielderPlayerKey+': '+newscore+'\n\r';
                fs.appendFile(match_key+'_fielder/team_'+fielderInstance.team+'_'+fielderInstance.overStr+'.txt', fielderfile, function(err) {
                  if (err) throw err;
                  // console.log('file saved');
                });

              }

            subpoints=[];
              
            });
          });
      });
      return 1;
    }


}

module.exports = new CalculatePlayerPoints;