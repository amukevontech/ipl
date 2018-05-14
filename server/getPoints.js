var app = require('./server');
var async= require("async");
const CalculatePlayerPoints = require('../server/calculateplayerpoints');
const CustomQuery = require('../server/customQueries');
var scoringPoints={playingXiPoints:{},nonplayingXiPoints:{},TossCaptainpoints:{},winningTeamPoints:{},multipliers:{},ballLimit:0}

class getPoints {
    constructor() {
        
    }

    points(match_key,leagueId,match_type){

        return new Promise((resolve, reject) => {

            async.waterfall([
                function(next){
                    CalculatePlayerPoints.getPoints(match_key, leagueId, match_type,'all','tw').then((data)=>{
                        scoringPoints.TossCaptainpoints={
                        points: data.points,
                        operation: data.operation 
                      };
                      next(null,leagueId);
                    });
                },
                function(leagueId, next){
                    CalculatePlayerPoints.getPoints(match_key, leagueId, match_type,'all','starting11').then((data)=>{
                      scoringPoints.playingXiPoints={
                        points: data.points,
                        operation: data.operation 
                      };
                      next(null,leagueId);
                    });
                  },
                  function(leagueId,next){
                    CalculatePlayerPoints.getPoints(match_key, leagueId, match_type,'all','not11').then((data)=>{
                      scoringPoints.nonplayingXiPoints={
                          points: data.points,
                          operation: data.operation 
                        };
                      next(null,leagueId);
                    });
                  },
                  function(leagueId,next){
                    CalculatePlayerPoints.getPoints(match_key, leagueId, match_type,'all','wtp').then((data)=>{
                        scoringPoints.winningTeamPoints={
                        points:data.points,
                        operation: data.operation
                      };
                      next(null,leagueId);
                    });
                  },

                  // Get Ball Limit
                  function(leagueId,next){
                    const Configs = app.models.Configs;
                    Configs.findOne({
                      where:{code:'ball_limit',type: match_type}
                    },function(err,row){
                      scoringPoints.ballLimit=row.value;
                      next(null,leagueId);
                    });
                  },
    
                  //multipliers
                function(leagueId,next){
                CustomQuery.getMultipliers( leagueId, match_type,'multipliers').then((data)=>{
                    scoringPoints.multipliers={captain:data.captain,viceCaptain:data.vcaptain,allRounder:data.allrounder,manofmatch:data.manofmatch};
                  resolve(scoringPoints);
                });
              }
    
            ]);



        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
        
    }


}


module.exports = new getPoints();