import { getMatchInfoList } from "./parser";
import { read, write } from "./storage";

export const modeNames = ["クラシック", "かくれんぼ"] as const
export type ModeName = typeof modeNames[number]
export const isModeName = (text: string): text is ModeName => {
	return modeNames.some(name => name === text)
}
export const parseModeName = (text: string): ModeName => {
	if (isModeName(text)) {
		return text
	} else {
		throw new Error(`モード名として受付できない値が入力されています /text:${text}`)
	}
}

export const teamNames = ["クルー", "インポスター"] as const
export type TeamName = typeof teamNames[number]
export const isTeamName = (text: string): text is TeamName => {
	return teamNames.some(name => name === text)
}
export const amongUsMapNames = ["The Skeld", "MIRA HQ", "Polus", "The Airship", "The Fungle"] as const;
export type AmongUsMapName = typeof amongUsMapNames[number]
export const getAmoungUsMapName = (text: string): AmongUsMapName => {
	const mapName = amongUsMapNames.find(name => name.toLowerCase() === text.toLowerCase())
	if (mapName === undefined) {
		throw new Error(`マップとして解釈できない値が入力されています /text:${text}`)
	}
	return mapName
}


export type MovieInfo = {
	contributorName: string,
	urlText: string
}
// ループ回しながら組み立てるしかないので全部Optionalにせざるを得ない
// スプシのカラム名と被せるためにあえて日本語プロパティ名にしている
export type MatchInfo = {
	// ●/●昼という表記もあるのでいったんstringで……
	日付: string,
	試合数: number,
	モード: ModeName,
	マップ: AmongUsMapName,
	勝利: TeamName,
	動画: Array<MovieInfo>,
	概要: string,
	参加者: Array<string>
	インポスター: Array<string>,
}


export const test = (): void => {
	// 深夜のAmongUs会のドキュメントを取得
	const documentId = PropertiesService.getScriptProperties().getProperty("documentId");
	if (documentId === null) { throw new Error(`documentIdを取得できませんでした。GASの「プロジェクトの設定」→「スクリプト プロパティ」を確認してください`) }
	// とりまとめのスプレッドシートを取得
	const spreadsheetId = PropertiesService.getScriptProperties().getProperty("spreadsheetId");
	if (spreadsheetId === null) { throw new Error(`spreadsheetIdを取得できませんでした。GASの「プロジェクトの設定」→「スクリプト プロパティ」を確認してください`) }
	const matchLogTokens = read(documentId)
	const matchInfoList = getMatchInfoList(matchLogTokens)
	write(spreadsheetId, matchInfoList)
}


// GASから参照したい関数はglobalオブジェクトに渡してあげる必要がある
(global as any).test = test;