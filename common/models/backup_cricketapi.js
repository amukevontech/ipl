'use strict';

module.exports = function(Cricketapi) {
  var app = require('../../server/server');
  var async= require("async");
  var request = require('request');
  
    // Ball By Ball API: 
    // @params: access_token, match_key, over

    Cricketapi.ballbyball = function(access_token, match_key, over, cb){

        async.whilst(
          // test to perform next iteration
          function() {
            if(over==null){
              console.log('Over is null');
              return false;
            }else{
              console.log('Next Over =>'+over);
              return true;
            }
          },
          function(cricketCallback){
            //Define some variables.
            
            var Batsman_score = app.models.BatsmanScores;
            var Bowler_score = app.models.BowlerScores;
            var Fielder_score = app.models.FielderScores;   
            var bowling_team = "a";

                async.waterfall([
                  function (next) {
                    
                    console.log('https://rest.cricketapi.com/rest/v2/match/'+match_key+'/balls/'+over+'/?access_token='+access_token);
                    request(
                      {
                        method: 'GET',
                        uri: 'https://rest.cricketapi.com/rest/v2/match/'+match_key+'/balls/'+over+'/?access_token='+access_token,
                        gzip: true
                      }, function(error, resp, body) {
                         var index = 0, ball_by_ball_runs=0;
                         var ball_by_ball = JSON.parse(body);
                         if(ball_by_ball.status==true){

                           over = ball_by_ball.data.next_over;
                           ball_by_ball.data.over.balls.map(function(item,batsmanIndex){
                           ball_by_ball_runs = ball_by_ball.data.balls[item].batsman.runs;
                          

                          // If batsman hit 6 or 4 then save 6 and 4 in columns and update run to 0
                          if(ball_by_ball.data.balls[item].batsman.six){
                            ball_by_ball.data.balls[item].batsman.six = 6;
                            ball_by_ball.data.balls[item].batsman.runs = 0;
                          }
                          if(ball_by_ball.data.balls[item].batsman.four){
                            ball_by_ball.data.balls[item].batsman.four = 4;
                            ball_by_ball.data.balls[item].batsman.runs = 0;
                          }

                          
                          // Insert each ball played by Batsman 
                          Batsman_score.findOrCreate(
                            {where: {ballKey:item} },
                            {
                              matchKey: match_key,
                              ballKey: item,
                              team: ball_by_ball.data.balls[item].batting_team,
                              playerKey: ball_by_ball.data.balls[item].batsman.key,
                              overStr: ball_by_ball.data.balls[item].over_str,
                              over: ball_by_ball.data.balls[item].over,
                              ball: ball_by_ball.data.balls[item].ball,
                              runs: ball_by_ball.data.balls[item].batsman.runs,
                              playerBall: 0,
                              ballByBallRuns: ball_by_ball_runs,
                              dotball: ball_by_ball.data.balls[item].batsman.dotball,
                              six: ball_by_ball.data.balls[item].batsman.six,
                              four: ball_by_ball.data.balls[item].batsman.four,
                              ballCount: ball_by_ball.data.balls[item].batsman.ball_count,
                              out: ball_by_ball.data.balls[item].bowler.wicket,
                              nextOver: ball_by_ball.data.next_over
                            },function(err,results){
                                if(err)
                                console.log(err);
                                
                                index++;
                                //console.log(results);
                                console.log(index+'.) Batsman data saved.');

                                if( (Object.keys(ball_by_ball.data.over.balls).length-1) == index )
                                  next(null, ball_by_ball);
                            });
                        });
                        
                      }
                    });
                  },
                  function (ball_by_ball, next) {
                    var bindex = 0;
                    over = ball_by_ball.data.next_over;
                    ball_by_ball.data.over.balls.map(function(item,bowlerIndex){
                    ball_by_ball.data.balls[item].lbw = 0 ;
                    ball_by_ball.data.balls[item].bowled = 0;
                    ball_by_ball.data.balls[item].wide = 0;
                    ball_by_ball.data.balls[item].noball = 0;
                    ball_by_ball.data.balls[item].bye = 0;
                    ball_by_ball.data.balls[item].legbye = 0;

                    if(ball_by_ball.data.balls[item].wicket_type=='lbw')
                      ball_by_ball.data.balls[item].lbw = 1;
                    
                    if(ball_by_ball.data.balls[item].wicket_type=='bowled')
                      ball_by_ball.data.balls[item].bowled = 1;
                    
                    if(ball_by_ball.data.balls[item].batting_team=="a")
                      bowling_team = "b";
                    
                    if(ball_by_ball.data.balls[item].ball_type=='wide')
                      ball_by_ball.data.balls[item].wide = 1;
                    
                    if(ball_by_ball.data.balls[item].ball_type=='noball')
                      ball_by_ball.data.balls[item].noball = 1;
                    
                    if(ball_by_ball.data.balls[item].ball_type=='legbye')
                      ball_by_ball.data.balls[item].legbye = 1;
                    
                    if(ball_by_ball.data.balls[item].ball_type=='bye')
                       ball_by_ball.data.balls[item].bye = 1;
                    

                    // Insert bowling data for Bowler
                    
                    Bowler_score.findOrCreate(
                      {where: {ballKey:item} },
                      {
                        matchKey: match_key,
                        ballKey: item,
                        team: bowling_team,
                        playerKey: ball_by_ball.data.balls[item].bowler.key,
                        overStr: ball_by_ball.data.balls[item].over_str,
                        over: ball_by_ball.data.balls[item].over,
                        ball: ball_by_ball.data.balls[item].ball,
                        runs: ball_by_ball.data.balls[item].bowler.runs,
                        extras: ball_by_ball.data.balls[item].bowler.extras,
                        wide: ball_by_ball.data.balls[item].wide,
                        noball: ball_by_ball.data.balls[item].noball,
                        bye: ball_by_ball.data.balls[item].bye,
                        legbye: ball_by_ball.data.balls[item].legbye,
                        ballCount: ball_by_ball.data.balls[item].bowler.ball_count,
                        wicket: ball_by_ball.data.balls[item].bowler.wicket,
                        wicketType: ball_by_ball.data.balls[item].wicket_type,
                        ballType: ball_by_ball.data.balls[item].ball_type,
                        lbw: ball_by_ball.data.balls[item].lbw,
                        bowled: ball_by_ball.data.balls[item].bowled,
                        nextOver: ball_by_ball.data.next_over
                      },function(err,results){
                        if(err)
                        console.log(err); 

                        bindex++;
                        if((Object.keys(ball_by_ball.data.over.balls).length-1) == bindex )
                          next(null, ball_by_ball);

                        console.log(bindex+'.) Bowler data saved.');
                      });
                    });
                    //next(null, ball_by_ball); 
                  },
                  function (ball_by_ball, next) {
                    var findex = 0;
                    // Insert fielder data 
                    over = ball_by_ball.data.next_over;
                    ball_by_ball.data.over.balls.map(function(item,fielderIndex){

                      if(ball_by_ball.data.balls[item].batting_team=="a"){
                        bowling_team = "b";
                      }

                      if(Object.keys(ball_by_ball.data.balls[item].fielder).length > 0){
                        Fielder_score.findOrCreate(
                          {where: {ballKey:item} },
                          {
                            matchKey: match_key,
                            ballKey: item,
                            team: bowling_team,
                            playerKey: ball_by_ball.data.balls[item].fielder.key,
                            overStr: ball_by_ball.data.balls[item].over_str,
                            over: ball_by_ball.data.balls[item].over,
                            ball: ball_by_ball.data.balls[item].ball,
                            catch: ball_by_ball.data.balls[item].fielder.catch,
                            runout: ball_by_ball.data.balls[item].fielder.runout,
                            stumbed: ball_by_ball.data.balls[item].fielder.stumbed,
                            nextOver: ball_by_ball.data.next_over
                          },function(err,results){
                            if(err)
                              console.log(err);

                            findex++;
                            // if((Object.keys(ball_by_ball.data.over.balls).length-1) == findex )
                            //     next(null, ball_by_ball);
                              console.log(findex+'.) Fielder data saved');
                        });
                      }
                    });
                    next(null, ball_by_ball);
                  },

                  function(results, next){
                    var batsmanPerformance = app.models.BatsmanPerformance;
                    var bowlerPerformance = app.models.BowlerPerformance;
                    var fielderPerformance = app.models.FielderPerformance;
                    var playerPoints = app.models.PlayerPoints;

                    var leagues = app.models.LeaguePoints;
                    var finalResults=[];
                    var players=[];
                    var overPlayed, score, scoringmatrix, points=0, runs=0, player_achieved=0, subpoints = [], everyFiveBalls=0;
                    var batsmanPlayerKey = '';
                    var batsmanTeam = '';
                    //var scoringmatrixparams = app.models.ScoringMatrixParams;
                    
                    // scoringmatrixparams.find({
                    //   include: {
                    //     relation: 'ScoringMatrixParamTypes',
                    //     scope: {
                    //       where: {playertype: 'batsman'}
                    //     }
                    //   }
                    // }, function(err, rows){
                    //   console.log('scoringmatrixparams');
                    //   console.log(rows);
                    // });



                    leagues.find({
                      where: {leagueId: 3 },
                      include: {
                        relation: 'ScoringMatrixParams',
                        scope: {
                          //where: {typeId: {inq: [3,4,5,6,7]}},
                          where: {playertype: 'batsman'},
                          // include: {
                          //   relation: 'ScoringMatrixParamTypes',
                          //   scope: {
                          //     where: {playertype: 'batsman'}
                          //   }
                          // }
                        }
                      }
                    }, function(err, rows){
                      //console.log('Leagues Data');
                      //console.log(rows);

                      batsmanPerformance.find(
                        { order: 'currentOverStr ASC',
                          where: {matchkey: match_key}
                        }, function(err, batsmanrow){
                        console.log('Batsman Performance');
                        console.log(batsmanrow);

                        async.each(batsmanrow, function(batsman, callback) {

                          overPlayed = batsman.currentoverstr;
                          batsman.score = 0;
                          for(var i=0;i<rows.length;++i){
                            if(rows[i].ScoringMatrixParams()!==null){
                              points = rows[i].t20;
                              console.log('Leagues');
                              //console.log(rows[i]);
                              
                              // Calculate score
                              
                              
                              scoringmatrix = JSON.parse(JSON.stringify(rows[i].ScoringMatrixParams()));

                              switch (scoringmatrix.code) {
                                
                                // Batsman Not Out
                                case 'no':
                                  if(batsman.wicket == 0){
                                    player_achieved = 0;
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
                              
                                default:
                                  break;
                              }


                              if(scoringmatrix.operation==1)        // Addition
                              {   
                                score = points + player_achieved;
                                console.log(scoringmatrix.code+'=>'+points +'+' +player_achieved);
                              }
                              else if(scoringmatrix.operation==2)    // Multiply
                              { 
                                score = points * player_achieved;
                                console.log(scoringmatrix.code+'=>'+points +'*'+ player_achieved);
                              }
                              else                                  // Do nothing
                              {                                 
                                score = 0;
                              }


                              console.log('score==>');
                              console.log(score);
                              subpoints.push(score);
                              score = subpoints.reduce(add);
                              batsman.score = score;
                            }
                          }


                          function add(total, num) {
                            return total + num;
                          }
                          // Assign Player report

                          

                          console.log('here===>');
                          //console.log(batsman);
                          console.log(batsman.playerkey);
                          var batsmanPlayerKey = batsman.playerkey;
                          var batsmanTeam = batsman.team;
                          var newscore = batsman.score;

                          playerPoints.find({
                            where:{matchKey: match_key,
                              playerKey: batsmanPlayerKey,
                              team: batsmanTeam,
                              role: 'Batsman'}
                          })
                          .then(function(result){
                            if(result.length>0){
                              console.log('try updating it ');
                              playerPoints.updateAll({
                                matchKey: match_key,
                                playerKey: batsmanPlayerKey,
                                team: batsmanTeam,
                                role: 'Batsman'
                              },
                              {
                              matchKey: match_key,
                              playerKey: batsmanPlayerKey,
                              team: batsmanTeam,
                              role: 'Batsman',
                              status: 'Playing',
                              score: newscore
                              },function(err,result){
                                if(err) throw err;
                                console.log('updated');
                                });
                            }else{
                              console.log('try creating ');
                              playerPoints.create(
                                {
                                matchKey: match_key,
                                playerKey: batsmanPlayerKey,
                                team: batsmanTeam,
                                role: 'Batsman',
                                status: 'Playing',
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


                          players.push({
                            playerKey: batsman.playerkey,
                            team: batsman.team,
                            role: 'Batsman',
                            score: score,
                            subpoints: subpoints
                          });
                          subpoints=[];



                        });  
                      

                        // Batsman loop ends


                        finalResults.push(
                          {
                            batting: 'KKR', 
                            overPlayed: overPlayed, 
                            yourScore: 100, 
                            topTeamScore:100, 
                            currentPosition: 1,
                            expectedPoints: 500,
                            players: players
                          });
                        console.log('Final Results');
                        console.log(finalResults);
                        //cb(null, finalResults);
                        next(null, finalResults);
                      });
                    });


                    // next(null, finalResults);
                  },

                  function(results, next){

                    var bowlerPerformance = app.models.BowlerPerformance;
                    var fielderPerformance = app.models.FielderPerformance;
                    var playerPoints = app.models.PlayerPoints;

                    var leagues = app.models.LeaguePoints;
                    var finalResults=[];
                    var players=[];
                    var overPlayed, score, scoringmatrix, points=0, runs=0, player_achieved=0, subpoints = [], everyFiveBalls=0;

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
                            console.log('Bowler is here');
                            console.log(bowler);
                            overPlayed = bowler.overstr;
                            bowler.score = 0;
                            for(var i=0;i<rows.length;++i){
                              if(rows[i].ScoringMatrixParams()!==null){
                                console.log('Bowler Data');
                                console.log(rows[i]);
                                points = rows[i].t20;

                                scoringmatrix = JSON.parse(JSON.stringify(rows[i].ScoringMatrixParams()));
                                console.log(scoringmatrix);

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
                                
                                  default:
                                    break;
                                }

                                //console.log('Total Overs of this player ==>'+bowlersrow[bwl].totalOvers);
                                //console.log(bowlersrow[bwl].playerKey+'==>');
                                if(scoringmatrix.operation==1)        // Addition
                                {   
                                  score = points + player_achieved;
                                  console.log(scoringmatrix.code+'=>'+points +'+' +player_achieved);
                                }
                                else if(scoringmatrix.operation==2)    // Multiply
                                { 
                                  score = points * player_achieved;
                                  console.log(scoringmatrix.code+'=>'+points +'*'+ player_achieved);
                                }
                                else                                  // Do nothing
                                {                                 
                                  score = 0;
                                }

                                subpoints.push(score);
                                score = subpoints.reduce(add);
                                bowler.score = score;
                              }
                            }

                            function add(total, num) {
                              return total + num;
                            }

                            // Assign Player report
                            
                          console.log('bowler data insert into player===>');
                          
                          console.log(bowler.playerKey);
                          var bowlerPlayerKey = bowler.playerKey;
                          var bowlerTeam = bowler.team;
                          var newscore = bowler.score;

                          playerPoints.find({
                            where:{
                              matchKey: match_key,
                              playerKey: bowlerPlayerKey,
                              team: bowlerTeam,
                              role: 'Bowler'
                            }
                          })
                          .then(function(result){
                            if(result.length>0){
                              console.log('try updating it ');
                              playerPoints.updateAll({
                                matchKey: match_key,
                                playerKey: bowlerPlayerKey,
                                team: bowlerTeam,
                                role: 'Bowler'
                              },
                              {
                              matchKey: match_key,
                              playerKey: bowlerPlayerKey,
                              team: bowlerTeam,
                              role: 'Bowler',
                              status: 'Playing',
                              score: newscore
                              },function(err,result){
                                if(err) throw err;
                                console.log('updated');
                                });
                            }else{
                              console.log('try creating ');
                              playerPoints.create(
                                {
                                matchKey: match_key,
                                playerKey: bowlerPlayerKey,
                                team: bowlerTeam,
                                role: 'Bowler',
                                status: 'Playing',
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

                            

                            players.push({
                              playerKey: bowler.playerKey,
                              team: bowler.team,
                              role: 'Bowl',
                              score: score,
                              subpoints: subpoints
                            });
                          subpoints=[];

                          });

                          finalResults.push(
                            {
                              batting: 'KKR', 
                              overPlayed: overPlayed, 
                              yourScore: 100, 
                              topTeamScore:100, 
                              currentPosition: 1,
                              expectedPoints: 500,
                              players: players
                            });
                          console.log('Final Results');
                          console.log(finalResults);
                          //cb(null, finalResults);
                          
                          next(null,finalResults);

                        });

                          //next(null,'success');
                        //next(null, finalResults);

                    });

                  },

                  function(results, next){

                    var fielderPerformance = app.models.FielderPerformance;
                    var playerPoints = app.models.PlayerPoints;

                    var leagues = app.models.LeaguePoints;
                    var finalResults=[];
                    var players=[];
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
                          
                          console.log('Fielder Data goes here');
                          async.each(fielderRow, function(fielder, callback) {
                            overPlayed = fielder.overstr;
                            fielder.score = 0;
                            for(var i=0;i<rows.length;++i){
                              if(rows[i].ScoringMatrixParams()!==null){
                                console.log('Fielder Data');
                                console.log(rows[i]);
                                points = rows[i].t20;
                                scoringmatrix = JSON.parse(JSON.stringify(rows[i].ScoringMatrixParams()));
                                console.log(scoringmatrix);

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

                                console.log(fielder.playerKey+'==>');
                                if(scoringmatrix.operation==1)        // Addition
                                {   
                                  score = points + player_achieved;
                                  console.log(scoringmatrix.code+'=>'+points +'+' +player_achieved);
                                }
                                else if(scoringmatrix.operation==2)    // Multiply
                                { 
                                  score = points * player_achieved;
                                  console.log(scoringmatrix.code+'=>'+points +'*'+ player_achieved);
                                }
                                else                                  // Do nothing
                                {                                 
                                  score = 0;
                                }

                                subpoints.push(score);
                                score = subpoints.reduce(add);
                                fielder.score = score;

                              }
                            }

                            function add(total, num) {
                              return total + num;
                            }

                              // Assign Player report
                            
                           console.log('fielder data insert into player===>');
                          
                            console.log(fielder.playerKey);
                            var fielderPlayerKey = fielder.playerKey;
                            var fielderTeam = fielder.team;
                            var newscore = fielder.score;
  
                            playerPoints.find({
                              where:{
                                matchKey: match_key,
                                playerKey: fielderPlayerKey,
                                team: fielderTeam,
                                role: 'Fielder'
                              }
                            })
                            .then(function(result){
                              if(result.length>0){
                                console.log('try updating it ');
                                playerPoints.updateAll({
                                  matchKey: match_key,
                                  playerKey: fielderPlayerKey,
                                  team: fielderTeam,
                                  role: 'Fielder'
                                },
                                {
                                matchKey: match_key,
                                playerKey: fielderPlayerKey,
                                team: fielderTeam,
                                role: 'Fielder',
                                status: 'Playing',
                                score: newscore
                                },function(err,result){
                                  if(err) throw err;
                                  console.log('updated');
                                  });
                              }else{
                                console.log('try creating ');
                                playerPoints.create(
                                  {
                                  matchKey: match_key,
                                  playerKey: fielderPlayerKey,
                                  team: fielderTeam,
                                  role: 'Fielder',
                                  status: 'Playing',
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

                          players.push({
                            playerKey: fielder.playerKey,
                            team: fielder.team,
                            role: 'Fielder',
                            score: score,
                            subpoints: subpoints
                          });
                          subpoints=[];
                            
                          });


                          finalResults.push(
                            {
                              batting: 'KKR', 
                              overPlayed: overPlayed, 
                              yourScore: 100, 
                              topTeamScore:100, 
                              currentPosition: 1,
                              expectedPoints: 500,
                              players: players
                            });
                          console.log('Final Results');
                          console.log(finalResults);
                          //cb(null, finalResults);

                          next(null, finalResults);
                        });


                    });


                  }

                ], function(err,obj){
                  var timer = setTimeout(function() {
                    cricketCallback();
                  }, 4000);
                }); 
         },
         cb(null,'ok')
        );
        //  function(err){
        //    cb(null,'ok');
        //    // The final function of whilst 
        //    //callback(err);
        // }); // Whilst finished
    };

    Cricketapi.remoteMethod (
        'ballbyball',
        {
          http: {path: '/ballbyball', verb: 'get'},
          accepts: [
              {arg: 'access_token', type: 'string', http: { source: 'query' }},
              {arg: 'match_key', type: 'string', http: { source: 'query' }},
              {arg: 'over', type: 'string', http: { source: 'query' }}
            ],
          returns: {arg: 'response', type: 'Object'}
        }
      );    
};