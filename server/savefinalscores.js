const app = require('./server');
const async = require('async');
const CustomQuery = require('../server/customQueries');
const finalScores = require('../server/finalscores');
const CricketAPIServices = require('../server/services');
const CalculatePlayerPoints = require('../server/calculateplayerpoints');
const getpoints = require('../server/getPoints');

var winningTossCaptain,TossCaptainpoints={},playingXiPoints={},winningTeamPoints={},
scoringPoints={playingXiPoints:{},nonplayingXiPoints:{},TossCaptainpoints:{},winningTeamPoints:{}},
ranks={currentPosition: 0, totalcontests: 0, topTeamScore: 0},
multipliers={captain:0,viceCaptain:0,allRounder:0};

class savefinalscores {
    constructor() {
    }
    saveMaxBash(finalData){
        return new Promise((resolve, reject) => {
            var players = finalData.response.players;
            const userTeamPlayers = app.models.UserTeamPlayers;
            for(let i=0;i<players.length;i++){
                userTeamPlayers.updateAll({
                    userTeamId: players[i].user_team_id, playerId: players[i].id
                },
                {
                    ballFaced: players[i].ballsFaced,
                    nblfs: players[i].nblfs,
                    blfs: players[i].blfs,
                    netblfs: players[i].netblfs,
                    score: players[i].score
                });
            }
            resolve('success');
        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
    }

    // Save Max Boundary, Max Score Data and Fast Score Data
    saveScores(finalData){
        return new Promise((resolve, reject) => {
            var players = finalData.response.players;
            const userTeamPlayers = app.models.UserTeamPlayers;
            console.log('saveScores==>');

            for(let i=0;i<players.length;i++){
                userTeamPlayers.updateAll({
                    userTeamId: players[i].user_team_id, playerId: players[i].id
                },
                {
                    ballFaced: 0,
                    nblfs: 0,
                    blfs: 0,
                    netblfs: 0,
                    score: players[i].score
                });
            }
            resolve('success');
        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
    }

    // Fast Score Data
    saveFastScores(finalData){
        return new Promise((resolve, reject) => {
            var players = finalData.response.players;
            const userTeamPlayers = app.models.UserTeamPlayers;
            console.log('saveFastScores==>');

            for(let i=0;i<players.length;i++){
                userTeamPlayers.updateAll({
                    userTeamId: players[i].user_team_id, playerId: players[i].id
                },
                {
                    ballFaced: players[i].ballsFaced,
                    nblfs: 0,
                    blfs: 0,
                    netblfs: 0,
                    score: players[i].score
                });
            }
            resolve('success');
        }).catch(function(err) {
            console.error('Oops we have an error', err);
            reject(err);
        });
    }

}

module.exports = new savefinalscores();