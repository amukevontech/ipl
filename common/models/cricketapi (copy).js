'use strict';

module.exports = function(Cricketapi) {
  var app = require('../../server/server');
  var async= require("async");
  var request = require('request');
  var CricketAPIServices = require('../../server/services');
  var matchStatus, previousOver,current_over, currentOverKey;
    // Ball By Ball API: 
    // @params: match_key, over, match_type

    function sum(total, num) {
      return total + num;
    }

    Cricketapi.ballbyball = function(match_key, over, match_type, cb){

        async.whilst(
          // test to perform next iteration
          function() {
            if(over==null && matchStatus=='completed'){
              console.log('Match completed and Over is null');
              return false;
            }else{
              console.log('Next Over =>'+over);
              return true;
            }
          },
          function(cricketCallback){
            //Define variables.
            
            var Batsman_score = app.models.BatsmanScores;
            var Bowler_score = app.models.BowlerScores;
            var Fielder_score = app.models.FielderScores;  
            var batsmanPerformance = app.models.BatsmanPerformance;
            var bowlerPerformance = app.models.BowlerPerformance;
            var fielderPerformance = app.models.FielderPerformance;
            var playerPoints = app.models.PlayerPoints;
            var leagues = app.models.LeaguePoints; 
            var match_stats = app.models.MatchStats;
            var bowling_team = "a";

                async.waterfall([

                  // If incase server is restarted and crashed then check following conditions

                  function(next){
                    match_stats.findOne({
                      where:{
                        matchKey: match_key
                      }
                    },function(err, row){
                      if(row!=null){
                        matchStatus = row.status;
                        
                        // If match was live and next over key was null then hit current over to get remaining over balls
                        if(row.nextOver==null && matchStatus=='started'){
                            over = row.overKey;
                        }else if(row.nextOver!=null && matchStatus=='started'){
                            over = row.nextOver;
                        }
                        console.log('over is===>');
                        console.log(over);
                        next(null, over);
                      }else{
                        next(null, over);
                      }
                    });
                  },
                  
                  // Insert Batsman data ball by ball

                  function (over, next) {
                    console.log('match_key='+match_key+' over='+over);

                    CricketAPIServices.ballByBall(match_key, over).then((data)=>{
                           var index = 0, ball_by_ball_runs=0;
                           over = data.next_over;
                           previousOver = data.pre_over;
                           current_over = data.over.over;
                           currentOverKey = data.over.team+'_'+data.over.innings+'_'+current_over;
                           data.over.balls.map(function(item,batsmanIndex){
                           ball_by_ball_runs = data.balls[item].batsman.runs;
                          
                          // If batsman hit 6 or 4 then save 6 and 4 in columns and update runs to 0
                          if(data.balls[item].batsman.six){
                            data.balls[item].batsman.six = 6;
                            data.balls[item].batsman.runs = 0;
                          }
                          if(data.balls[item].batsman.four){
                            data.balls[item].batsman.four = 4;
                            data.balls[item].batsman.runs = 0;
                          }

                          // Insert each ball played by Batsman 
                          Batsman_score.findOrCreate(
                            {where: {ballKey:item} },
                            {
                              matchKey: match_key,
                              ballKey: item,
                              team: data.balls[item].batting_team,
                              playerKey: data.balls[item].batsman.key,
                              overStr: data.balls[item].over_str,
                              over: data.balls[item].over,
                              ball: data.balls[item].ball,
                              runs: data.balls[item].batsman.runs,
                              playerBall: 0,
                              ballByBallRuns: ball_by_ball_runs,
                              dotball: data.balls[item].batsman.dotball,
                              six: data.balls[item].batsman.six,
                              four: data.balls[item].batsman.four,
                              ballCount: data.balls[item].batsman.ball_count,
                              out: data.balls[item].bowler.wicket,
                              nextOver: data.next_over
                            },function(err,results){
                                if(err)
                                console.log(err);
                                
                                index++;
                                //console.log(results);
                                console.log(index+'.) Batsman data saved.');

                                if( (Object.keys(data.over.balls).length-1) == index )
                                  next(null, data);
                            });
                          
                        });

                      //cb(null,data);
                    }).catch(function(err) {
                      console.error('Oops we have an error', err);
                    })


                  },

                  // Insert Bowler data
                  function (data, next) {
                    var bindex = 0, bowlruns=[], maiden=0;
                    over = data.next_over;
                    data.over.balls.map(function(item,bowlerIndex){
                    data.balls[item].lbw = 0 ;
                    data.balls[item].bowled = 0;
                    data.balls[item].wide = 0;
                    data.balls[item].noball = 0;
                    data.balls[item].bye = 0;
                    data.balls[item].legbye = 0;
                    data.balls[item].hitwicket = 0;

                    if(data.balls[item].wicket_type=='lbw')
                      data.balls[item].lbw = 1;
                    
                    if(data.balls[item].wicket_type=='bowled')
                      data.balls[item].bowled = 1;
                    
                    if(data.balls[item].batting_team=="a")
                      bowling_team = "b";
                    
                    if(data.balls[item].ball_type=='wide')
                      data.balls[item].wide = 1;
                    
                    if(data.balls[item].ball_type=='noball')
                      data.balls[item].noball = 1;
                    
                    if(data.balls[item].ball_type=='legbye')
                      data.balls[item].legbye = 1;
                    
                    if(data.balls[item].ball_type=='bye')
                       data.balls[item].bye = 1;

                    if(data.balls[item].ball_type=='hitwicket')   
                      data.balls[item].hitwicket = 1;
                    
                    // Calculate Maiden Overs

                    bowlruns.push(data.balls[item].bowler.runs);

                    if(over!=null && Object.keys(data.over.balls).length == bowlruns.length && bowlruns.reduce(sum)==0){
                      maiden = 1;
                    }
                      

                    // Insert bowling data for Bowler
                    
                    Bowler_score.findOrCreate(
                      {where: {ballKey:item} },
                      {
                        matchKey: match_key,
                        ballKey: item,
                        team: bowling_team,
                        playerKey: data.balls[item].bowler.key,
                        overStr: data.balls[item].over_str,
                        over: data.balls[item].over,
                        ball: data.balls[item].ball,
                        runs: data.balls[item].bowler.runs,
                        extras: data.balls[item].bowler.extras,
                        wide: data.balls[item].wide,
                        noball: data.balls[item].noball,
                        bye: data.balls[item].bye,
                        legbye: data.balls[item].legbye,
                        ballCount: data.balls[item].bowler.ball_count,
                        wicket: data.balls[item].bowler.wicket,
                        wicketType: data.balls[item].wicket_type,
                        ballType: data.balls[item].ball_type,
                        lbw: data.balls[item].lbw,
                        bowled: data.balls[item].bowled,
                        hitwicket: data.balls[item].hitwicket,
                        maiden: maiden,
                        nextOver: data.next_over
                      },function(err,results){
                        if(err)
                        console.log(err); 

                        bindex++;
                        if((Object.keys(data.over.balls).length-1) == bindex )
                          next(null, data);

                        console.log(bindex+'.) Bowler data saved.');
                      });
                    });
                    
                  },
                  // Insert fielder data 
                  function (data, next) {
                    var findex = 0;

                    over = data.next_over;
                    data.over.balls.map(function(item,fielderIndex){

                      if(data.balls[item].batting_team=="a")
                        bowling_team = "b";
                      
                      if(Object.keys(data.balls[item].fielder).length > 0){
                        Fielder_score.findOrCreate(
                          {where: {ballKey:item} },
                          {
                            matchKey: match_key,
                            ballKey: item,
                            team: bowling_team,
                            playerKey: data.balls[item].fielder.key,
                            overStr: data.balls[item].over_str,
                            over: data.balls[item].over,
                            ball: data.balls[item].ball,
                            catch: data.balls[item].fielder.catch,
                            runout: data.balls[item].fielder.runout,
                            stumbed: data.balls[item].fielder.stumbed,
                            nextOver: data.next_over
                          },function(err,results){
                            if(err)
                              console.log(err);

                            findex++;
                            // if((Object.keys(data.over.balls).length-1) == findex )
                            //     next(null, ball_by_ball);
                              console.log(findex+'.) Fielder data saved');
                        });
                      }
                    });
                    next(null, data);
                  },

                  // Calculate Batsman points

                  function(results, next){

                    var overPlayed, score, scoringmatrix, points=0,  player_achieved=0, subpoints = [], everyFiveBalls=0;

                    leagues.find({
                      where: {leagueId: 3 },
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

                          overPlayed = batsman.currentoverstr;
                          batsman.score = 0;
                          batsman.playing_status = 'notout';
                          for(var i=0;i<rows.length;++i){
                            if(rows[i].ScoringMatrixParams()!==null){
                              if(match_type=='t20'){
                                points = rows[i].t20;
                              }else{
                                points = rows[i].odi;
                              }

                              
                              // Rules for Batsman
                              
                              scoringmatrix = JSON.parse(JSON.stringify(rows[i].ScoringMatrixParams()));

                              switch (scoringmatrix.code) {
                                
                                // Batsman Not Out
                                case 'no':
                                  if(batsman.wicket == 0){
                                    player_achieved = 0;
                                  }else{
                                    batsman.playing_status = 'out';
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;

                                // Runs Scored  
                                case 'rs':
                                  player_achieved = batsman.runsscored;
                                  break;

                                // Runs scored by running  
                                case 'rsr':
                                  player_achieved = batsman.running;
                                  break;

                                // Runs scored by hitting 4s  
                                case 'rs4':
                                  player_achieved = batsman.runsbyfour;
                                  break;
                                
                                //Runs scored by hitting 6s  
                                case 'rs6':
                                  player_achieved = batsman.runsbysix;
                                  break;

                                // Dismissal for duck  
                                case 'duck':
                                  if(batsman.runsscored==0 && batsman.wicket==1 && batsman.ballsFaced==0){
                                    player_achieved = 0;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;
                                  
                                // Every 4 hit  
                                case '4s':
                                  player_achieved = batsman.totalfour;
                                  break;

                                // Every six hit  
                                case '6s':
                                  player_achieved = batsman.totalsix;
                                  break;  
                                
                                // 3 fours or higher  
                                case '3_4s':
                                  if(batsman.totalfour>=3 && batsman.totalfour<=4){
                                    player_achieved = 0;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break; 
                                  
                                // 5 fours or higher  
                                case '5_4s':
                                  if(batsman.totalfour>=5 && batsman.totalfour<=6){
                                    player_achieved = 0;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;
                                
                                // 7 fours or higher  
                                case '7_4s':
                                  if(batsman.totalfour>=7 && batsman.totalfour<=8){
                                    player_achieved = 0;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;
                                
                                // 9 fours or higher
                                case '9_4s':
                                  if(batsman.totalfour>=9){
                                    player_achieved = 0;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;
                                
                                // 2 sixes or higher  
                                case '2_6s':
                                  if(batsman.totalsix>=2 && batsman.totalsix<=3){
                                    player_achieved = 0;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;


                                // 4 sixes or higher
                                case '4_6s':
                                  if(batsman.totalsix>=4 && batsman.totalsix<=5){
                                    player_achieved = 0;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;  
                                
                                // 6 sixes or higher  
                                case '6_6s':
                                  if(batsman.totalsix>=6 && batsman.totalsix<=7){
                                    player_achieved = 0;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;  
                                
                                // 8 sixes or higher  
                                case '8_6s':
                                  if(batsman.totalsix>=8){
                                    player_achieved = 0;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;  
                                
                                // Runs 25 or higher  
                                case '25r':
                                  if(batsman.runsscored>=25 && batsman.runsscored<=49){
                                    player_achieved = 0;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;  
                                
                                // Runs 50 or higher  
                                case '50r':
                                  if(batsman.runsscored>=50 && batsman.runsscored<=74){
                                    player_achieved = 0;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break; 

                                // Runs 75 or higher  
                                case '75r':
                                  if(batsman.runsscored>=75 && batsman.runsscored<=99){
                                    player_achieved = 0;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;
                                
                                // Runs 100 or higher  
                                case '100r':
                                  if(batsman.runsscored>=100){
                                    player_achieved = 0;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;
                                  
                                // Applicable for players scoring minimum runs of 20
                                // > 20 but <= 40 
                                case '25_40r':
                                  if(batsman.runsscored>=20 && batsman.percentrunsscoredinboundary>20 && batsman.percentrunsscoredinboundary<=40 ){
                                    player_achieved = batsman.totalfour + batsman.totalsix;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;  
                                
                                // > 40 but <= 60 
                                case '40_60r':
                                  if(batsman.runsscored>=20 && batsman.percentrunsscoredinboundary>40 && batsman.percentrunsscoredinboundary<=60 ){
                                    player_achieved = batsman.totalfour + batsman.totalsix;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;  

                                // > 60 but <= 80 
                                case '60_80r':
                                  if(batsman.runsscored>=20 && batsman.percentrunsscoredinboundary>60 && batsman.percentrunsscoredinboundary<=80 ){
                                    player_achieved = batsman.totalfour + batsman.totalsix;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;

                                // > 80 but <= 100 
                                case '80_100r':
                                  if(batsman.runsscored>=20 && batsman.percentrunsscoredinboundary>80 && batsman.percentrunsscoredinboundary<=100 ){
                                    player_achieved = batsman.totalfour + batsman.totalsix;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;

                                // > 100
                                case 'gt_100r':
                                  if(batsman.runsscored>=20 && batsman.percentrunsscoredinboundary>100){
                                    player_achieved = batsman.totalfour + batsman.totalsix;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;  


                                // Strike Rate (per 100 balls) --Bonus Every 5 balls faced
                                // Applicable for players batting minimum balls 10

                                // > 100  but <= 150
                                case '100_150sr':
                                  if(batsman.ballsfaced>=10 && batsman.strikerate>100 && batsman.strikerate<=150){
                                    everyFiveBalls =  batsman.ballsfaced - batsman.ballsfaced%5;
                                    player_achieved = (everyFiveBalls)/5;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break; 
                                  
                                // > 150 but <= 200
                                case '150_200sr':
                                  if(batsman.ballsfaced>=10 && batsman.strikerate>150 && batsman.strikerate<=200){
                                    everyFiveBalls =  batsman.ballsfaced - batsman.ballsfaced%5;
                                    player_achieved = (everyFiveBalls)/5;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;

                                // > 200
                                case 'gt200sr':
                                  if(batsman.ballsfaced>=10 && batsman.strikerate>200){
                                    everyFiveBalls =  batsman.ballsfaced - batsman.ballsfaced%5;
                                    player_achieved = (everyFiveBalls)/5;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break; 
                                  
                                // < 70 but >=60
                                case '70_60sr':
                                  if(batsman.ballsfaced>=10 && batsman.strikerate>=60 && batsman.strikerate<70){
                                    everyFiveBalls =  batsman.ballsfaced - batsman.ballsfaced%5;
                                    player_achieved = (everyFiveBalls)/5;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;  

                                // < 60 but >=50
                                case '60_50sr':
                                  if(batsman.ballsfaced>=10 && batsman.strikerate>=50 && batsman.strikerate<60){
                                    everyFiveBalls =  batsman.ballsfaced - batsman.ballsfaced%5;
                                    player_achieved = (everyFiveBalls)/5;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;

                                // < 50
                                case 'lt50sr':
                                  if(batsman.ballsfaced>=10 && batsman.strikerate<50){
                                    everyFiveBalls =  batsman.ballsfaced - batsman.ballsfaced%5;
                                    player_achieved = (everyFiveBalls)/5;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;

                                // Runs scored (by running) in First 5 overs of an inning 
                                case 'rs_f5o':
                                  if(batsman.over<=5){
                                    player_achieved = batsman.runsscored;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;    

                                // 4s hit in First 5 overs of an inning
                                case '4s_f5o':
                                  if(batsman.over<=5){
                                    player_achieved = batsman.totalfour;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;  

                                // 6s hit in First 5 overs of an inning
                                case '6s_f5o':
                                  if(batsman.over<=5){
                                    player_achieved = batsman.totalsix;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                  break;   
                              
                                default:
                                  break;
                              }


                              if(scoringmatrix.operation==1)        // Addition
                              {   
                                score = points + player_achieved;
                                //console.log(scoringmatrix.code+'=>'+points +'+' +player_achieved);
                              }
                              else if(scoringmatrix.operation==2)    // Multiply
                              { 
                                score = points * player_achieved;
                                //console.log(scoringmatrix.code+'=>'+points +'*'+ player_achieved);
                              }
                              else                                  // Do nothing
                              {                                 
                                score = 0;
                              }

                              //console.log('score==>');
                              subpoints.push(score);
                              batsman.score = subpoints.reduce(add);
                            }
                          }

                          function add(total, num) {
                            return total + num;
                          }
                          
                          // Update batsman points

                          var batsmanPlayerKey = batsman.playerkey;
                          var batsmanTeam = batsman.team;
                          var newscore = batsman.score;

                          playerPoints.find({
                            where:{
                              leagueId: 3,
                              matchKey: match_key,
                              playerKey: batsmanPlayerKey,
                              team: batsmanTeam,
                              role: 'Batsman'
                            }
                          })
                          .then(function(result){
                            if(result.length>0){
                               //console.log('try updating it ');
                              playerPoints.updateAll({
                                leagueId: 3,
                                matchKey: match_key,
                                playerKey: batsmanPlayerKey,
                                team: batsmanTeam,
                                role: 'Batsman'
                              },
                              {
                                leagueId: 3,
                                matchKey: match_key,
                                playerKey: batsmanPlayerKey,
                                team: batsmanTeam,
                                role: 'Batsman',
                                status: batsman.playing_status,
                                score: newscore
                              },function(err,result){
                                if(err) throw err;
                                //console.log('updated');
                                });
                            }else{
                              //console.log('try creating ');
                              playerPoints.create(
                                {
                                leagueId: 3,
                                matchKey: match_key,
                                playerKey: batsmanPlayerKey,
                                team: batsmanTeam,
                                role: 'Batsman',
                                status: batsman.playing_status,
                                score: newscore
                              },function(err,results){
                                  if(err)
                                  throw(err)
                              });
                              
                              }
                          })
                          .catch(function(err){
                            throw err;
                          });

                          subpoints=[];

                        });  
                        
                        next(null, results);
                      });
                    });

                  },

                  // Calculate Bowler points

                  function(results, next){

                    var finalResults=[];
                    var players=[];
                    var overPlayed, score, scoringmatrix, points=0, player_achieved=0, subpoints = [], everyFiveBalls=0;

                    leagues.find({
                      where: {leagueId: 3 },
                      include: {
                        relation: 'ScoringMatrixParams',
                        scope: {
                          where: {playertype: 'bowler'}
                        }
                      }
                    }, function(err, rows){

                      bowlerPerformance.find(
                        { order: 'overStr ASC',
                          where: {matchkey: match_key}
                        }, function(err, bowlersrow){
                          
                          async.each(bowlersrow, function(bowler, callback) {
                            
                            overPlayed = bowler.overstr;
                            bowler.score = 0;
                            for(var i=0;i<rows.length;++i){
                              if(rows[i].ScoringMatrixParams()!==null){

                                if(match_type=='t20'){
                                  points = rows[i].t20;
                                }else{
                                  points = rows[i].odi;
                                }

                                // Rules for Bowler

                                scoringmatrix = JSON.parse(JSON.stringify(rows[i].ScoringMatrixParams()));

                                switch (scoringmatrix.code) {
                                  // bold
                                  case 'bold':
                                    player_achieved = bowler.bowled;
                                    break;

                                  // lbw  
                                  case 'lbw':
                                    player_achieved = bowler.lbw;
                                    break;

                                  // 3 wickets  
                                  case '3w':
                                  if(bowler.totalWickets==3){
                                    player_achieved = bowler.totalWickets;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                    break;  

                                  // 4 wickets  
                                  case '4w':
                                  if(bowler.totalWickets==4){
                                    player_achieved = bowler.totalWickets;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                    break;  

                                  // 5 wickets  
                                  case '5w':
                                  if(bowler.totalWickets==5){
                                    player_achieved = bowler.totalWickets;
                                  }else{
                                    scoringmatrix.operation = 3; // Do nothing
                                  }
                                    break;  

                                  // No Balls
                                  case 'nb':
                                    player_achieved = bowler.noball;
                                    break;  

                                  // Wide Balls
                                  case 'wb':
                                    player_achieved = bowler.wide;
                                    break; 
                                    
                                  // Economy Rate - Bonus per over bowled
                                  
                                  // <= 4 runs per over
                                  case '4rpo':
                                    if(bowler.economy<=4 && bowler.totalOvers>=2){
                                      player_achieved = bowler.totalOvers;
                                    }else{
                                      scoringmatrix.operation = 3; // Do nothing
                                    }
                                    break;
                                  
                                  // > 4 but <=5
                                  case '5rpo':
                                    if(bowler.economy>4 && bowler.economy<=5 && bowler.totalOvers>=2){
                                      player_achieved = bowler.totalOvers;
                                    }else{
                                      scoringmatrix.operation = 3; // Do nothing
                                    }
                                    break;
                                    
                                  // >5 but <=6
                                  case '6rpo':
                                    if(bowler.economy>5 && bowler.economy<=6 && bowler.totalOvers>=2){
                                      player_achieved = bowler.totalOvers;
                                    }else{
                                      scoringmatrix.operation = 3; // Do nothing
                                    }
                                    break;

                                  // >9 but <=10
                                  case '10rpo':
                                    if(bowler.economy>9 && bowler.economy<=10 && bowler.totalOvers>=2){
                                      player_achieved = bowler.totalOvers;
                                    }else{
                                      scoringmatrix.operation = 3; // Do nothing
                                    }
                                    break;
                                    
                                  // >10 but <=11
                                  case '11rpo':
                                    if(bowler.economy>10 && bowler.economy<=11 && bowler.totalOvers>=2){
                                      player_achieved = bowler.totalOvers;
                                    }else{
                                      scoringmatrix.operation = 3; // Do nothing
                                    }
                                    break;

                                  // >11
                                  case 'gt11rpo':
                                    if(bowler.economy>11 && bowler.totalOvers>=2){
                                      player_achieved = bowler.totalOvers;
                                    }else{
                                      scoringmatrix.operation = 3; // Do nothing
                                    }
                                    break;  

                                  // Maiden over
                                  case 'mo':
                                    if(bowler.maiden>0){
                                      player_achieved = bowler.maiden;
                                    }else{
                                      scoringmatrix.operation = 3; // Do nothing
                                    }
                                    break;

                                  // Wicket - Hit Wicket
                                  case 'hw':
                                      player_achieved = bowler.hitwicket;
                                    break;  
                                    
                                  // Wickets taken in First 5 overs of an inning
                                  case 'wk_f5o':
                                    if(bowler.over<=5){
                                      player_achieved = bowler.totalWickets;
                                    }else{
                                      scoringmatrix.operation = 3; // Do nothing
                                    }
                                    break; 

                                  // No balls in First 5 overs of an inning
                                  case 'nb_f5o':
                                    if(bowler.over<=5){
                                      player_achieved = bowler.noball;
                                    }else{
                                      scoringmatrix.operation = 3; // Do nothing
                                    }
                                    break;   

                                  // Wide balls in First 5 overs of an inning
                                  case 'wb_f5o':
                                    if(bowler.over<=5){
                                      player_achieved = bowler.wide;
                                    }else{
                                      scoringmatrix.operation = 3; // Do nothing
                                    }
                                    break; 

                                  // Maiden overs in First 5 overs of an inning
                                  case 'mo_f5o':
                                    if(bowler.over<=5){
                                      player_achieved = bowler.maiden;
                                    }else{
                                      scoringmatrix.operation = 3; // Do nothing
                                    }
                                    break;   
                                  
                                  // Maiden over
                                  case 'mo':
                                    if(bowler.maiden>0){
                                      player_achieved = bowler.maiden;
                                    }else{
                                      scoringmatrix.operation = 3; // Do nothing
                                    }
                                    break;  
                                
                                  default:
                                    break;
                                }

                                if(scoringmatrix.operation==1)        // Addition
                                {   
                                  score = points + player_achieved;
                                  //console.log(scoringmatrix.code+'=>'+points +'+' +player_achieved);
                                }
                                else if(scoringmatrix.operation==2)    // Multiply
                                { 
                                  score = points * player_achieved;
                                  //console.log(scoringmatrix.code+'=>'+points +'*'+ player_achieved);
                                }
                                else                                  // Do nothing
                                {                                 
                                  score = 0;
                                }

                                subpoints.push(score);
                                bowler.score = subpoints.reduce(add);
                              }
                            }

                            function add(total, num) {
                              return total + num;
                            }

                            // Update Bowler points
                          
                          var bowlerPlayerKey = bowler.playerKey;
                          var bowlerTeam = bowler.team;
                          var newscore = bowler.score;

                          playerPoints.find({
                            where:{
                              leagueId: 3,
                              matchKey: match_key,
                              playerKey: bowlerPlayerKey,
                              team: bowlerTeam,
                              role: 'Bowler'
                            }
                          })
                          .then(function(result){
                            if(result.length>0){
                             // console.log('try updating it ');
                              playerPoints.updateAll({
                                leagueId: 3,
                                matchKey: match_key,
                                playerKey: bowlerPlayerKey,
                                team: bowlerTeam,
                                role: 'Bowler'
                              },
                              {
                              leagueId: 3,
                              matchKey: match_key,
                              playerKey: bowlerPlayerKey,
                              team: bowlerTeam,
                              role: 'Bowler',
                              status: 'bowl',
                              score: newscore
                              },function(err,result){
                                if(err) throw err;
                                //console.log('updated');
                                });
                            }else{
                             // console.log('try creating ');
                              playerPoints.create(
                                {
                                leagueId: 3,  
                                matchKey: match_key,
                                playerKey: bowlerPlayerKey,
                                team: bowlerTeam,
                                role: 'Bowler',
                                status: 'bowl',
                                score: newscore
                              },function(err,results){
                                  if(err)
                                  throw(err)
                              });
                              
                              }
                          })
                          .catch(function(err){
                            throw err;
                          });

                          subpoints=[];

                          });
                          
                          next(null,results);
                        });
                    });
                  },


                  // Calculate Fielder points

                  function(results, next){

                    var overPlayed, score, scoringmatrix, points=0, player_achieved=0, subpoints = [];

                    leagues.find({
                      where: {leagueId: 3 },
                      include: {
                        relation: 'ScoringMatrixParams',
                        scope: {
                          where: {playertype: 'fielder'}
                        }
                      }
                    }, function(err, rows){

                      fielderPerformance.find(
                        { order: 'overStr ASC',
                          where: {matchkey: match_key}
                        }, function(err, fielderRow){
                          
                          //console.log('Fielder Row');
                          async.each(fielderRow, function(fielder, callback) {
                            overPlayed = fielder.overstr;
                            fielder.score = 0;
                            for(var i=0;i<rows.length;++i){
                              if(rows[i].ScoringMatrixParams()!==null){
                                //console.log('Fielder Rules');
                                if(match_type=='t20'){
                                  points = rows[i].t20;
                                }else{
                                  points = rows[i].odi;
                                }

                                scoringmatrix = JSON.parse(JSON.stringify(rows[i].ScoringMatrixParams()));
                                //console.log(scoringmatrix);

                                switch (scoringmatrix.code) {
                                  // Catches
                                  case 'catch':
                                    player_achieved = fielder.catch;
                                    break;

                                  // Stumps
                                  case 'stump':
                                    player_achieved = fielder.stump;
                                    break;

                                  // runout
                                  case 'ro':
                                    player_achieved = fielder.runout;
                                    break;  
                                
                                  default:
                                    break;
                                }

                                if(scoringmatrix.operation==1)        // Addition
                                {   
                                  score = points + player_achieved;
                                  //console.log(scoringmatrix.code+'=>'+points +'+' +player_achieved);
                                }
                                else if(scoringmatrix.operation==2)    // Multiply
                                { 
                                  score = points * player_achieved;
                                  //console.log(scoringmatrix.code+'=>'+points +'*'+ player_achieved);
                                }
                                else                                  // Do nothing
                                {                                 
                                  score = 0;
                                }

                                subpoints.push(score);
                                fielder.score = subpoints.reduce(add);
                              }
                            }

                            function add(total, num) {
                              return total + num;
                            }

                            
                            // Update Fielder points
                          
                            var fielderPlayerKey = fielder.playerKey;
                            var fielderTeam = fielder.team;
                            var newscore = fielder.score;
  
                            playerPoints.find({
                              where:{
                                leagueId: 3,
                                matchKey: match_key,
                                playerKey: fielderPlayerKey,
                                team: fielderTeam,
                                role: 'Fielder'
                              }
                            })
                            .then(function(result){
                              if(result.length>0){
                                //console.log('try updating it ');
                                playerPoints.updateAll({
                                  leagueId: 3,
                                  matchKey: match_key,
                                  playerKey: fielderPlayerKey,
                                  team: fielderTeam,
                                  role: 'Fielder'
                                },
                                {
                                  leagueId: 3,  
                                  matchKey: match_key,
                                  playerKey: fielderPlayerKey,
                                  team: fielderTeam,
                                  role: 'Fielder',
                                  status: 'field',
                                  score: newscore
                                },function(err,result){
                                  if(err) throw err;
                                  //console.log('updated');
                                  });
                              }else{
                                //console.log('try creating ');
                                playerPoints.create(
                                  {
                                    leagueId: 3,
                                    matchKey: match_key,
                                    playerKey: fielderPlayerKey,
                                    team: fielderTeam,
                                    role: 'Fielder',
                                    status: 'field',
                                    score: newscore
                                },function(err,results){
                                    if(err)
                                    throw(err)
                                });
                                
                                }
                            })
                            .catch(function(err){
                              throw err;
                            });

                          subpoints=[];
                            
                          });

                          next(null, results);
                        });
                    });

                  },

                  // Update Match Status

                  function(data, next){
                    var currentOver, strikerkey,nonstrikerkey,strikername,nonstrikername,batting_team,battingteamkey,tosswon;
                    CricketAPIServices.getMatchResponse(match_key).then((data)=>{

                      if(data.card.status===null)
                        matchStatus ='none';
                      else
                      matchStatus = data.card.status;
                      
                      //matchStatus ='started';

                      if(data.card.now.striker===null)
                        strikerkey='none';
                      else
                        strikerkey = data.card.now.striker;
                      
                      if(data.card.now.nonstriker===null)
                        nonstrikerkey='none';
                      else
                        nonstrikerkey = data.card.now.nonstriker;

                      if(typeof data.card.players[strikerkey]!='undefined'){
                        if(data.card.players[strikerkey].name===null)
                          strikername='none';
                        else
                          strikername = data.card.players[strikerkey].name;
                      }

                      if(typeof data.card.players[nonstrikerkey]!='undefined'){
                        if(data.card.players[nonstrikerkey].name===null)
                          nonstrikername='none';
                        else
                          nonstrikername = data.card.players[nonstrikerkey].name;
                      }

                      if(data.card.now.batting_team===null)
                        batting_team='a';
                      else
                        batting_team = data.card.now.batting_team;

                      if(data.card.teams[batting_team].key===null)
                        battingteamkey='none';
                      else
                        battingteamkey = data.card.teams[batting_team].key;

                      if(data.card.toss.won===null){
                        tosswon='none';
                      }
                      else{
                        
                        if(data.card.toss.won=='a')
                          tosswon=data.card.teams.a.key;
                        else if(data.card.toss.won=='b')
                          tosswon=data.card.teams.b.key;
                        else
                          tosswon='not announced';
                      }
                      
                      if(data.card.now.innings===null)
                        data.card.now.innings=1;

                      if(data.card.innings[(batting_team+ '_'+data.card.now.innings)].overs===null)  
                        currentOver = data.card.innings[(batting_team+ '_'+data.card.now.innings)].overs;
                      else
                        currentOver = '0.0';

                      match_stats.findOne({
                        where:{
                          matchKey: match_key
                        }
                      }).then(function(result){
                        console.log(result);
                        if(result!=null){
                         
                          match_stats.updateAll({
                            matchKey: match_key,
                          },
                          {
                            nonstrikerName: nonstrikername,
                            strikerKey: strikerkey,
                            nonStrikerKey: nonstrikerkey,
                            strikerName: strikername,
                            battingTeamKey: battingteamkey,
                            currentOver: current_over,
                            overKey: currentOverKey,
                            status: matchStatus,
                            prevOver: previousOver,
                            nextOver: over,
                            toss: tosswon,
                            currentOverDetail: currentOver
                          },function(err,result){
                            if(err) throw err;
                            
                            });
                        }else{
                          //console.log('try creating ');
                          match_stats.create(
                            {
                              matchKey: match_key,
                              nonstrikerName: nonstrikername,
                              strikerKey: strikerkey,
                              nonStrikerKey: nonstrikerkey,
                              strikerName: strikername,
                              battingTeamKey: battingteamkey,
                              status: matchStatus,
                              prevOver: previousOver,
                              nextOver: over,
                              currentOver: current_over,
                              overKey: currentOverKey,
                              toss: tosswon,
                              currentOverDetail: currentOver
                            },function(err,results){
                                if(err)
                                throw(err)
                            });
                          }
                      })
                      .catch(function(err){
                        throw err;
                      });

                    }).then((data)=>{
                      next(null, 'success');
                    });
                  },

                  // Push data to client

                  function(data, next){
                    var finalData = {};
                    var players=[];  
                    var batting='';
                    var currentover='';
                    var mStatus='';

                    var finalscores = app.models.Finalscores;  
                    var totalscore=0;
                    finalscores.find({
                      where:{leagueId: 3, matchKey:match_key}
                    },function(err, rows){
                      for(var i=0;i<rows.length;++i){
                        batting = rows[i].battingTeamKey;
                        currentover = rows[i].currentOver;
                        mStatus = rows[i].status;
                        totalscore = totalscore+rows[i].score;
                        players.push({
                            player_key: rows[i].playerKey,
                            player_name: rows[i].playerName,
                            striker_key: rows[i].strikerKey,
                            nonstriker_key: rows[i].nonStrikerKey,
                            striker_name: rows[i].strikerName,
                            nonstriker_name: rows[i].nonstrikerName,
                            team_name: rows[i].team,
                            role: rows[i].role,
                            captain: rows[i].captain,
                            score: rows[i].score
                        });
                    }

                    finalData = {response:
                      {
                        matchStatus:mStatus,
                        batting: batting, 
                        overPlayed: currentover, 
                        yourScore: totalscore, 
                        topTeamScore:100, 
                        currentPosition: 2,
                        expectedPoints: 400,
                        players: players,
                        substitute: []
                      }};
                      //cb(null,finalData)
                      console.log(finalData);
                    app.io.emit('listPlayerPoints', finalData);
                    next(null, 'success');
                  });
                  }

                ], function(err,obj){
                  var timer = setTimeout(function() {
                    cricketCallback();
                  }, 10000);
                }); 
         },
         cb(null,'ok')
        );
    };

    Cricketapi.remoteMethod (
        'ballbyball',
        {
          http: {path: '/ballbyball', verb: 'get'},
          accepts: [
              {arg: 'match_key', type: 'string', http: { source: 'query' }},
              {arg: 'over', type: 'string', http: { source: 'query' }},
              {arg: 'match_type', type: 'string', http: { source: 'query' }}
            ],
          returns: {arg: 'response', type: 'Object'}
        }
      );    
};