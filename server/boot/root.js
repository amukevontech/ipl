'use strict';

module.exports = function(server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router(); 
  //router.get('/', server.loopback.status());

  const CricketAPIServices = require('../../server/services');
  const Batsman_score = server.models.BatsmanScores;
  const matchesPlayers = server.models.MatchesPlayers;
  const playerPoints = server.models.PlayerPoints;
  const matchStats = server.models.MatchStats;
  const cronStartMatch = server.models.CronStartMatch;
  const Matches = server.models.Matches;
  const users = server.models.Users;
  const leagues = server.models.Leagues;
  const async = require('async');
  const request = require('request');
  const jsonexport = require('jsonexport');
  const fs = require('fs');
  const Config = require('../../server/config');
  var nodehost = Config.site_url.nodehost;
  var phphost = Config.site_url.phphost;


  router.get('/matchresponse',function(req, res){
      if(req.query.match_key==null){
        res.json({error:1,msg:'match key is null'});
      }
        var match={};
        CricketAPIServices.getMatchResponse(req.query.match_key).then((data)=>{
          // data.format
          var teamANonPlaying,teamBNonPlaying;

          teamANonPlaying = data.card.teams.a.match.players.filter(function(elem) {
            return data.card.teams.a.match.playing_xi.indexOf(elem) < 0;
          });

          teamBNonPlaying = data.card.teams.b.match.players.filter(function(elem) {
            return data.card.teams.b.match.playing_xi.indexOf(elem) < 0;
          });

          var team_a = {
              key: data.card.teams.a.key, 
              name: data.card.teams.a.name, 
              captain: data.card.teams.a.match.captain,
              keeper: data.card.teams.a.match.keeper,
              playing_xi: data.card.teams.a.match.playing_xi,
              non_playing: teamANonPlaying,
              all_players: data.card.teams.a.match.players
            };
          var team_b = {
            key: data.card.teams.b.key, 
            name: data.card.teams.b.name, 
            captain: data.card.teams.b.match.captain,
            keeper: data.card.teams.b.match.keeper,
            playing_xi: data.card.teams.b.match.playing_xi,
            non_playing: teamBNonPlaying,
            all_players: data.card.teams.b.match.players
          };

          var players = data.card.players;

          match={match_key: data.card.key, match_type: data.card.format, team_a, team_b, players};
          return match;
          
        }).then((data)=>{
          var i=0,cp=0, teamShortName='', teamFullName='', captain='',nonplayers=1;
          async.eachSeries([data.team_a.all_players, data.team_b.all_players],function(player, callback){
            if(i==0){
              teamShortName = data.team_a.key;
              teamFullName = data.team_a.name;
              captain = data.team_a.captain;
            }else{
              teamShortName = data.team_b.key;
              teamFullName = data.team_b.name;
              captain = data.team_b.captain;

            }
            player.map(function(pl, plcallback){
              nonplayers = 1;
              if(i==0){
                if(data.team_a.non_playing.includes(pl)){
                  nonplayers = 0;
                }
              }else{
                if(data.team_b.non_playing.includes(pl)){
                  nonplayers = 0;
                }
              }

              if(pl==captain)
                cp=1;
              else
                cp=0;  
              
              matchesPlayers.findOrCreate({
                  where: {
                    matchKey: data.match_key
                  }},
                  {
                    matchKey: data.match_key,
                    playerKey: pl,
                    playerName: data.players[pl].name,
                    playerFullname: data.players[pl].fullname, 
                    matchType: data.match_type,
                    captain: cp,
                    playingRole: data.players[pl].seasonal_role,
                    team: teamShortName,
                    teamFullname: teamFullName,
                    playingXi: nonplayers
                  },function(err,results){
                    if(err)
                    console.log(err);
                  }
                );
            });

            i++;
            
            callback();
          });
          console.log('Match Players updated..');
          res.json({});
        }).catch(function(err) {
          console.error('Oops we have an error', err);
          res.status(404).json({"error": err});
      });
    
  });
 
  router.get('/isMatchStarted',function(req, res){
    CricketAPIServices.recentMatchesResponse().then((matches)=>{
      async.forEach(matches.cards,function(match, callback){
        if(match.status=='started' && match.format!='test'){
          console.log(match);
          matchStats.findOne({
            where:{matchKey: match.key}
          },function(err,row){
            console.log(row);
            if(row==null){
                matchStats.create(
                  {
                    matchKey: match.key,
                    nonstrikerName: '',
                    strikerKey: '',
                    nonStrikerKey: '',
                    strikerName: '',
                    battingTeamKey: '-',
                    status: 'started',
                    prevOver: '',
                    nextOver: '',
                    innings: 1,
                    matchOvers: 0.0,
                    currentOver: 0.0,
                    overKey: '',
                    toss: '-',
                    captainTossWinner:'',
                    currentOverDetail: '',
                    statusOverview: ''
                  },function(err,results){
                      if(err)
                      throw(err)

                      console.log('inserted MatchStatus');
                  });

            }
            
          });
        }
      });
    });
    
   
    res.json({}); 

  });

  router.get('/recentmatches',function(req, res){
    
    CricketAPIServices.recentMatchesResponse().then((matches)=>{
      async.forEach(matches.cards,function(match, callback){
        
         if(match.status=='started'){
          // if(match.status=='notstarted' && match.key=='iplt20_2018_g18'){
          //   match.key = 'iplt20_2018_g16';
          var moment=require("moment");
          var mo=moment();
          var currentServerTime=parseInt(mo.format('x'))+mo.utcOffset()*1000*60;
          var event = new Date(match.start_date.iso);
          var matchStartDateTime = new Date();
          matchStartDateTime = event.getFullYear()+'/'+(event.getMonth()+1)+'/'+event.getDate()+' '+event.getHours()+':'+event.getMinutes()+':'+event.getSeconds();
          console.log(matchStartDateTime);
          cronStartMatch.count({
              matchKey: match.key
          },function(err, count){
              console.log('count is '+count);
              if(count==0 && match.format!='test'){
                updateMatchData(match.key,match.format);

                function updateMatchData(match_key, match_format){
                  request(
                    {
                      method: 'GET',
                      uri: nodehost+'matchresponse/?match_key='+match_key
                  },function(error, resp, body){
                      console.log('finished');
                      getBattingOrder(match_key,match_format);
                      
                  });
                }


                function getBattingOrder(match_key,match_format){
                  var url;
                  CricketAPIServices.getMatchResponse(match_key).then((data)=>{
                    url=nodehost+'api/cricketapis/ballbyball?match_key='+match_key+'&over='+data.card.batting_order[0][0]+'_1_1&match_type='+match_format;
                    console.log(url);
                    insertMatchStatus(url, match_key,match_format,data);
                  });
                }

                // Need to insert for calculating points for inital stage like toss won etc
                function insertMatchStatus(url, match_key, match_format,data){
                   var winningTossCaptain = data.card.teams[data.card.toss.won].match.captain;
                   var matchovers=data.card.match_overs;
                    matchStats.findOne({
                      where:{matchKey: match_key}
                    },function(err,row){
                      if(row==null){
                          matchStats.create(
                            {
                              matchKey: match_key,
                              nonstrikerName: '',
                              strikerKey: '',
                              nonStrikerKey: '',
                              strikerName: '',
                              battingTeamKey: '-',
                              status: 'started',
                              prevOver: '',
                              nextOver: '',
                              innings: 1,
                              matchOvers: matchovers,
                              currentOver: 1.0,
                              overKey: data.card.batting_order[0][0]+'_1_1',
                              toss: '-',
                              captainTossWinner:winningTossCaptain,
                              currentOverDetail: '',
                              statusOverview: ''
                            },function(err,results){
                                if(err)
                                throw(err)
                              
                                updateCronTable(url, match_key,match_format);

                                console.log('inserted MatchStatus');
                            });
                      }
                        
                      });
                    
                }

                function updateCronTable(url, match_key,match_format){
                  cronStartMatch.create({
                    matchKey: match_key,
                    url: url,
                    startTime: matchStartDateTime,
                    format: match_format
                  },function(err,data){
                    setTimeout(() => {
                      getMatchIdByKey(match_key);
                      startBallbyBall(url);
                    }, 200000);
                  });
                }

                function getMatchIdByKey(match_key){
                  Matches.findOne({
                    where: {matchKey: match_key}
                  },function(err,rows){
                    console.log(rows.id);
                    console.log(rows);
                    console.log('======rows');
                    updateMatchStatus(rows.id);
                  });
                }

                function updateMatchStatus(matchId){
                  console.log('matchId= '+matchId);
                  var status = 2; // status 2 for live
                  request(
                    {
                      method: 'GET',
                      uri: phphost+'crickets/update_match_status/'+matchId+'/'+status
                    },function(error, resp, body){
                        console.log('finished');
                    });
                }

                function startBallbyBall(url){
                  request(
                    {
                      method: 'GET',
                      uri: url
                  },function(error, resp, body){
                  });
                }
                
              }else{
                console.log('Match already started');
              }

          });
          console.log(match);
        }
        
      });
      
    });
    res.json({}); 
  });


  router.get('/liveMatches',function(req, res){
    var datetime= new Date();
    var next_over;
    
    function activateMatch(match_key,url){
      Matches.findOne({
        where: {matchKey: match_key}
      },function(err,rows){

       request(
        {
          method: 'GET',
          uri: url+'&match_type='+(rows.matchType).toLowerCase()
        },function(error, resp, body){
            console.log('finished');
        });
        console.log(url+'&match_type='+(rows.matchType).toLowerCase());
      });
    }


    matchStats.find({
      where: {status: 'started'}
    },function(err,rows){
      for(var i=0;i<rows.length;i++){
        var matchtime=new Date(rows[i].created);
        var today = new Date();
        //matchtime.setMinutes(matchtime.getMinutes() - 30);
        //matchtime.setHours(matchtime.getHours() - 5);

        var diffMs = (today - matchtime); // milliseconds 
        var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
        
        console.log("Difference since last hit:"+diffMins);
        // If last hit was 4 min before then activate the match
        if(diffMins>4){
          console.log(rows[i].matchKey);
          if(rows[i].nextOver==null){
            next_over=rows[i].overKey;
          }else{
            next_over=rows[i].nextOver;
          }
          var url=nodehost+'api/cricketapis/ballbyball?match_key='+rows[i].matchKey+'&over='+next_over;
          activateMatch(rows[i].matchKey,url);
        }
      }
      res.json({rows});
    });

  });

  // Cronjob: Match Winners API

  router.get('/matchWinners',function(req, res){
    
    function declareWinner(match_key,url){
      Matches.findOne({
        where: {matchKey: match_key}
      },function(err,rows){
        console.log(url+(rows.id));
       request(
        {
          method: 'GET',
          uri: url+(rows.id)
        },function(error, resp, body){

          matchStats.updateAll({
            matchKey: match_key
          },
          {
            winnerDeclaration:1
          },function(err,result){

          });

            console.log('hit declareWinner API');
        });

        var requestrankOptions = {
          url: nodehost+'api/ContestParticipants/updateRank?match_id='+rows.id,
          method: 'GET'
        }
        request(requestrankOptions,function(error, resp, body){
          
          var updateScoresOptions = {
            url: nodehost+'api/MatchContests/matchresults?match_id='+rows.id,
            method: 'GET'
          }
          request(updateScoresOptions,function(error, resp, body){
            console.log('Updated Scores');
          });

        });

      });
    }


    matchStats.find({
      where: {status: 'completed',winnerDeclaration:0}
    },function(err,rows){
      for(var i=0;i<rows.length;i++){
        var matchtime=new Date(rows[i].matchEndTime);
        var today = new Date();
        var diffMs = (today - matchtime); // milliseconds 
        var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
        console.log("Match ended since last "+diffMins+" minutes");

        // If 30 minutes are passed since match end time then declare winners by sending request to API

        if(diffMins>=30){
          var url=phphost+'crickets/match_winners/';
          declareWinner(rows[i].matchKey,url);
        }

      }
      if(rows.length==0){
        console.log('Match not ended yet..');
      }


    });
    res.json({});
  });

  server.use(router);
};