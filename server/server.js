'use strict';
// var compression = require('compression');
var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();
var bodyParser = require('body-parser');
var async= require("async");
const request = require('request');
const CustomQuery = require('./customQueries');
const CalculatePlayerPoints = require('./calculateplayerpoints');
const finalScores = require('./finalscores');
var CalculateMultipliers = require('./orderpoints');
const getpoints = require('./getPoints');
const listplayerPoints = require('./listplayerpoints');

app.use(bodyParser.urlencoded({  // to support URL-encoded bodies
  extended: true
}));




app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module) {
    //app.start();
    app.io = require('socket.io')(app.start());

    app.io.sockets.setMaxListeners(0);

    var clients=[];
    app.io.on('connection', function(socket){

    socket.on('switchPlayers',function(data){
      console.log("switchPlayers Data called ");
      console.log(data);
        
        const Userteams = app.models.UserTeams;
        const Matches = app.models.Matches;
        var mStatus;
        var matchInnings;
        var ballLimit;
        var multipliers={};
        var matchStatusData;
        var league_id;
        var scoringPoints={playingXiPoints:{},nonplayingXiPoints:{},TossCaptainpoints:{},winningTeamPoints:{},multipliers:{}},
        TossCaptainpoints={},playingXiPoints={},winningTeamPoints={};
        var playingStatus,winningTossCaptain,winningTeam;
        Userteams.find({
            include: ['users','matches','matchContests','userTeamPlayers'],
            where:{userId: data.user_id, matchId: data.match_id, matchContestId: data.match_contest_id}
          },function(err,rows){
            for(var i = 0; i<rows.length;++i){
                league_id = rows[i].matchContests().leagueId;
            }
            getMatch(data.user_id, data.match_id, league_id, data.match_contest_id);
  
          });
  
        function getMatch(user_id, match_id, league_id, match_contest_id){
          
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
                getpoints.points(match_key, league_id, data.match_type).then((Points)=>{
                  scoringPoints = Points;
                  getmatchstatus(user_id, match_id, league_id, match_contest_id, match_key, rows.userTeamPlayers()); 
                });
              }
          });
        }

        function getmatchstatus(user_id, match_id, league_id, match_contest_id, match_key, userplayers){
          CustomQuery.matchStatus(match_key).then((matchStatus)=>{
            matchStatusData = matchStatus;
            scoringPoints.matchStatus=matchStatusData[0];
            maxbashScores(user_id, match_id, league_id, match_contest_id, match_key, userplayers);
        });
        }
        

        function maxbashScores(user_id, match_id, league_id, match_contest_id, match_key, userplayers){
          var maxbashscores = app.models.Maxbashscores;
          var totalBallFaced=0,flag=0,maxbash=[];
          var counterUserPlayersLength =  userplayers.length;
          var prev_ballsFaced;
          var prev_playerKey;
          const Batsman_score = app.models.BatsmanScores;
  
          CustomQuery.maxBashData(match_key).then((rows)=>{
            
            userplayers.sort(function(a, b) {
              return parseInt(a.order) - parseInt(b.order);
            });
            console.log('Switching ');
            var swap = userplayers[data.swap_x];
            userplayers[data.swap_x] = userplayers[data.swap_y];
            userplayers[data.swap_y] = swap;
  
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
  
  
            var checksum=0;
            var row_total_score;
            var array_index;
            var ballLimitRow=[];
            
            async.each(userplayers, function(uplayer, callback){
              for(var i=0;i<rows.length;i++){
                if(rows[i].playerKey==uplayer.players().playerKey){
                  rows[i].vcaptain = 0;
                  rows[i].captain = 0;
  
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

                  rows[i].nblfs = CalculateMultipliers.initialPoints(rows[i].playingXi,rows[i].nblfs,scoringPoints);

                  rows[i].nblfs = CalculateMultipliers.getTotalScore(rows[i],uplayer.role,rows[i].nblfs,scoringPoints,uplayer.players().playerKey,uplayer.players().type,rows[i].team);
                  rows[i].blfs = CalculateMultipliers.getTotalScore(rows[i],uplayer.role,rows[i].blfs,scoringPoints,uplayer.players().playerKey,uplayer.players().type,rows[i].team);


                  totalBallFaced=parseFloat(totalBallFaced+rows[i].ballFaced);
  
                  // Start
                  checksum=parseFloat(totalBallFaced-scoringPoints.ballLimit);
                  if(checksum<0 || checksum==0){
                    net_blfs=rows[i].blfs;
                    row_total_score=parseFloat(net_blfs+rows[i].nblfs);
                  }
                
                  
                  if(checksum>0){
                     if(flag==0){
                      prev_ballsFaced=parseFloat(rows[i].ballFaced-(totalBallFaced-scoringPoints.ballLimit));
                      row_total_score=parseFloat(net_blfs+rows[i].nblfs);
                      prev_playerKey=rows[i].playerKey;
                      flag=1;
                      
                      
                      array_index=maxbash.length;
                      ballLimitRow.push(rows[i]);
  
                     }else{
                      row_total_score=rows[i].nblfs;
                     }
                     //tbf=limit;
                  }
                  
                  
                  if(rows[i].playingStatus==null)
                        playingStatus='notout';
                    else
                        playingStatus=rows[i].playingStatus;


                  if(scoringPoints.matchStatus==null){
                    winningTeam='';
                    winningTossCaptain='';
                  }else{
                        winningTossCaptain=scoringPoints.matchStatus.captain_toss_winner;
                        winningTeam=scoringPoints.matchStatus.winner_team;
                  }


                  maxbash.push({
                    match_key: match_key,
                    player_key:rows[i].playerKey,
                    playing_status: playingStatus,
                    striker_key: rows[i].strikerKey,
                    nonstriker_key: rows[i].nonStrikerKey,
                    striker_name: rows[i].strikerName,
                    nonstriker_name: rows[i].nonstrikerName,
                    team_name: rows[i].team,
                    team_fullname: rows[i].teamFullname,
                    type: uplayer.players().type,
                    role: String(uplayer.role),
                    captain: rows[i].captain,
                    vcaptain: rows[i].vcaptain,
                    playingXi: rows[i].playingXi,
                    ballsFaced:rows[i].ballFaced,
                    prev_ballsFaced:prev_ballsFaced,
                    totalBallsFaced: totalBallFaced,
                    nblfs: rows[i].nblfs,
                    blfs:rows[i].blfs,
                    netblfs:net_blfs,
                    totalscore:row_total_score,
                    order:uplayer.order});
                   
                  // End
  
                }
              }
            });
            
            if(flag==1){
              console.log('matchKey:'+ match_key+','+'playerKey:'+prev_playerKey+','+'ballFaced:'+ prev_ballsFaced);
              Batsman_score.findOne({
                where: {matchKey: match_key,playerKey:prev_playerKey,ballFaced: prev_ballsFaced}
              },function(err,row){

                if(row!=null){
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

                  maxbash[array_index].totalscore=maxbash[array_index].netblfs+maxbash[array_index].nblfs;

                }

                let expectedPoints= maxbash.slice(0,11).reduce(function(total, maxbash) {
                    return maxbash.totalscore + total;
                }, 0);
                console.log(expectedPoints);
                app.io.to(data.sid).emit('switchPlayers',expectedPoints);
                  
              });
            }else{
               let totalTeamPoints= maxbash.slice(0,11).reduce(function(total, maxbash) {
                    return maxbash.totalscore + total;
                }, 0);
                console.log('==>'+totalTeamPoints);
              app.io.to(data.sid).emit('switchPlayers',totalTeamPoints);
            }
          });
  
        }
      
    });  

    socket.on('userRoom',function(data){
      console.log('userRoom hit here==>');
      console.log(data);
      console.log(socket);

        listplayerPoints.playerPoints(data.user_id, data.match_id, data.match_key, data.match_type, data.match_contest_id, data.league_code).then((finalData)=>{
          console.log('playerPoints hit from UserRoom');
          app.io.to('user_id_'+data.user_id+'match_contest_id_'+data.match_contest_id).emit('listPlayerPoints',finalData);
        });



    });

    
    console.log('user connected '+socket.id);

    socket.on('disconnect', function(){
     
    });
    });
  }
});
