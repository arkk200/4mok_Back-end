import { Socket } from "socket.io";
import { PlayerInfo, PlayerInfoWithId } from "./types";

const http = require("http");
const SocketIO = require('socket.io');
const express = require("express");

const app = express();

const server = http.createServer(app);
const io = SocketIO(server);

let onlinePlayersInfo: PlayerInfoWithId[] = [];
let hostPlayersInfo: { [code: string]: PlayerInfoWithId } = {};


io.on('connection', (socket: Socket) => {

    function getSocketFromId(id: string) {
        return io.sockets.sockets.get(id);
    }
    
    function playerFound(p1Info: PlayerInfoWithId, p2Info: PlayerInfoWithId, callback: () => void) {
        const roomId = `${p1Info.id}${p2Info.id}`;
        const player1 = getSocketFromId(p1Info.id);
        const player2 = getSocketFromId(p2Info.id);
        player1.join(roomId);
        player2.join(roomId);
    
        callback();
    
        const firstOrder = Math.floor(Math.random() * 2) > 1 ? player1.id : player2.id;
    
        io.to(roomId).emit('found', {
            roomId,
            firstOrder,
            playersInfo: [p1Info, p2Info],
        });
    }

    console.log(`${socket.id} connected`);

    // 온라인으로 게임 참가할 때 주고받는 소켓
    function onlineCancel() {
        onlinePlayersInfo = onlinePlayersInfo.filter(info => info.id !== socket.id);
    }

    socket.on('online', (info: PlayerInfo) => {
        socket.on('disconnect', onlineCancel);

        onlinePlayersInfo.push({
            id: socket.id,
            nickname: info.nickname,
            imgBase64: info.imgBase64
        });

        if (onlinePlayersInfo.length >= 2) {
            playerFound(
                onlinePlayersInfo[0],
                onlinePlayersInfo[1],
                () => { onlinePlayersInfo.splice(0, 2); }
            );
        }
    });
    socket.on('onlineCancel', onlineCancel);



    // 호스트로 게임 참가할 때 주고받는 소켓
    function hostCancel(code: string) {
        console.log("hostCancel");
        delete hostPlayersInfo[code];
    }

    socket.on('host', (info: PlayerInfo) => {        
        let code = `${Math.floor(Math.random() * 10000)}`.padStart(4, '0');
        while (hostPlayersInfo.hasOwnProperty(code)) {
            code = `${Math.floor(Math.random() * 10000)}`.padStart(4, '0');
        }
        hostPlayersInfo[code] = ({
            id: socket.id,
            nickname: info.nickname,
            imgBase64: info.imgBase64
        });
        socket.on('disconnect', () => hostCancel(code));
        socket.emit('code', code);
    });
    socket.on('hostCancel', ({code}) => hostCancel(code));

    socket.on('join', ({ playerInfo: info, code }) => {
        if (hostPlayersInfo.hasOwnProperty(code)) {
            playerFound(
                { ...info, id: socket.id },
                hostPlayersInfo[code],
                () => { delete hostPlayersInfo[code]; }
            );
        } else {
            socket.emit('notFound');
        }
    })

    // 게임 중
    socket.on('setMok', ({ x, y, roomId }) => {
        io.to(roomId).emit("setMok", { x, y });
    });
    socket.on('placeMok', ({ x, y, order, playersId, roomId }) => {
        order = playersId.filter((id: string) => id !== order)[0];
        io.to(roomId).emit("placeMok", { x, y, order });
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