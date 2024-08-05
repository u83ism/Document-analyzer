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


const getMemberColumnValues = (randomNames: Array<string>): Array<string> => {
	// 2列目を解析して参加者の並び順も動的に取ろうかと思ったが、よく考えたら全員参加してないので空白があり取得できないし、
	// 範囲を舐めて解析するのも面倒すぎるので、固定の値とする。
	const order = ["ゆうやみ", ["Marie", "まりえ"], ["Marie（こうすけ）", "こうすけ"], "若丸", ["ようじょ", "ょぅl〝ょ"], "源", ["水金", "かけちよ"], "あっちゃん", "透", "なおえ", "すっちん"] as const

	// 名前のセットを作成して簡単にチェックできるようにする
	const validNamesSet = new Set(order);

	// 関係のない名前が含まれていないかチェック
	randomNames.forEach(name => {
		if (!validNamesSet.has(name)) {
			throw new Error(`登録されていない名前が見つかりました。/対象名: ${name}`);
		}
	})

	const result = new Array(order.length).fill('')
	order.forEach((targetName, index) => {
		const targetIndex = randomNames.indexOf(targetName);
		if (targetIndex !== -1) {
			result[index] = randomNames[targetIndex];
		}
	});
	return result
}


export const write = (spreadsheetId: string, matchInfoList: ReadonlyArray<MatchInfo>): void => {
	const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
	const targetSheetName = "試合ログ"
	const sheet = spreadsheet.getSheetByName(targetSheetName);
	if (sheet === null) { throw new Error(`${targetSheetName}が取得できませんでした`) }
	const headerValues = sheet.getRange('A1:1').getValues()[0];
	// console.info(headerValues)
	const memberColumnIndex = headerValues.findIndex((value) => value.includes("参加者"))
	// console.info(memberColumnIndex)

	matchInfoList.forEach(info => {
		const memberColumnValues = getMemberColumnValues(info.参加者)
		console.info(memberColumnValues)

		// [
		// 	info.日付,
		// 	info.試合数,
		// 	info.モード,
		// 	info.マップ,
		// 	info.勝利,
		// 	info.動画,
		// 	info.概要,
		// 	// 人数カラムは自動抽出するので未入力
		// 	,

		// ]
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