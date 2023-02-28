type PlayerInfo = {
    nickname: string,
    image: string
};

type PlayerInfoWithId = {
    id: string,
    nickname: string,
    image: string
}

type gameOverData = {
    isWin?: boolean,
    oppResigned?: boolean,
    isDraw?: boolean
}

export { PlayerInfo, PlayerInfoWithId, gameOverData };