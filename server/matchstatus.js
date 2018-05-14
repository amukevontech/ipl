var app = require('./server');


const CricketAPIServices = require('../server/services');
var currentOver, strikerkey, nonstrikerkey, strikername, nonstrikername, batting_team, battingteamkey, tosswon, innings, matchovers, teamwonkey, decision, manOfMatch,
finalData = {matchStatus:'',currentOver:'',strikerkey:'',nonstrikerkey:'',strikername:'',nonstrikername:'',batting_team:'',battingteamkey:'',tosswon:'',innings:'',matchovers:'',teamwonkey:'',decision:'',manOfMatch:'',matchendtime:'',matchStatusOverview:'',winningTossCaptain:'',crickInnings:'',winnerTeam:'',currentbattingteam:'',firstinningteam:'',secondinningteam:''};


class matchStatus {
    constructor() {
        
    }

    // Get the Current Match Status

    getMatchStatusData(match_key,battingTeam){

        return new Promise((resolve, reject) => {
            
            CricketAPIServices.getMatchResponse(match_key).then((data)=>{
                finalData.crickInnings=1;
                if(data.card.batting_order.length>0){
                    finalData.firstinningteam = data.card.teams[data.card.batting_order[0][0]].key;
                    if(data.card.batting_order.length>1){
                        finalData.secondinningteam = data.card.teams[data.card.batting_order[1][0]].key;
                    }
                }

                if(data.card.status===null)
                    finalData.matchStatus ='none';
                      else
                    finalData.matchStatus = data.card.status;

                if(finalData.matchStatus=='completed'){
                    let matchendtime = new Date();
                    finalData.matchendtime = matchendtime.getFullYear()+'-'+(matchendtime.getMonth()+1)+'-'+matchendtime.getDate()+' '+matchendtime.getHours()+ ':'+matchendtime.getMinutes()+':'+matchendtime.getSeconds();
                }else{
                    finalData.matchendtime=null;
                }

                if(data.card.man_of_match===null)
                    finalData.manOfMatch='';
                else
                    finalData.manOfMatch=data.card.man_of_match;

                if(data.card.status_overview===null)
                    finalData.matchStatusOverview ='none';
                else
                    finalData.matchStatusOverview = data.card.status_overview;
                      

                if(data.card.match_overs===null)
                    finalData.matchovers=0;
                else
                    finalData.matchovers=data.card.match_overs;

                if(data.card.now.striker===null)
                    finalData.strikerkey='none';
                else
                    finalData.strikerkey = data.card.now.striker;
                
                if(data.card.now.nonstriker===null)
                    finalData.nonstrikerkey='none';
                else
                    finalData.nonstrikerkey = data.card.now.nonstriker;

                if(typeof data.card.players[finalData.strikerkey]!='undefined'){
                if(data.card.players[finalData.strikerkey].name===null)
                    finalData.strikername='none';
                else
                    finalData.strikername = data.card.players[finalData.strikerkey].name;
                }

                if(typeof data.card.players[finalData.nonstrikerkey]!='undefined'){
                if(data.card.players[finalData.nonstrikerkey].name===null)
                    finalData.nonstrikername='none';
                else
                    finalData.nonstrikername = data.card.players[finalData.nonstrikerkey].name;
                }

                if(data.card.now.batting_team===null)
                    finalData.batting_team='a';
                else
                    finalData.batting_team = data.card.now.batting_team;

                if(data.card.teams[finalData.batting_team].key===null)
                    finalData.battingteamkey='none';
                else
                    finalData.battingteamkey = data.card.teams[finalData.batting_team].key;

                if(data.card.toss.won===null){
                    finalData.tosswon='none';
                }
                else{
                    finalData.decision = data.card.toss.decision;
                if(data.card.toss.won=='a'){
                    finalData.tosswon=data.card.teams.a.key;
                    finalData.teamwonkey='a';
                }
                else if(data.card.toss.won=='b'){
                    finalData.tosswon=data.card.teams.b.key;
                    finalData.teamwonkey='b';
                }
                else{
                    finalData.tosswon='not announced';
                    finalData.teamwonkey='';
                }
                }

                // Get Winning Toss Captain

                if(teamwonkey!=''){
                    finalData.winningTossCaptain=data.card.teams[finalData.teamwonkey].match.captain;
                }

                // Calculate Innings
                console.log(finalData.teamwonkey);
                console.log(finalData.decision);
                    

                // in 1st inning b is batting, in 2nd inning a is batting
                if((finalData.teamwonkey=='a' && finalData.decision=='bowl') || (finalData.teamwonkey=='b' && finalData.decision=='bat')){
                    console.log('in 1st inning b is batting, in 2nd inning a is batting');
                    console.log(battingTeam);
                if(battingTeam=='a'){
                    finalData.crickInnings=2;
                }
                    console.log('crickInnings '+finalData.crickInnings);
                }
                // in 1st inning a is batting, in 2nd inning b is batting
                else if((finalData.teamwonkey=='a' && finalData.decision=='bat') || (finalData.teamwonkey=='b' && finalData.decision=='bowl')){
                    console.log('in 1st inning a is batting, in 2nd inning b is batting');
                    console.log(battingTeam);
                if(battingTeam=='b'){
                    finalData.crickInnings=2;
                }
                    console.log('crickInnings '+finalData.crickInnings);
                }

                if(data.card.winner_team==null){
                    finalData.winnerTeam='';
                }
                else{
                if(matchStatus=='completed'){
                    finalData.winnerTeam=data.card.teams[data.card.winner_team].key;
                }
                }
                
                if(data.card.teams[battingTeam]==null){
                    finalData.currentbattingteam = '';
                }else{
                    finalData.currentbattingteam = data.card.teams[battingTeam].key;
                }
                


                if(data.card.now.innings===null)
                    finalData.innings=1;
                else
                    finalData.innings=data.card.now.innings;

                console.log('Innings ==>'+finalData.innings);

                if(data.card.innings[(finalData.batting_team+ '_'+data.card.now.innings)].overs===null)  
                    finalData.currentOver = '0.0';
                else
                    finalData.currentOver = data.card.innings[(finalData.batting_team+ '_'+data.card.now.innings)].overs;


                resolve(finalData);

            });



        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
        
    }


}


module.exports = new matchStatus();