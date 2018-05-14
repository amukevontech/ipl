'use strict';

// Amuk - Now next, you should work on picking matches, contests, contest participants, their teams, order etc from our server.

 
module.exports = function(Cricketapi) {
  const app = require('../../server/server');
  const async= require("async");
  const request = require('request');
  const CricketAPIServices = require('../../server/services');
  const CalculatePlayerPoints = require('../../server/calculateplayerpoints');
  const CustomQuery = require('../../server/customQueries');
  const finalScores = require('../../server/finalscores');

  var matchStatus,matchStatusOverview, previousOver,current_over, currentOverKey,battingTeam,crickInnings=1;
  var match_id, user_id, leagueId, captain_multiplier=1.5, viceCaptain_multiplier=1.5, allrounder_multiplier=1.5, ballLimit=5,
  TossCaptainpoints={},winningTossCaptain='',playingXiPoints={},winningTeamPoints={}, winnerTeam;
  var clients=[];
  //clients.push({ id: '12334243423424', user_id: 9, match_id: 106, match_contest_id: 1508,score:0,counter:0 });
  clients.push({ id: '12334243423424', user_id: 9, match_id: 107, match_contest_id: 1511,score:0,counter:0 });
  //clients.push({ id: 'EEFEJHFUEEEGEGEEEE_', user_id: 9, match_id: 107, match_contest_id: 1511,score:0,counter:0 });
  //clients.push({ id: '12334243423424', user_id: 9, match_id: 107, match_contest_id: 1511,score:0,counter:0 });
  //clients.push({ id: '12334243423424', user_id: 9, match_id: 107, match_contest_id: 1510,score:0,counter:0 });
    
  


  function sum(total, num) {
    return total + num;
  }
  

  function addClients(socketId, data) {
    var found = clients.some(function (el) {
      return el.id === socketId;
    });
    if (!found) {
      clients.push({ id: socketId, user_id: data.user_id, match_id: data.match_id, match_contest_id: data.match_contest_id, score:0,counter:0 }); 
    }else{
      let clienData= clients.find(c => c.id === socketId);
      clients[clients.indexOf(clienData)]={id: socketId, user_id: data.user_id, match_id: data.match_id, match_contest_id: data.match_contest_id, score:0,counter:0};
    }
  }


    // Ball By Ball API: 
    // @params: match_key, over, match_type
    Cricketapi.ballbyball = function(match_key, over, match_type, cb){
      //addClients('12334243423424', { user_id: 10, match_id: 108, match_contest_id: 1510});
      //console.log(clients);
      app.io.sockets.on('connection', function(socket){
        //console.log(app.io.sockets.clients().connected);
        
        socket.on('finalScores', function(data){
          addClients(socket.id, data);
          //clients.push({id: socket.id, user_id: data.user_id, match_id: data.match_id});
          
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
                                  ballFaced: count+1,
                                  totalRuns: total_runs,
                                  ballByBallRuns: ball_by_ball_runs,
                                  dotball: data.balls[item].batsman.dotball,
                                  six: data.balls[item].batsman.six,
                                  four: data.balls[item].batsman.four,
                                  ballCount: data.balls[item].batsman.ball_count,
                                  out: data.balls[item].bowler.wicket,
                                  nextOver: data.next_over
                                },function(err,results){
                                  //findInsertCallback();
                                  calcuatepoints(results);
                                });
                              }

                            // Batsman points calculate  
                            function calcuatepoints(batsmanInstance){
                              leagues.find({
                                where:{
                                  or:[{code: 'max_bash'}, {code: 'max_boundary'},{code: 'max_score'},{code: 'fast_run'}]
                                }
                                //where: {code: 'max_bash'}
                              },function(err,leaguerows){
                                  var leagueitem = leaguerows;
                                  var counterleague = leaguerows.length;

                                  processCalculation(leagueitem[leagueitem.length-counterleague], leagueitem.length-counterleague);

                                  function processCalculation(leagueitem, index){
                                    
                                    CalculatePlayerPoints.batsmanPoints(match_key, match_type, leagueitem.id, leagueitem.code, batsmanInstance);
                                    setTimeout(() => {
                                      processnext();
                                    }, 2000);
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
                              counterLength--;
                              console.log('Batsman counterLength '+counterLength);
                              if(counterLength == 0) {
                                next(null, data);
                              }else {
                                processIteration(item[item.length-counterLength], item.length-counterLength);
                              }	
                            }
 
                           var item = data.over.balls;
                           var counterLength = item.length;
                           processIteration(item[item.length-counterLength], item.length-counterLength);
                           //next(null, data);
                          }else{
                            //console.log('here');
                            cricketCallback();
                          }
                        }).catch(function(err) {
                          console.error('Oops we have an error', err);
                        })
                      

                  },

                  // Insert Bowler data
                  function (data, next) {
                    var bindex = 0, bowlruns=[], maiden=0;
                    over = data.next_over;

                    function processIteration(item, index) {
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
                        //insertCallback();
                        calculatepoints(results);
                      });
                    }

                    // Calculate Bowler points
                    function calculatepoints(bowlerInstance){
                      leagues.find({
                        where:{
                          or:[{code: 'max_boundary'},{code: 'max_score'},{code: 'max_bash'},{code: 'fast_run'}]
                        }
                      },function(err,leaguerows){
                        var leagueitem = leaguerows;
                        var counterleague = leaguerows.length;

                        processCalculation(leagueitem[leagueitem.length-counterleague], leagueitem.length-counterleague);

                        function processCalculation(leagueitem, index){
                          
                          CalculatePlayerPoints.bowlerPoints(match_key, match_type, leagueitem.id, leagueitem.code, bowlerInstance);
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
                      counterLength--;
                      console.log('Bowler counterLength '+counterLength);
                      if(counterLength == 0) {
                        next(null, data);
                      }else {
                        processIteration(item[item.length-counterLength], item.length-counterLength);
                      }	
                    }
                   

                    var item = data.over.balls;
                    var counterLength = item.length;
                    processIteration(item[item.length-counterLength], item.length-counterLength);
                    //next(null, data);
                  },
                  // Insert fielder data 
                  function (data, next) {
                    var findex = 0;
                    over = data.next_over;


                    function processIteration(item, index) {
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
                            
                              calculatepoints(results);
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
                      counterLength--;
                      console.log('Fielder counterLength '+counterLength);
                      if(counterLength == 0) {
                        next(null, data);
                      }else {
                        processIteration(item[item.length-counterLength], item.length-counterLength);
                      }	
                    }

                    var item = data.over.balls;
                    var counterLength = item.length;

                    processIteration(item[item.length-counterLength], item.length-counterLength);
                    //next(null, data);
                  },

                  // Update Match Status

                  function(data, next){
                    var currentOver, strikerkey,nonstrikerkey,strikername,nonstrikername,batting_team,battingteamkey,tosswon,innings,matchovers,teamwonkey,decision;
                    CricketAPIServices.getMatchResponse(match_key).then((data)=>{

                      if(data.card.status===null)
                        matchStatus ='none';
                      else
                      matchStatus = data.card.status;


                      if(data.card.status_overview===null)
                      matchStatusOverview ='none';
                      else
                      matchStatusOverview = data.card.status_overview;
                      
                      //matchStatus ='started';

                      if(data.card.match_overs===null)
                        matchovers=0;
                      else
                        matchovers=data.card.match_overs;

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
                        decision = data.card.toss.decision;
                        if(data.card.toss.won=='a'){
                          tosswon=data.card.teams.a.key;
                          teamwonkey='a';
                        }
                        else if(data.card.toss.won=='b'){
                          tosswon=data.card.teams.b.key;
                          teamwonkey='b';
                        }
                        else{
                          tosswon='not announced';
                          teamwonkey='';
                        }
                      }

                      // Get Winning Toss Captain

                      if(teamwonkey!=''){
                        winningTossCaptain=data.card.teams[teamwonkey].match.captain;
                      }

                      // Calculate Innings

                      // in 1st inning b is batting, in 2nd inning a is batting
                      if((teamwonkey=='a' && decision=='bowl') || (teamwonkey=='b' && decision=='bat')){
                        console.log('in 1st inning b is batting, in 2nd inning a is batting');
                        console.log(battingTeam);
                        if(battingTeam=='a'){
                          crickInnings=2;
                        }
                        console.log('crickInnings '+crickInnings);
                      }
                      // in 1st inning a is batting, in 2nd inning b is batting
                      else if((teamwonkey=='a' && decision=='bat') || (teamwonkey=='b' && decision=='bowl')){
                        console.log('in 1st inning a is batting, in 2nd inning b is batting');
                        console.log(battingTeam);
                        if(battingTeam=='b'){
                          crickInnings=2;
                        }
                        console.log('crickInnings '+crickInnings);
                      }

                      if(data.card.winner_team==null)
                        winnerTeam=''
                      else
                        winnerTeam=data.card.teams[data.card.winner_team].key;

                      if(data.card.now.innings===null)
                        innings=1;
                      else
                        innings=data.card.now.innings;

                      console.log('Innings ==>'+innings);

                      if(data.card.innings[(batting_team+ '_'+data.card.now.innings)].overs===null)  
                        currentOver = '0.0';
                        else
                        currentOver = data.card.innings[(batting_team+ '_'+data.card.now.innings)].overs;

                      match_stats.findOne({
                        where:{
                          matchKey: match_key
                        }
                      }).then(function(result){
                        //console.log(result);
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
                            innings: crickInnings,
                            matchOvers: matchovers,
                            winnerTeam:winnerTeam,
                            toss: tosswon,
                            captainTossWinner:winningTossCaptain,
                            currentOverDetail: currentOver,
                            statusOverview: matchStatusOverview
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
                              innings: crickInnings,
                              matchOvers: matchovers,
                              currentOver: current_over,
                              overKey: currentOverKey,
                              toss: tosswon,
                              captainTossWinner:winningTossCaptain,
                              currentOverDetail: currentOver,
                              statusOverview: matchStatusOverview
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

                  function(data,next){
                    CustomQuery.matchStatus(match_key).then((matchStatus)=>{
                      next(null,matchStatus);
                  });
                  },

                  // Get Toss points
                  /*
                  function(data,next){
                    CalculatePlayerPoints.getPoints(match_key, leagueId, match_type,'all','tw').then((data)=>{
                      TossCaptainpoints={
                        points: data.points,
                        operation: data.operation 
                      };
                      //TossCaptainpoints = data.points;
                      next(null,data);
                    });
                  },

                  //getplayingXiPoints

                  function(data,next){
                    CalculatePlayerPoints.getPoints(match_key, leagueId, match_type,'all','starting11').then((data)=>{
                      playingXiPoints={
                        points: data.points,
                        operation: data.operation 
                      };

                      //playingXiPoints = data.points;
                      next(null,data);
                    });
                  },


                  //getWinningPoints

                  function(data,next){
                    CalculatePlayerPoints.getPoints(match_key, leagueId, match_type,'all','wtp').then((data)=>{
                      winningTeamPoints={
                        points:data.points,
                        operation: data.operation
                      };

                      //winningTeamPoints = data.points;
                      next(null,data);
                    });
                  },

                  */
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
                          userTeamPlayers: ['players']
                        },
                        where:{userId: client.user_id, matchId: client.match_id, matchContestId: client.match_contest_id}
                      }, function(err, rows){
                          if(rows!=null){
                            //getLeagueByLeagueId(client, match_key, league_id, rows.userTeamPlayers());
                            tossPoints(client, match_key, league_id, rows.userTeamPlayers());


                            //getFinalScores(client, match_key, league_id, rows.userTeamPlayers());
                          }else{
                            nextcallback();
                          }
                      });
                    }  


                    function tossPoints(client, match_key, league_id, userplayers){
                      CalculatePlayerPoints.getPoints(match_key, leagueId, match_type,'all','tw').then((data)=>{
                        TossCaptainpoints={
                          points: data.points,
                          operation: data.operation 
                        };
                        XiPoints(client, match_key, league_id, userplayers);
                      });
                    }

                    function XiPoints(client, match_key, league_id, userplayers){
                      CalculatePlayerPoints.getPoints(match_key, leagueId, match_type,'all','starting11').then((data)=>{
                        playingXiPoints={
                          points: data.points,
                          operation: data.operation 
                        };
                        winningPoints(client, match_key, league_id, userplayers);
                        
                      });
                    }

                    function winningPoints(client, match_key, league_id, userplayers){
                      CalculatePlayerPoints.getPoints(match_key, leagueId, match_type,'all','wtp').then((data)=>{
                        winningTeamPoints={
                          points:data.points,
                          operation: data.operation
                        };
  
                        getLeagueByLeagueId(client, match_key, league_id, userplayers);
                        
                      });
                    }

                  
                    
                  // Get League name  
                  function getLeagueByLeagueId(client, match_key, league_id, userplayers){
                    leagues.findOne({
                      where: {id: league_id}
                    },function(err,league){
                      // if max bash then
                      if(league.code=='max_bash'){ 
                        maxbashScores(client, match_key, userplayers);
                        
                      }
                      else if(league.code=='fast_run'){
                        finalScores.fastRunScores(client, match_key, league_id, userplayers, crickInnings, matchStatusData,winningTossCaptain,TossCaptainpoints,playingXiPoints,winningTeamPoints).then((finalData)=>{
                          console.log(finalData);
                          app.io.to(client.id).emit('listPlayerPoints',finalData);
                          
                          const Configs = app.models.Configs;
                          const MatchContests = app.models.MatchContests;

                          MatchContests.findOne({
                            where:{id: client.match_contest_id, leagueId: league_id, matchId: client.match_id}
                          },function(err,rows){
                             if(rows!=null){
                              fastRank(client,finalData, rows.targetScore, rows.targetScoreGrace);
                             }

                             /*
                             else{
                              Configs.find({
                                where:{
                                  and:[
                                    {
                                    or:[
                                      {code: 'target_score'},
                                      {code: 'grace'}
                                    ]
                                  },
                                  {
                                    type: match_type.toUpperCase()
                                  }                             
                                  ]
    
                                }
                              },function(err,rows){
    
                                let target_score = rows.find(conf => conf.code === 'target_score');
                                let grace = rows.find(conf => conf.code === 'grace');
                                
                                fastRank(client,finalData, target_score.value, grace.value);
                              });

                             }*/

                          }); 


                          
                        });
                      }
                      else{
                        getFinalScores(client, match_key, league_id, userplayers);
                      }
                    });
                  }

                  // update fast rank

                  function fastRank(client,finalData, target_score, grace){
                    CustomQuery.fastRank(client.user_id,client.match_contest_id,finalData,target_score, grace).then((data)=>{
                      app.io.to(client.id).emit('listPlayerPoints',data);
                      
                      //nextcallback();
                      console.log(data);
                      nextcallback();
                    });
                  }


                  
                  // Max Bash Scores
                  function maxbashScores(client, match_key, userplayers){
                    console.log('MAX BASH SCores');
                    var maxbashscores = app.models.Maxbashscores;
                    var totalBallFaced=0,flag=0,maxbash=[];
                    var counterUserPlayersLength =  userplayers.length;
                    client.counter = userplayers.length;
                    //console.log('total players');
                    //console.log(client.counter);
                    var batting;

                    CustomQuery.maxBashData(match_key).then((rows)=>{
                      
                    // });

                    
                    // maxbashscores.find({
                    //   where: {matchKey: match_key}
                    // },function(err,rows){
                      if(rows.length>0){
                      
                      userplayers.sort(function(a, b) {
                        return parseInt(a.order) - parseInt(b.order);
                      });

                      // Handle the case if Player is out from the series but is the part of user team
                      for(var j=0;j<userplayers.length;j++){
                        
                        if(typeof rows.find(x =>x.playerKey === userplayers[j].players().playerKey) === 'undefined'){
                          
                          rows.push({
                            matchKey: match_key,
                            playerKey: userplayers[j].players().playerKey,
                            ballFaced: 0,
                            nblfs: 0,
                            blfs: 0,
                            playerFullname: '',
                            playerName: '',
                            matchType: '',
                            captain:0,
                            playingRole:'',
                            team:'',
                            teamFullname: '',
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
                            role:0
                          });

                        }
                      }

                      
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
                              
                            if(rows[i].playingXi==1){
                              if(playingXiPoints.operation==1){
                                rows[i].nblfs=parseFloat(rows[i].nblfs+playingXiPoints);
                              }else{
                                rows[i].nblfs=parseFloat(rows[i].nblfs*playingXiPoints);
                              }
                            }


                            totalBallFaced+=rows[i].ballFaced;
                            
                            if(totalBallFaced<=ballLimit){
                              net_blfs=rows[i].blfs;
                              
                              maxBash(client,match_key,rows[i],rows[i].ballFaced,totalBallFaced,rows[i].nblfs,rows[i].blfs,ballLimit,flag,uplayer.order,counterUserPlayersLength);
                            }else{
                              // If Ball limit is reached
                              if(flag==0 && (rows[i].ballFaced-(totalBallFaced-ballLimit))>0){
                                console.log('1 here');
                                flag=1;
                                maxBash(client,match_key,rows[i],rows[i].ballFaced,totalBallFaced,rows[i].nblfs,rows[i].blfs,ballLimit,flag,uplayer.order,counterUserPlayersLength);
                                extraballsfaced=totalBallFaced-ballLimit;
                              }else{
                                flag=2;
                                maxBash(client,match_key,rows[i],rows[i].ballFaced,totalBallFaced,rows[i].nblfs,rows[i].blfs,ballLimit,flag,uplayer.order,counterUserPlayersLength);
                              }

                            }


                            function maxBash(client,match_key,rows,bf,tbf,nblfs,blfs,limit,flag,order,counterUserPlayersLength){
                              var netblfs=0,totalscore=0,playingStatus;
                              var maxbashtotalscore=0;


                              if(rows.playingStatus==null)
                                  playingStatus='notout';
                              else
                                  playingStatus=rows.playingStatus;


                              // If Ball limit is not reached then calculate 
                              //Total score = Net BLFS + NBLFS
                              // Net BLFS = BLFS

                              if(flag==0){  
                                netblfs=blfs;
                                totalscore=netblfs+nblfs;
                                if(uplayer.role==1){
                                  totalscore = parseFloat(totalscore*captain_multiplier); 
                                  if(winningTossCaptain==uplayer.players().playerKey){
                                    if(TossCaptainpoints.operation==1){
                                      totalscore=parseFloat(totalscore+TossCaptainpoints.points);
                                    }else{
                                      totalscore=parseFloat(totalscore*TossCaptainpoints.points);
                                    }
                                  }
                                }
                                else if(uplayer.role==2){
                                  totalscore = parseFloat(totalscore*viceCaptain_multiplier); 
                                }

                                if(uplayer.players().type =='AR'){
                                  totalscore = parseFloat(totalscore*allrounder_multiplier); 
                                }
                                //client.score+=totalscore;  
                                //maxbashtotalscore+=totalscore;
                                var rows_blfs;
                                if(rows.blfs===null){
                                  rows_blfs=0;
                                }else{
                                  rows_blfs=rows.blfs;
                                }

                                maxbash.push({
                                  match_key: match_key,
                                  player_name: rows.playerName,
                                  player_key:rows.playerKey,
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
                                  team_id:String(uplayer.seriesTeamId),
                                  user_team_id:String(uplayer.user_team_id),
                                  row_id: String(uplayer.id),
                                  player_id: uplayer.playerId,
                                  id:String(uplayer.playerId),
                                  playingXi: rows.playingXi,
                                  ballsFaced:rows.ballFaced,
                                  totalBallsFaced: tbf,
                                  nblfs: rows.nblfs,
                                  blfs:rows_blfs,
                                  netblfs:netblfs,
                                  score:totalscore,
                                  order:order,
                                  role: String(uplayer.role)
                                });
                                //console.log(maxbash);
                                client.counter--;
                                maxbashnextcallback(client,rows);
                              }
                              else if(flag==1){
                                var Batsman_score = app.models.BatsmanScores;
                                //console.log('prev_bf='+bf);
                                bf=bf-(tbf-limit);
                                tbf=limit;
                                //console.log('tbf='+tbf);
                                //console.log('bf='+bf);

                                if(uplayer.role==1){
                                  totalscore = parseFloat(totalscore*captain_multiplier); 
                                  if(winningTossCaptain==uplayer.players().playerKey){
                                    if(TossCaptainpoints.operation==1){
                                      totalscore=parseFloat(totalscore+TossCaptainpoints.points);
                                    }else{
                                      totalscore=parseFloat(totalscore*TossCaptainpoints.points);
                                    }
                                  }
                                }
                                else if(uplayer.role==2){
                                  totalscore = parseFloat(totalscore*viceCaptain_multiplier); 
                                }

                                if(uplayer.players().type =='AR'){
                                  totalscore = parseFloat(totalscore*allrounder_multiplier); 
                                }
                                //client.score+=totalscore;
                                // console.log(bf);
                                // console.log(rows.playerKey);
                                // console.log(match_key);
                                Batsman_score.findOne({
                                  where: {matchKey: match_key,playerKey:rows.playerKey,ballFaced:bf}
                                },function(err,row){
                                  var blfs;
                                  // console.log(row);
                                  if(row.blfs===null){
                                    blfs=0;
                                  }else{
                                    blfs=row.blfs;
                                  }
                                    netblfs=blfs;
                                    totalscore=netblfs+nblfs;
                                    maxbashtotalscore+=totalscore;
                                    maxbash.push({
                                      match_key: match_key,
                                      player_name: rows.playerName,
                                      player_key:rows.playerKey,
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
                                      team_id:String(uplayer.seriesTeamId),
                                      user_team_id:String(uplayer.user_team_id),
                                      row_id: String(uplayer.id),
                                      player_id: uplayer.playerId,
                                      id:String(uplayer.playerId),
                                      playingXi: rows.playingXi,
                                      ballsFaced:rows.ballFaced,
                                      prev_ballsFaced:bf,
                                      totalBallsFaced: tbf,
                                      nblfs: rows.nblfs,
                                      blfs:rows.blfs,
                                      prev_blfs:blfs,
                                      netblfs:netblfs,
                                      score:totalscore,
                                      order:order,
                                      role: String(uplayer.role)
                                    });

                                      client.counter--; 
                                    maxbashnextcallback(client,rows);
                                });
                              }
                            
                              else if(flag==2){
                                totalscore=netblfs+nblfs;
                                if(uplayer.role==1){
                                  totalscore = parseFloat(totalscore*captain_multiplier); 
                                  if(winningTossCaptain==uplayer.players().playerKey){
                                    if(TossCaptainpoints.operation==1){
                                      totalscore=parseFloat(totalscore+TossCaptainpoints.points);
                                    }else{
                                      totalscore=parseFloat(totalscore*TossCaptainpoints.points);
                                    }
                                  }
                                }
                                else if(uplayer.role==2){
                                  totalscore = parseFloat(totalscore*viceCaptain_multiplier); 
                                }

                                if(uplayer.players().type =='AR'){
                                  totalscore = parseFloat(totalscore*allrounder_multiplier); 
                                }
                                //client.score+=totalscore;
                                //maxbashtotalscore+=totalscore;
                                maxbash.push({
                                  match_key: match_key,
                                  player_name: rows.playerName,
                                  player_key:rows.playerKey,
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
                                  team_id:String(uplayer.seriesTeamId),
                                  user_team_id:String(uplayer.user_team_id),
                                  row_id: String(uplayer.id),
                                  player_id: uplayer.playerId,
                                  id:String(uplayer.playerId),
                                  playingXi: rows.playingXi,
                                  ballsFaced:rows.ballFaced,
                                  totalBallsFaced: tbf,
                                  nblfs: rows.nblfs,
                                  blfs:rows.blfs,
                                  netblfs:netblfs,
                                  score:totalscore,
                                  order:order,
                                  role: String(uplayer.role)
                                });

                                client.counter--;  
                                maxbashnextcallback(client,rows);
                              }
                            }

                            function maxbashnextcallback(client,rows){
                              //console.log('MAXBASH 2');
                              counterUserPlayersLength--;
                              //console.log('counter '+client.counter);

                              maxbash.sort(function(a, b) {
                                return parseInt(a.order) - parseInt(b.order);
                              });
                              finalMaxBashRank(client,rows,maxbash);
                              //finalMaxBashScores(client,maxbash,counterUserPlayersLength);
                            }


                          }
                        }


                      });
                    }else{
                      
                      nextcallback();
                    }
                      //  console.log('Max Bash Player Score');
                      //  console.log(maxbash);
                    });

                  }

                  function finalMaxBashRank(client,rows,maxbash){
                    var batting,currentOver;
                    if(matchStatusData==null){
                      batting='';
                      currentOver='';
                    }else{
                      batting = matchStatusData[0].batting_team_key;
                      currentOver= matchStatusData[0].current_over_detail;
                    }
                    if(client.counter==0){
                      CustomQuery.getRank(client.user_id,client.match_contest_id).then((data)=>{
                      

                        // if(rows.battingTeamKey!=''){
                          
                        // }
                        



                        client.score = maxbash.slice(0,11).reduce(function(total, maxbash) {
                          return maxbash.score + total;
                        }, 0);
                        var finalData = {},
                        matchendtime=new Date();
                        matchendtime = matchendtime.getFullYear()+'-'+(matchendtime.getMonth()+1)+'-'+matchendtime.getDate()+' '+matchendtime.getHours()+ ':'+matchendtime.getMinutes()+':'+matchendtime.getSeconds();


                        //var date = matchendtime.toDateString()+' '+matchendtime.toTimeString();
                        //console.log(matchendtime);
                        //console.log('Max Bash Player Score');


                        if(matchStatus!='completed')
                          matchendtime = '';


                        // Final Data
                        finalData = {response:
                          {
                            ssid: client.id,
                            matchStatus:'live',
                            statusOverview: 'statusOverview',
                            batting: batting, 
                            overPlayed: currentOver,
                            innings: crickInnings,
                            totalInningsOver: rows.totalInningsOver,
                            yourScore: client.score,
                            currentPosition: data[0].rank,
                            totalcontests: data[0].total,
                            topTeamScore: data[0].top_team_score,
                            matchendtime:matchendtime,
                            players: maxbash
                          }};

                        app.io.to(client.id).emit('listPlayerPoints',finalData);
                        console.log(finalData);
                        updateUserPoints(client);  
                        
                    });
                  }
                  }

    
                  function getFinalScores(client, match_key, league_id, userplayers){
                    
                    var totalpoints = 0;

                      finalscores.find({
                          where:{matchKey: match_key, leagueId: league_id}
                      },function(err,rows){ 
                          var finalData = {};
                          var players=[]; 
                          var batting='';
                          var currentover='';
                          var playingStatus; 
                          var mStatus='';
                          var totalInningsOver=0;
                          var statusOverview;

                          for(var i=0;i<rows.length;++i){

                            async.each(userplayers, function(uplayer, callback){
                              if(rows[i].playerKey==uplayer.players().playerKey){
                                rows[i].vcaptain = 0;
                                rows[i].captain = 0;
                                
                                // captain
                                if(uplayer.role==1){
                                  rows[i].score = parseFloat(rows[i].score*captain_multiplier); 
                                  rows[i].captain = 1; // For Captain
                                  
                                  if(winningTossCaptain==rows[i].playerKey){
                                    rows[i].score+=TossCaptainpoints;
                                  }
                                  
                                  //rows[i].score+=captainpoints;
                                }
                                // vice captain
                                else if(uplayer.role==2){
                                  rows[i].score = parseFloat(rows[i].score*viceCaptain_multiplier); 
                                  rows[i].vcaptain = 1; // For Vice captain
                                }

                                // all rounder
                                if(uplayer.players().type =='AR'){
                                  rows[i].score = parseFloat(rows[i].score*allrounder_multiplier); 
                                }

                                if(rows[i].playingXi==1){
                                  rows[i].score+=playingXiPoints;
                                }

                                batting = rows[i].battingTeamKey;
                                currentover = rows[i].currentOver;
                                mStatus = rows[i].status;
                                totalInningsOver = rows[i].totalInningsOver;

                                if(rows[i].playingStatus==null)
                                  playingStatus='notout';
                                else
                                  playingStatus=rows[i].playingStatus;

                                totalpoints = totalpoints+rows[i].score;
                                
                                // Final Players data with scores
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
                                    type: uplayer.players().type,
                                    captain: rows[i].captain,
                                    user_team_id:uplayer.user_team_id,
                                    row_id: uplayer.id,
                                    player_id: uplayer.playerId,
                                    id:uplayer.playerId,
                                    score: rows[i].score,
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


                          // Final Data
                          finalData = {response:
                              {
                                ssid: client.id,
                                matchStatus:mStatus,
                                statusOverview: statusOverview,
                                batting: batting, 
                                overPlayed: currentover,
                                innings: crickInnings,
                                totalInningsOver: totalInningsOver,
                                yourScore: totalpoints,
                                players: players
                              }};

                            console.log(finalData);
                            console.log('client id');
                            console.log(client.id); 

                            // Final Data pushed to client
                            app.io.to(client.id).emit('listPlayerPoints',finalData);
                            updateUserPoints(client);
                            //nextcallback();
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

                      

                      // Update Score and Rank

                      function updateUserPoints(client){
                        CustomQuery.updateRank(client.match_contest_id);

                        contestParticipants.updateAll({
                          userId: client.user_id, matchContestId: client.match_contest_id
                        },
                        {
                          teamPoints: client.score
                        },
                        function(err,rows){
                          if(err) throw err;

                          console.log('Points updated');
                          console.log(rows);
                          nextcallback();
                        }
                      )
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
                  
                      // setTimeout(function() {
                      //   next(null, 'success');
                      // }, 5000);

                  }

                ], function(err,obj){
                  console.log(matchStatusOverview);

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