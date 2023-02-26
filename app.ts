import { Socket } from "socket.io";
import { gameOverData, PlayerInfo, PlayerInfoWithId } from "./types";

const http = require("http");
const SocketIO = require('socket.io');
const express = require("express");

const app = express();

const server = http.createServer(app);
const io = SocketIO(server);

let onlinePlayersInfo: PlayerInfoWithId[] = [];
let hostPlayersInfo: { [code: string]: PlayerInfoWithId } = {};


io.on('connection', (socket: Socket) => {
    console.log(`${socket.id} connected`);

    function getSocketFromId(id: string) {
        return io.sockets.sockets.get(id);
    }

    function emitGameOver(player1Id: string, player2Id: string, player1Data: gameOverData, player2Data: gameOverData, roomId: string) {
        const player1 = getSocketFromId(player1Id);
        const player2 = getSocketFromId(player2Id);
        player1?.emit('gameOver', player1Data);
        player2?.emit('gameOver', player2Data);
        player1?.leave(roomId);
        player2?.leave(roomId);
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

        socket.on('disconnect', () => {
            if (socket.id === player1.id) {
                emitGameOver(player1.id, player2.id, { isWin: false }, { oppResigned: true }, roomId);
            } else {
                emitGameOver(player1.id, player2.id, { oppResigned: true }, { isWin: false }, roomId);
            }
        })
    }


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
            console.log("Founded");
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
    socket.on('hostCancel', ({ code }) => hostCancel(code));

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
    socket.on('setMok', ({ y, roomId }) => {
        io.to(roomId).emit("setMok", { y });
    });

    async function checkIsWin(x: number, y: number, board: string[][]) {
        let c = x, r = y, cnt: number = 0;


        // 세로 방향
        // if (c < 3) return false;
        while (c >= 0 && board[r][c--] === socket.id)
            if (++cnt === 4) {
                return true;
            }
        cnt = 0;
        c = x;

        // 가로 방향
        while (r > 0 && board[--r][c] === socket.id);

        // if (r > 3) return false;
        while (r <= 6 && board[r++][c] === socket.id)
            if (++cnt === 4) {
                return true;
            }
        cnt = 0;
        r = y;

        // 대각선 방향
        // 좌하단에서 우상단
        while (c > 0 && r > 0 && board[--r][--c] == socket.id);

        while (c <= 5 && r <= 6 && board[r++][c++] == socket.id)
            if (++cnt === 4) {
                return true;
            }
        cnt = 0;
        c = x; r = y;

        // 우하단에서 좌상단
        while (c > 0 && r < 6 && board[++r][--c] == socket.id);

        while (c <= 5 && r >= 0 && board[r--][c++] == socket.id)
            if (++cnt === 4) {
                return true;
            }

        return false;
    }

    let cnt = 0;

    socket.on('placeMok', async ({ y, order, playersId, roomId, board }) => {
        board[y].push(order);
        const isWin: boolean = await checkIsWin(board[y].length - 1, y, board);
        const nextOrder = playersId.filter((id: string) => id !== order)[0];
        io.to(roomId).emit("placeMok", { order: nextOrder, board });
        if (isWin) {
            setTimeout(() => {
                emitGameOver(order, playersId.filter((id: string) => id !== order)[0], { isWin: true }, { isWin: false }, roomId);
            }, (6 - board[y].length) * 100);
        } else if (board.every((column: string[]) => column.length == 6)) {
            emitGameOver(order, playersId.filter((id: string) => id !== order)[0], { isDraw: true }, { isDraw: true }, roomId);
        }
    });
    socket.on('resign', ({ playerId, playersId, roomId }) => {
        emitGameOver(playerId, playersId.filter((id: string) => id !== playerId)[0], { isWin: false }, { oppResigned: true }, roomId);
    });
    socket.on('timeOut', ({ playerId, playersId, roomId }) => {
        emitGameOver(playerId, playersId.filter((id: string) => id !== playerId)[0], { isWin: false }, { isWin: true }, roomId);
    });
});

server.listen(8080, () => {
});