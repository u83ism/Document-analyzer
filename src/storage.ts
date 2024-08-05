import markdownit, { type Token } from "markdown-it";
import { MatchInfo } from "./main";

export const read = (documentId: string): Array<Token> => {
	const documentUrlText = `https://docs.google.com/feeds/download/documents/export/Export?exportFormat=markdown&id=${documentId}`;
	const response = UrlFetchApp.fetch(documentUrlText, {
		headers: { authorization: "Bearer " + ScriptApp.getOAuthToken() },
	});
	const mdText = response.getContentText();
	const mdi = markdownit()
	const tokens = mdi.parse(mdText, {})

	// 「試合ログ」の次段落を探す
	const matchLogStartIndex = tokens.findIndex(mdInfo => mdInfo.content.includes("試合ログ")) + 1
	// 「（テンプレート）」を探す
	const matchLogEndIndex = tokens.findIndex(mdInfo => mdInfo.content.includes("（テンプレート）")) + 1
	const matchLogTokens = tokens.slice(matchLogStartIndex, matchLogEndIndex)

	return matchLogTokens
}

export const write = (spreadsheetId: string, matchInfoList: ReadonlyArray<MatchInfo>): void => {
	const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
	const targetSheetName = "試合ログ"
	const sheet = spreadsheet.getSheetByName(targetSheetName);
	if (sheet === null) { throw new Error(`${targetSheetName}が取得できませんでした`) }

	matchInfoList.forEach(info => {
		[
			info.日付,
			info.試合数,
			info.モード,
			info.マップ,
			info.勝利,
			info.動画,
			info.概要,
			// 人数カラムは自動抽出するので未入力
			,
		]



	})

	// // 書き込みたいデータを準備
	// const data = [
	// 	['名前', '年齢', '職業'],
	// 	['山田太郎', 30, 'エンジニア'],
	// 	['鈴木花子', 25, 'デザイナー'],
	// 	['佐藤次郎', 28, 'マーケター']
	// ];

	// // データを書き込む範囲を設定
	// const range = sheet.getRange(150, 2, data.length, data[0].length);

	// // データを書き込み
	// range.setValues(data);
}