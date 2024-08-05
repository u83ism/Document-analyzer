import { getMatchInfoList } from "./parser";
import { read, write } from "./storage";

export type Team = "クルー" | "インポスター"
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
	モード: string,
	マップ: string,
	勝利: Team,
	動画: ReadonlyArray<MovieInfo>,
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