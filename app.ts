import { Socket } from "socket.io";
import { onlinePlayerInfo, onlinePlayerInfoWithId } from "./types";

const http = require("http");
const SocketIO = require('socket.io');
const express = require("express");

const app = express();

const server = http.createServer(app);
const io = SocketIO(server);

let onlinePlayersInfo: onlinePlayerInfoWithId[] = [];

function getSocketFromId(id: string) {
    return io.sockets.sockets.get(id);
}

io.on('connection', (socket: Socket) => {
    console.log(`${socket.id} connected`);

    // 온라인으로 게임 참가할 때 주고받는 소켓
    socket.on('online', (info: onlinePlayerInfo) => {
        console.log(info);
        socket.on('disconnect', () => {

        })

        onlinePlayersInfo.push({
            id: socket.id,
            nickname: info.nickname,
            imgBase64: info.imgBase64
        });

        if(onlinePlayersInfo.length >= 2) {
            const roomId = `${onlinePlayersInfo[0].id}${onlinePlayersInfo[1].id}`;
            const player1 = getSocketFromId(onlinePlayersInfo[0].id);
            const player2 = getSocketFromId(onlinePlayersInfo[1].id);
            player1.join(roomId);
            player2.join(roomId);

            onlinePlayersInfo.splice(0, 2);

            const firstOrder = Math.floor(Math.random() * 2) > 1 ? player1.id : player2.id;

            io.to(roomId).emit('found', {
                roomId,
                firstOrder,
                playersId: [player1.id, player2.id],
            });
        }
    });
    socket.on('onlineCancel', () => {
        onlinePlayersInfo = onlinePlayersInfo.filter(
            onlineInfo => onlineInfo.id !== socket.id
        );
    });

    // 게임 중
    socket.on('setMok', ({ x, y, roomId }) => {
        io.to(roomId).emit("setMok", {x, y});
    });
    socket.on('placeMok', ({ x, y, order, playersId, roomId }) => {
        order = playersId.filter((id: string) => id !== order)[0];
        io.to(roomId).emit("placeMok", {x, y, order});
    });
    socket.on('resign', ({ playerId, playersId, roomId }) => {
        console.log('Someone resigned', playersId);
        const loser = getSocketFromId(playerId);
        const winner = getSocketFromId(playersId.filter((id: string) => id !== playerId)[0]);
        loser.emit('gameOver', { isWin: false });
        winner.emit('gameOver', { oppResigned: true });
        loser.leave(roomId);
        winner.leave(roomId);
    });

    socket.on('timeOut', ({ playerId, playersId, roomId }) => {
        console.log('time out', playersId);
        const loser = getSocketFromId(playerId);
        const winner = getSocketFromId(playersId.filter((id: string) => id !== playerId)[0]);
        loser.emit('gameOver', { isWin: false });
        winner.emit('gameOver', { isWin: true });
        loser.leave(roomId);
        winner.leave(roomId);
    });
});

server.listen(8080, () => {
    console.log(`Listening on http://localhost:8080`);
});