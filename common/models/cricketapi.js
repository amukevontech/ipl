'use strict';

module.exports = function(Cricketapi) {
  const app = require('../../server/server');
  const async= require("async");
  const request = require('request');
  const CricketAPIServices = require('../../server/services');
  const CalculatePlayerPoints = require('../../server/calculateplayerpoints');
  const CustomQuery = require('../../server/customQueries');
  const finalScores = require('../../server/finalscores');
  const Config = require('../../server/config');
  const getpoints = require('../../server/getPoints');
  const getMatchStatus = require('../../server/matchstatus');
  const fs = require('fs');
  const jsonexport = require('jsonexport');
 
  var nodehost = Config.site_url.nodehost;
  var phphost = Config.site_url.phphost;
  var matchStatus,matchStatusOverview, previousOver,current_over, currentOverKey,battingTeam,crickInnings=1,MatchID;
  var match_id, user_id, leagueId,overdetail='0.0',
  scoringPoints={playingXiPoints:{},nonplayingXiPoints:{},TossCaptainpoints:{},winningTeamPoints:{}},
  winnerTeam, currentPosition=0, totalcontests=0, topTeamScore=0,ranks={},matchdata={},
  clients=[],bowlruns=[], totalBalls={batsman:0,bowler:0,fielder:0} , ballcounts=0,headerMaxBashBool=0,overballs=1, live_status='started' ;
 
  
  // clients.push({ id: '12334243423424', user_id: 187, match_id: 68, match_contest_id: 46,score:0,counter:0 }); 
  // clients.push({ id: '123342434dssf23424', user_id: 205, match_id: 68, match_contest_id: 53,score:0,counter:0 }); 
  // clients.push({ id: '12334243dsfds423424', user_id: 205, match_id: 68, match_contest_id: 49,score:0,counter:0 }); 
  // clients.push({ id: '12334243dsdfdsfdsfd4445fds423424', user_id: 205, match_id: 68, match_contest_id: 51,score:0,counter:0 }); 
  
  // maxbash
  //clients.push({ id: 'sdffsdfddsffddjidjj__difsdfji', user_id: 205, match_id: 70, match_contest_id: 66,score:0,counter:0 }); 

  //clients.push({ id: '12334243dsfds423424', user_id: 205, match_id: 68, match_contest_id: 49,score:0,counter:0,ranks:{},multipliers:{} }); 
    
  var globalI=0,globalSt='';


  function sum(total, num) {
    return total + num;
  }
  

  function addClients(socketId, data) {
    var found = clients.some(function (el) {
      return el.id === socketId;
    });
    if (!found) {
      clients.push({ id: socketId, user_id: data.user_id, match_id: data.match_id, match_contest_id: data.match_contest_id, score:0,counter:0,ranks:{},multipliers:{} }); 
    }
    else{
      let clienData= clients.find(c => c.id === socketId);
      clients[clients.indexOf(clienData)]={id: socketId, user_id: data.user_id, match_id: data.match_id, match_contest_id: data.match_contest_id, score:0,counter:0,ranks:clients[clients.indexOf(clienData)].ranks,multipliers:{}};

    }
  }


    // Ball By Ball API: 
    // @params: match_key, over, match_type
    Cricketapi.ballbyball = function(match_key, over, match_type, cb){

      console.log('nodehost=>'+nodehost);
      console.log('phphost=>'+phphost);
      
      // addClients('12334243423424', { user_id: 205, match_id: 68, match_contest_id: 49});
      // console.log(clients);
      app.io.sockets.on('connection', function(socket){
        //console.log(app.io.sockets.clients().connected);
        //emitter.setMaxListeners(999999);
        app.io.sockets.setMaxListeners(999999);
        socket.on('finalScores', function(data){
          addClients(socket.id, data);
          //clients.push({id: socket.id, user_id: data.user_id, match_id: data.match_id});
          socket.join('user_id_'+data.user_id+'match_contest_id_'+data.match_contest_id);
          //console.log(app.io.sockets.clients().connected);
          console.log('Hit here');
          console.log(data);
          
      });

      app.io.sockets.on('disconnect', function(){
      
        console.log(socket.id+'===> old_user_disconnected');
        clients.splice(clients.indexOf(socket.id), 1);
        //console.log('user disconnected');
      });
    
    });
     


        async.whilst(
          // test to perform next iteration
          function() {
            if(over==null && matchStatus=='completed'){
              console.log('Match completed and Over is null');
              clients=[];
              return false;
            }else{
              console.log('Next Over =>'+over);
              return true;
            }
          },
          function(cricketCallback){
            //Define variables.
            
            const Batsman_score = app.models.BatsmanScores;
            const Bowler_score = app.models.BowlerScores;
            const Fielder_score = app.models.FielderScores;  
            const batsmanPerformance = app.models.BatsmanPerformance;
            const bowlerPerformance = app.models.BowlerPerformance;
            const fielderPerformance = app.models.FielderPerformance;
            const playerPoints = app.models.PlayerPoints;
            const leagues = app.models.Leagues; 
            const match_stats = app.models.MatchStats;
            const Userteams = app.models.UserTeams;
            const userteamplayers = app.models.UserTeamPlayers;
            const CricketPlayers = app.models.Players;
            const Matches = app.models.Matches;
            const finalscores = app.models.Finalscores;
            const contestParticipants = app.models.ContestParticipants;
            const SeriesPlayers = app.models.SeriesPlayers;
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
                        }else if(row.next_over==null && matchStatus=='completed'){
                          
                        }

                        CricketAPIServices.ballByBall(match_key, row.overKey).then((data)=>{
                          if(typeof data!='undefined'){
                            
                            if(ballcounts<data.over.balls.length){
                              over = row.overKey;
                              console.log('over is===>');
                              console.log(over);
                              next(null, over);
                            }else{
                              if(data.next_over==null && data.match.status=='started'){
                                console.log('Not Bowled yet waiting........');

                                battingTeam=data.over.team;
                                getMatchStatus.getMatchStatusData(match_key,battingTeam).then((finalmatchdata)=>{
                                  let match_current_over;
                                  if(ballcounts>=6){
                                      match_current_over = data.over.over;
                                  }else{
                                      match_current_over = parseInt(data.over.over-1) +'.'+ballcounts;
                                  }

                                  let date = new Date();
                                  let currentDateTime = date.getFullYear()+'/'+(date.getMonth()+1)+'/'+date.getDate()+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
                                  match_stats.updateAll({
                                    matchKey: match_key,
                                  },
                                  {
                                    nonstrikerName: finalmatchdata.nonstrikername,
                                    strikerKey: finalmatchdata.strikerkey,
                                    nonStrikerKey: finalmatchdata.nonstrikerkey,
                                    strikerName: finalmatchdata.strikername,
                                    battingTeamKey: finalmatchdata.currentbattingteam,
                                    currentOver: data.over.over,
                                    overKey: data.over.team+'_'+data.over.innings+'_'+match_current_over,
                                    status: data.match.status,
                                    prevOver: data.pre_over,
                                    nextOver: over,
                                    innings: finalmatchdata.crickInnings,
                                    firstinningteam: finalmatchdata.firstinningteam,
                                    secondinningteam: finalmatchdata.secondinningteam,
                                    matchOvers: finalmatchdata.matchovers,
                                    winnerTeam:finalmatchdata.winnerTeam,
                                    matchEndTime:finalmatchdata.matchendtime,
                                    toss: finalmatchdata.tosswon,
                                    captainTossWinner:finalmatchdata.winningTossCaptain,
                                    manofmatch:finalmatchdata.manOfMatch,
                                    currentOverDetail: match_current_over,
                                    statusOverview: finalmatchdata.matchStatusOverview,
                                    created: currentDateTime
                                  },function(err,result){
                                    if(err) throw err;
                                    
                                    setTimeout(() => {
                                      cricketCallback();  
                                    }, 30000);
        
                                    });
                                });


                                
                              }else{
                                ballcounts=0;
                                bowlruns=[];
                                console.log('over is======>');
                                console.log(data.next_over);
                                next(null, data.next_over);
                              }
                              
                            }
                          }else{
                            console.log('over is===>');
                            console.log(over);
                            next(null, over);
                          }
                          
                        });

                        
                      }else{
                        next(null, over);
                      }
                    });
                  },
                  
                  // Insert Batsman data ball by ball

                  function (over, next) {
                    console.log('match_key='+match_key+' over='+over);

                    CricketAPIServices.ballByBall(match_key, over).then((data)=>{
                        if(typeof data!='undefined'){
                           var index = 0, ball_by_ball_runs=0;
                           over = data.next_over;
                           previousOver = data.pre_over;
                           current_over = data.over.over;
                           currentOverKey = data.over.team+'_'+data.over.innings+'_'+current_over;

                           function processIteration(item, index) {
                              Batsman_score.find({
                                where: {matchKey: match_key,playerKey: data.balls[item].batsman.key, ballCount: {gt:0}},
                                fields: {ballByBallRuns: true}
                              }).then(function(rows){
                                  calculateTotalRuns(item, rows);
                              });
                           }

                           function calculateTotalRuns(item, rows){
                              var total_runs = rows.reduce(function(total, num) {
                                return num.ballByBallRuns + total;
                              }, 0);
                              getCountCallBack(item, rows.length, total_runs);
                           }

                           function getCountCallBack(item, count, total_runs) {
                              ball_by_ball_runs = data.balls[item].batsman.runs;
                              total_runs = data.balls[item].batsman.runs + total_runs;
                              battingTeam=data.balls[item].batting_team;
                              overdetail = data.balls[item].over_str;
                              overballs = data.balls[item].ball;
                              // If batsman hit 6 or 4 then save 6 and 4 in columns and update runs to 0
                              if(data.balls[item].batsman.six){
                                data.balls[item].batsman.six = 6;
                                data.balls[item].batsman.runs = 0;
                                console.log('six');

                                Batsman_score.updateAll({matchKey: match_key,playerKey:data.balls[item].batsman.key},
                                {lastBoundaryBall:count+1},function(err,resp){});

                              }
                              if(data.balls[item].batsman.four){
                                data.balls[item].batsman.four = 4;
                                data.balls[item].batsman.runs = 0;

                                console.log('four');

                                Batsman_score.updateAll({matchKey: match_key,playerKey:data.balls[item].batsman.key},
                                  {lastBoundaryBall:count+1},function(err,resp){});
                              }

                              // Insert each ball played by Batsman 

                              Batsman_score.find({
                                where: {matchKey: match_key,ballKey:item}
                              },function(err,rows){
                                if(rows.length==0){
                                  Batsman_score.create({
                                    matchKey: match_key,
                                    ballKey: item,
                                    team: data.balls[item].batting_team,
                                    playerKey: data.balls[item].batsman.key,
                                    overStr: data.balls[item].over_str,
                                    over: data.balls[item].over,
                                    ball: data.balls[item].ball,
                                    runs: data.balls[item].batsman.runs,
                                    ballFaced: count+1,
                                    totalRuns: total_runs,
                                    ballByBallRuns: ball_by_ball_runs,
                                    dotball: data.balls[item].batsman.dotball,
                                    six: data.balls[item].batsman.six,
                                    four: data.balls[item].batsman.four,
                                    ballCount: data.balls[item].batsman.ball_count,
                                    out: data.balls[item].team.wicket,
                                    nextOver: data.next_over
                                  },function(err,results){  
                                      calculatepoints(results);
                                    });
                                  }else{
                                    findInsertCallback();
                                  }
                              });

                              }

                            // Batsman points calculate  
                            function calculatepoints(batsmanInstance){
                              
                              leagues.find({
                                where:{
                                  or:[{code: 'max_bash'}, {code: 'max_boundary'},{code: 'max_score'},{code: 'fast_run'}]
                                }
                                // where: {code: 'max_bash'}
                              },function(err,leaguerows){
                                  var leagueitem = leaguerows;
                                  var counterleague = leaguerows.length;

                                  processCalculation(leagueitem[leagueitem.length-counterleague], leagueitem.length-counterleague);

                                  function processCalculation(leagueitem, index){
                                    
                                    CalculatePlayerPoints.getBatsmanApplicableRules(match_type,leagueitem.id).then((applicableRules)=>{
                                      
                                      CalculatePlayerPoints.batsmanPoints(match_key, match_type, leagueitem.id, leagueitem.code, batsmanInstance,applicableRules);
                                      setTimeout(() => {
                                        processnext();
                                      }, 2000);
                                    });
                                    
                                  }

                                  function processnext(){
                                    counterleague--;
                                    if(counterleague ==0){
                                      findInsertCallback();
                                    }else{
                                      processCalculation(leagueitem[leagueitem.length-counterleague], leagueitem.length-counterleague);
                                    }
                                  }

                              });
                            }

                            function findInsertCallback() {
                              next(null, data);
                            }
 
                           var item = data.over.balls;
                           var counterLength = item.length;
                           console.log('ballcounts=='+ballcounts);
                           processIteration(item[ballcounts], ballcounts);
                           
                          }else{
                           
                            cricketCallback();
                          }
                        }).catch(function(err) {
                          console.error('Oops we have an error', err);
                        })
                      

                  },

                  // Insert Bowler data
                  function (data, next) {
                    var bindex = 0, maiden=0,caughtAndBowled=0;
                    over = data.next_over;

                    function processIteration(item, index) {
                      data.balls[item].lbw = 0 ;
                      data.balls[item].bowled = 0;
                      data.balls[item].wide = 0;
                      data.balls[item].noball = 0;
                      data.balls[item].bye = 0;
                      data.balls[item].legbye = 0;
                      data.balls[item].hitwicket = 0;
                      data.balls[item].catches = 0;
                      data.balls[item].stumbed = 0;

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

                      // if(over!=null && Object.keys(data.over.balls).length == bowlruns.length && bowlruns.reduce(sum)==0){
                      //   maiden = 1;
                      // }

                      if(over!=null && Object.keys(data.over.balls).length == bowlruns.length && bowlruns.reduce(sum)==0){
                        maiden = 1;
                      }

                      // Caught and bold
                      if(data.balls[item].wicket_type=='catch'){
                        data.balls[item].catches=1;
                        if(Object.keys(data.balls[item].fielder).length > 0){
                          console.log(data.balls[item].bowler.key+'=='+data.balls[item].fielder.key);
                          if(data.balls[item].bowler.key==data.balls[item].fielder.key){
                            caughtAndBowled=1;
                          }
                        }
                      }
                      // Stumps
                      if(data.balls[item].wicket_type=='stumbed'){
                        data.balls[item].stumbed=1;
                      }


                      // Insert bowling data for Bowler
                    
                      // Insert each ball played by Batsman 

                      Bowler_score.find({
                        where: {matchKey: match_key,ballKey:item}
                      },function(err,rows){
                        if(rows.length==0){
                          Bowler_score.create({
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
                            stumps: data.balls[item].stumbed,
                            catches: data.balls[item].catches,
                            wicketType: data.balls[item].wicket_type,
                            ballType: data.balls[item].ball_type,
                            lbw: data.balls[item].lbw,
                            bowled: data.balls[item].bowled,
                            caughtBowled: caughtAndBowled,
                            hitwicket: data.balls[item].hitwicket,
                            maiden: maiden,
                            nextOver: data.next_over
                          },function(err,results){  
                              calculatepoints(results);
                            });
                          }else{
                            insertCallback();
                          }
                      });

                    }

                    // Calculate Bowler points
                    function calculatepoints(bowlerInstance){
                      leagues.find({
                        where:{
                          or:[{code: 'max_boundary'},{code: 'max_score'},{code: 'max_bash'},{code: 'fast_run'}]
                        }
                        // where:{code: 'max_bash'}
                      },function(err,leaguerows){
                        var leagueitem = leaguerows;
                        var counterleague = leaguerows.length;

                        processCalculation(leagueitem[leagueitem.length-counterleague], leagueitem.length-counterleague);

                        function processCalculation(leagueitem, index){
                          CalculatePlayerPoints.getBowlerApplicableRules(match_type,leagueitem.id).then((applicableRules)=>{
                            CalculatePlayerPoints.bowlerPoints(match_key, match_type, leagueitem.id, leagueitem.code, bowlerInstance,applicableRules);
                              setTimeout(() => {
                                processnext();
                              }, 2000);
                          });
                        }

                        function processnext(){
                          counterleague--;
                          if(counterleague ==0){
                            insertCallback();
                          }else{
                            processCalculation(leagueitem[leagueitem.length-counterleague], leagueitem.length-counterleague);
                          }
                        }
                      });
                    }


                    function insertCallback() {
                      next(null, data);
                    }
                   

                    var item = data.over.balls;
                    var counterLength = item.length;

                    console.log('ballcounts=='+ballcounts);
                    processIteration(item[ballcounts], ballcounts);

                  },
                  // Insert fielder data 
                  function (data, next) {
                    var findex = 0;
                    over = data.next_over;


                    function processIteration(item, index) {
                      if(data.balls[item].batting_team=="a")
                        bowling_team = "b";

                      if(Object.keys(data.balls[item].fielder).length > 0){

                        Fielder_score.find({
                          where: {matchKey: match_key,ballKey:item}
                        },function(err,rows){
                          if(rows.length==0){
                            Fielder_score.create({
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
                                calculatepoints(results);
                              });
                            }else{
                              insertCallback();
                            }
                        });
                        
                      }else{
                        insertCallback();
                      }
                    }

                    // Calculate Fielder points
                    function calculatepoints(fielderInstance){
                      leagues.find({
                        where:{
                          or:[{code: 'max_boundary'},{code: 'max_score'},{code: 'max_bash'},{code: 'fast_run'}]
                        }
                        // where: {code: 'max_bash'}
                      },function(err,leaguerows){
                        var leagueitem = leaguerows;
                        var counterleague = leaguerows.length;

                        processCalculation(leagueitem[leagueitem.length-counterleague], leagueitem.length-counterleague);

                        function processCalculation(leagueitem, index){
                          
                          CalculatePlayerPoints.fielderPoints(match_key, match_type, leagueitem.id, leagueitem.code, fielderInstance);
                          setTimeout(() => {
                            processnext();
                          }, 2000);
                        }

                        function processnext(){
                          counterleague--;
                          if(counterleague ==0){
                            insertCallback();
                          }else{
                            processCalculation(leagueitem[leagueitem.length-counterleague], leagueitem.length-counterleague);
                          }
                        }
                        
                      });
                    }

                    function insertCallback() {
                      next(null, data);
                    }

                    var item = data.over.balls;
                    var counterLength = item.length;

                    console.log('ballcounts=='+ballcounts);
                    processIteration(item[ballcounts], ballcounts);

                  },

                  // Get Match ID

                  function(data,next){
                    Matches.findOne({
                      where:{matchKey:match_key}
                    },function(err,row){
                      MatchID = row.id;
                      //console.log(row.id);
                    });
                    next(null,data);
                  },


                  // Update Match Status

                  function(data, next){
                    var currentOver, strikerkey,nonstrikerkey,strikername,nonstrikername,batting_team,battingteamkey,tosswon,innings,matchovers,teamwonkey,decision,
                    manOfMatch;
                    
                    getMatchStatus.getMatchStatusData(match_key,battingTeam).then((finalmatchdata)=>{
                      
                      if(overdetail.includes(".6")){
                          overdetail = parseInt(data.over.over) +'.0';
                      }

                      matchdata = finalmatchdata;
                      matchStatus = finalmatchdata.matchStatus;
                      let date = new Date();
                      let currentDateTime = date.getFullYear()+'/'+(date.getMonth()+1)+'/'+date.getDate()+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
                        // console.log(finalmatchdata);
                        // process.exit();
                      match_stats.findOne({
                        where:{
                          matchKey: match_key
                        }
                      }).then(function(result){
                        
                        if(result!=null){
                         
                          match_stats.updateAll({
                            matchKey: match_key,
                          },
                          {
                            nonstrikerName: finalmatchdata.nonstrikername,
                            strikerKey: finalmatchdata.strikerkey,
                            nonStrikerKey: finalmatchdata.nonstrikerkey,
                            strikerName: finalmatchdata.strikername,
                            battingTeamKey: finalmatchdata.currentbattingteam,
                            currentOver: current_over,
                            overKey: currentOverKey,
                            status: matchStatus,
                            //status: live_status,
                            prevOver: previousOver,
                            nextOver: over,
                            innings: finalmatchdata.crickInnings,
                            firstinningteam: finalmatchdata.firstinningteam,
                            secondinningteam: finalmatchdata.secondinningteam,
                            matchOvers: finalmatchdata.matchovers,
                            winnerTeam:finalmatchdata.winnerTeam,
                            matchEndTime:finalmatchdata.matchendtime,
                            toss: finalmatchdata.tosswon,
                            captainTossWinner:finalmatchdata.winningTossCaptain,
                            manofmatch:finalmatchdata.manOfMatch,
                            currentOverDetail: overdetail,
                            statusOverview: finalmatchdata.matchStatusOverview,
                            created: currentDateTime
                          },function(err,result){
                            if(err) throw err;
                            
                            console.log('updated match');
                            next(null, 'success');

                            });
                        }else{
                          //console.log('try creating ');
                          match_stats.create(
                            {
                              matchKey: match_key,
                              nonstrikerName: finalmatchdata.nonstrikername,
                              strikerKey: finalmatchdata.strikerkey,
                              nonStrikerKey: finalmatchdata.nonstrikerkey,
                              strikerName: finalmatchdata.strikername,
                              battingTeamKey: finalmatchdata.battingteamkey,
                              status: matchStatus,
                              //status: live_status,
                              prevOver: previousOver,
                              nextOver: over,
                              innings: finalmatchdata.crickInnings,
                              firstinningteam: finalmatchdata.firstinningteam,
                              secondinningteam: finalmatchdata.secondinningteam,
                              matchOvers: finalmatchdata.matchovers,
                              currentOver: current_over,
                              overKey: currentOverKey,
                              toss: finalmatchdata.tosswon,
                              captainTossWinner:finalmatchdata.winningTossCaptain,
                              currentOverDetail: overdetail,
                              statusOverview: finalmatchdata.matchStatusOverview,
                              created: currentDateTime
                            },function(err,results){
                                if(err)
                                throw(err)

                                console.log('created match');
                                next(null, 'success');
                            });
                          }
                      })
                      .catch(function(err){
                        throw err;
                      });

                    });

                  },


                  // Update Ranks
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
                          if(overballs==6){
                            CustomQuery.updateRank(client.match_contest_id).then((data)=>{
                              getRank(client,league.code);
                            });
                          }else{
                            getRank(client,league.code);
                          }
                          // CustomQuery.updateRank(client.match_contest_id).then((data)=>{
                          //   getRank(client,league.code);
                          // });
                          
                        }else if(league.code=='fast_run'){ 
                          if(overballs==6){
                            CustomQuery.updateFastRank(client.match_contest_id).then((data)=>{
                              CustomQuery.getFastRank(client.user_id,client.match_contest_id).then((data)=>{
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

                                client.ranks={currentPosition: rank,totalcontests: total, topTeamScore: top_team_score};
                                nextcallback();
                              });
                            });
                          }else{
                            CustomQuery.getFastRank(client.user_id,client.match_contest_id).then((data)=>{
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
                              client.ranks={currentPosition: rank,totalcontests: total, topTeamScore: top_team_score};
                              nextcallback();
                            });
                          }
                          
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
                    
                  },

                  function(data,next){
                    CustomQuery.matchStatus(match_key).then((matchStatus)=>{
                      next(null,matchStatus);
                  });
                  },

                  // Create Generic Data Log files

                  function (matchStatusData,next){
                    leagues.findOne({
                      where:{code: 'max_bash'}
                    },function(err,row){
                      getpoints.points(match_key, row.id, match_type).then((Points)=>{
                        let maxbashscoringPoints = Points;
                        maxbashscoringPoints.matchStatus=matchStatusData[0];
                        finalScores.genericMaxbashScores(match_key,match_type,maxbashscoringPoints,overdetail).then((data)=>{
                          next(null,matchStatusData);
                        });
                      });
                      
                    });

                  },

                  // Create Generic Fast Score Data log files

                  function(matchStatusData,next){
                    leagues.findOne({
                      where:{code: 'fast_run'}
                    },function(err,row){
                      getpoints.points(match_key, row.id, match_type).then((Points)=>{
                        let fastscoringPoints = Points;
                        fastscoringPoints.matchStatus=matchStatusData[0];
                        finalScores.genericFastScores(match_key,match_type,fastscoringPoints,overdetail).then((data)=>{
                          next(null,matchStatusData);
                        });
                      });
                      
                    });
                  },


                  // Create Generic Max Boundary Data log files

                  function(matchStatusData,next){
                    leagues.findOne({
                      where:{code: 'max_boundary'}
                    },function(err,row){
                      getpoints.points(match_key, row.id, match_type).then((Points)=>{
                        let maxBoundaryPoints = Points;
                        maxBoundaryPoints.matchStatus=matchStatusData[0];
                        finalScores.genericMaxBoundaryLogs(match_key,match_type,maxBoundaryPoints,overdetail,'max_boundary').then((data)=>{
                          next(null,matchStatusData);
                        });
                      });
                      
                    });
                  },


                  // Create Generic Max Score Data log files

                  function(matchStatusData,next){
                    leagues.findOne({
                      where:{code: 'max_score'}
                    },function(err,row){
                      getpoints.points(match_key, row.id, match_type).then((Points)=>{
                        let maxScorePoints = Points;
                        maxScorePoints.matchStatus=matchStatusData[0];
                        finalScores.genericMaxScoreLogs(match_key,match_type,maxScorePoints,overdetail,'max_score').then((data)=>{
                          next(null,matchStatusData);
                        });
                      });
                      
                    });
                  },


                  
                  // Push data to client

                  function(matchStatusData, next){
                    var finalData = {};
                    var players=[];  
                    var batting='';
                    var currentover='';
                    var mStatus='';
                    var totalInningsOver=0;
                    var playingStatus;
                    var finalscores = app.models.Finalscores;  
                    var totalscore=0;
                    
                    function userMatchCallback(client, index){
                        Userteams.find({
                          include: ['users','matches','matchContests','userTeamPlayers'],
                          where:{userId: client.user_id, matchId: client.match_id, matchContestId: client.match_contest_id}
                        },function(err,rows){
                          
                          for(var i = 0; i<rows.length;++i){
                              leagueId = rows[i].matchContests().leagueId;
                          }
                          getMatch(client, leagueId);
                      });
                    }

                    function getMatch(client, league_id){
                      Matches.findOne({where: {id: client.match_id}},function(err,matchrows){
                        userPlayers(client, matchrows.matchKey, league_id);
                      });
                    }

                    function userPlayers(client, match_key, league_id){
                      Userteams.findOne({
                        include: {
                          userTeamPlayers: ['players','seasonTeams']
                        },
                        where:{userId: client.user_id, matchId: client.match_id, matchContestId: client.match_contest_id}
                      }, function(err, rows){
                          if(rows!=null){
                            // scoringPoints
                            getpoints.points(match_key, leagueId, match_type).then((Points)=>{
                              scoringPoints = Points;
                              scoringPoints.matchStatus=matchStatusData[0];


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
                                  getLeagueByLeagueId(client, match_key, league_id, finalplayers);
                                  //next( null, {userplayers:finalplayers});
                                }else{
                                  processIteration(item[item.length-counterLength]);
                                }
                              }


                              //getLeagueByLeagueId(client, match_key, league_id, rows.userTeamPlayers());
                            });
                            //getFinalScores(client, match_key, league_id, rows.userTeamPlayers());
                          }else{
                            nextcallback();
                          }
                      });
                    }

                  // Get League name  
                  function getLeagueByLeagueId(client, match_key, league_id, userplayers){
                    leagues.findOne({
                      where: {id: league_id}
                    },function(err,league){
                      // if max bash then
                      if(league.code=='max_bash'){ 
                        
                        finalScores.maxbashScores(client, match_key, match_type, userplayers,client.ranks,scoringPoints).then((finalData)=>{
                          
                          if(Object.keys(client.ranks).length>0){
                            app.io.to(client.id).emit('listPlayerPoints',finalData);
                            console.log(finalData);
                            nextcallback();
                          }else{
                            getRank(client,'max_bash',finalData);
                          }

                          
                          function getRank(client,leage_code,finalData){
                            CustomQuery.getRank(client.user_id,client.match_contest_id).then((data)=>{
                              finalData.response.currentPosition=String(data[0].rank);
                              finalData.response.totalcontests=data[0].total;
                              finalData.response.topTeamScore=data[0].top_team_score;
                              app.io.to(client.id).emit('listPlayerPoints',finalData);
                              console.log(finalData);
                              nextcallback();
                            });
                          }

                          
                          /* Max Bash Specific Log file data don't delete this code, may be used in future
                          if(headerMaxBashBool==0){
                            let maxbashHeader='Over \t Order \t PlayerName \t BallsFaced \t blfs \t nblfs \t netblfs \t Score \t playingStatus \n\r';
                            fs.appendFile(match_key+'_'+league.code+'_'+client.user_id+'.csv', maxbashHeader, function(err) {
                              if (err) throw err;
                            });
                          }
                          headerMaxBashBool=1;  
                          

                          finalData.response.players.map((players,index)=>{
                                setTimeout(() => {
                                  console.log('ORDERS===>'+players.order);
                                  fs.appendFile(match_key+'_'+league.code+'_'+client.user_id+'.csv', overdetail+ '\t' +players.order+ '\t' +players.player_name+ '\t' + players.ballsFaced + '\t' + players.blfs +'\t'+ players.nblfs + '\t' + 
                                  players.netblfs+'\t'+ players.score+'\t'+ players.playing_status+'\n\r', function(err) {
                                    if (err) throw err;

                                    if( (finalData.response.players.length-1)== index ){
                                      fs.appendFile(match_key+'_'+league.code+'_'+client.user_id+'.csv','\n\r', function(err) {
                                        if (err) throw err;
                                      });
                                      nextcallback();
                                    }
                                  });    
                                }, 1000);
                          });
                          */
                            
                        });
                      }
                      else if(league.code=='fast_run'){
                        finalScores.fastRunScores(client, match_key, match_type, league_id, userplayers, crickInnings,scoringPoints).then((finalData)=>{
                          console.log(finalData);
                          app.io.to(client.id).emit('listPlayerPoints',finalData);
                          nextcallback();
                        });
                      }
                      else{
                        getFinalScores(client, match_key, match_type, league.code, userplayers);
                      }
                    });
                  }

    
                  function getFinalScores(client, match_key, match_type, league_code, userplayers){
                    finalScores.getFinalScores(client, match_key, match_type, league_code, userplayers,client.ranks,scoringPoints).then((finalData)=>{
                     console.log(finalData);
                      app.io.to(client.id).emit('listPlayerPoints',finalData);
                      nextcallback();
                    });
                      
                    }

                      function nextcallback(){
                        console.log('counter length=');
                        console.log(counterLength);
                          counterLength--;
                          if(counterLength == 0) {
                            next(null, 'success');
                          }else {
                            userMatchCallback(clients[clients.length-counterLength], clients.length-counterLength);
                          }
                      }
                      
                      
                      console.log('clients==>');
                      console.log(clients);
                      console.log(clients.length);
                      var counterLength = clients.length;
                      console.log('counter==');
                      console.log(counterLength);
                      
                      if(counterLength>0){
                        userMatchCallback(clients[clients.length-counterLength], clients.length-counterLength); 
                      }else{
                        next(null, 'success');
                      }

                  }

                ], function(err,obj){

                  if(matchStatus=='completed'){
                    var options = {
                      url: phphost+'crickets/update_match_status/'+MatchID+'/3',
                      method: 'GET'
                    }
                    //Uncomment
                    request(options,function(error, resp, body){
                      console.log('Match Status Updated');
                    });
                  
                  }

                
                  // var requestrankOptions = {
                  //   url: nodehost+'api/ContestParticipants/updateRank?match_id='+MatchID,
                  //   method: 'GET'
                  // }
                  // request(requestrankOptions,function(error, resp, body){
                  //   console.log('Ranks Updated');
                  // });


                  //console.log(matchStatusOverview);

                  // if(matchStatusOverview=='in_play'){
                  //   setTimeout(function() {
                  //     cricketCallback();
                  //   }, 5000);
                  // }else{
                  //   console.log('Delay 10 minutes');
                  //   setTimeout(function() {
                  //     cricketCallback();
                  //   }, 600000);
                  // }
                  
                  ballcounts++;
                  var timer = setTimeout(function() {
                    cricketCallback();
                  }, 1000);

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