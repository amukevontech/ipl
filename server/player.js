var app = require('./server');
module.exports = {
    
    player:function(data){
       let players={};
       players={
        match_key: data.match_key,
        player_name: data.playerName,
        player_key:data.playerKey,
        playing_status: data.playingStatus,
        striker_key: data.strikerKey,
        nonstriker_key: data.nonStrikerKey,
        striker_name: data.strikerName,
        nonstriker_name: data.nonstrikerName,
        team_name: data.team,
        team_fullname: data.teamFullname,
        type: data.type,
        captain: data.captain,
        vcaptain: data.vcaptain,
        team_id:String(data.seriesTeamId),
        user_team_id:String(data.user_team_id),
        row_id: String(data.id),
        player_id: data.playerId,
        id:String(data.playerId),
        playingXi: data.playingXi,
        ballsFaced:data.ballFaced,
        totalBallsFaced: data.tbf,
        nblfs: data.nblfs,
        blfs:data.rows_blfs,
        netblfs:data.netblfs,
        score:data.totalscore,
        order:data.order,
        role: String(data.role)
       };
       return player;
    }

}