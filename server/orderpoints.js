var app = require('./server');
module.exports = {
    // Function getTotalScore: To get total score
    // @Params:
    // rows: player data
    // role: player role
    // row_total_score: score 
    // scoringPoints: contain multipliers and points with operation add or multiply
    // playerKey
    // playerType: All rounder/ Wicket Keeper / Batsman / Bowler
    // team: teamkey  
 
    getTotalScore:function(rows,role,row_total_score,scoringPoints,playerKey,playerType,team){
        //console.log("row_total_score==>"+row_total_score);
        //console.log(scoringPoints);
        // captain
        if(role==1){
            row_total_score = parseFloat(row_total_score*scoringPoints.multipliers.captain); 
            if(scoringPoints.matchStatus.captain_toss_winner==playerKey){

              if(scoringPoints.TossCaptainpoints.operation==1){
                row_total_score=parseFloat(row_total_score+scoringPoints.TossCaptainpoints.points);

              }else{
                row_total_score=parseFloat(row_total_score*scoringPoints.TossCaptainpoints.points);
              }
            }
        }

        // vice captain
        else if(role==2){
            //console.log(playerKey+"===>"+row_total_score+"*"+scoringPoints.multipliers.viceCaptain+"==>");
            //console.log(row_total_score*scoringPoints.multipliers.viceCaptain);
            row_total_score = parseFloat(row_total_score*scoringPoints.multipliers.viceCaptain); 
        }

        // all rounder
        if(playerType =='AR'){
            row_total_score = parseFloat(row_total_score*scoringPoints.multipliers.allRounder); 
        }

        if(scoringPoints.matchStatus.winner_team!='' && team==scoringPoints.matchStatus.winner_team){
            if(scoringPoints.winningTeamPoints.operation==1){
              row_total_score=parseFloat(row_total_score+scoringPoints.winningTeamPoints.points);
            }else{
              //console.log('Winning team '+scoringPoints.matchStatus.winner_team);
              //console.log(' ');
              //console.log(row_total_score+"*"+scoringPoints.winningTeamPoints.points+'===>'+(row_total_score*scoringPoints.winningTeamPoints.points));
              //console.log(' ');
              row_total_score=parseFloat(row_total_score*scoringPoints.winningTeamPoints.points);
            }
        }
        // Man of match
        if(scoringPoints.matchStatus.manofmatch!='' && playerKey==scoringPoints.matchStatus.manofmatch){
          console.log('Man of Match==> '+row_total_score+'*'+scoringPoints.multipliers.manofmatch);
          row_total_score = parseFloat(row_total_score*scoringPoints.multipliers.manofmatch); 
        }

      
        return row_total_score;
    },

    initialPoints:function(playingXi,score,scoringPoints){
        if(playingXi==1){
            if(scoringPoints.playingXiPoints.operation==1){
              score=parseFloat(score+scoringPoints.playingXiPoints.points);
            }else{
              score=parseFloat(score*scoringPoints.playingXiPoints.points);
            }
          }else{
            if(scoringPoints.nonplayingXiPoints.operation==1){
                score=parseFloat(score+scoringPoints.nonplayingXiPoints.points);
              }else{
                score=parseFloat(score*scoringPoints.nonplayingXiPoints.points);
              }
          }


        return score;  
    },

    // Return Multipliers Score

    removeMultipliers:function(role,row_total_score,scoringPoints,playerKey,playerType,team){
      if(role==1){
        row_total_score = parseFloat(row_total_score/scoringPoints.multipliers.captain); 
        if(scoringPoints.matchStatus.captain_toss_winner==playerKey){

          if(scoringPoints.TossCaptainpoints.operation==1){
            row_total_score=parseFloat(row_total_score-scoringPoints.TossCaptainpoints.points);

          }else{
            row_total_score=parseFloat(row_total_score/scoringPoints.TossCaptainpoints.points);
          }
        }
      }

      // vice captain
      else if(role==2){
          row_total_score = parseFloat(row_total_score/scoringPoints.multipliers.viceCaptain); 
      }

      // all rounder
      if(playerType =='AR'){
          row_total_score = parseFloat(row_total_score/scoringPoints.multipliers.allRounder); 
      }

      // Winning Team

      if(scoringPoints.matchStatus.winner_team!='' && team==scoringPoints.matchStatus.winner_team){
          if(scoringPoints.winningTeamPoints.operation==1){
            row_total_score=parseFloat(row_total_score-scoringPoints.winningTeamPoints.points);
          }else{
            row_total_score=parseFloat(row_total_score/scoringPoints.winningTeamPoints.points);
          }
      }
      // Man of match
      if(scoringPoints.matchStatus.manofmatch!='' && playerKey==scoringPoints.matchStatus.manofmatch){
        row_total_score = parseFloat(row_total_score/scoringPoints.multipliers.manofmatch); 
      }

      return row_total_score;
    },

    // Remove Initial Points

    removeInitialPoints:function(playingXi,score,scoringPoints){
      if(playingXi==1){
          if(scoringPoints.playingXiPoints.operation==1){
            score=parseFloat(score-scoringPoints.playingXiPoints.points);
          }else{
            score=parseFloat(score/scoringPoints.playingXiPoints.points);
          }
        }else{
          if(scoringPoints.nonplayingXiPoints.operation==1){
              score=parseFloat(score-scoringPoints.nonplayingXiPoints.points);
            }else{
              score=parseFloat(score/scoringPoints.nonplayingXiPoints.points);
            }
        }


      return score;  
  },

  getPlayerCredits:function(match_key,match_type,seriesPlayers){
    let stringmatch = match_key.includes("ipl");
    var credits = '';
    if(match_type=='t20'){
      credits = seriesPlayers.creditsT20;
    }else if(match_type=='odi'){
      credits = seriesPlayers.creditsOdi;
    }

    if(stringmatch){
      credits = seriesPlayers.creditsIpl;
    }

    return credits;
  }




}