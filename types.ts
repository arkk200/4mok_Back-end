type PlayerInfo = {
    nickname: string,
    imgBase64: string
};

type PlayerInfoWithId = {
    id: string,
    nickname: string,
    imgBase64: string
}

type gameOverData = {
    isWin?: boolean,
    oppResigned?: boolean,
    isDraw?: boolean
}

export { PlayerInfo, PlayerInfoWithId, gameOverData };