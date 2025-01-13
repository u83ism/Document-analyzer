import markdownit, { type Token } from "markdown-it";
import { MatchInfo, MovieInfo } from "./main";

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
	const matchLogEndIndex = tokens.findIndex(mdInfo => mdInfo.content.includes("（テンプレート）"))
	const matchLogTokens = tokens.slice(matchLogStartIndex, matchLogEndIndex)

	return matchLogTokens
}


const getMemberColumnValues = (randomNames: ReadonlyArray<string>, imposterNames: ReadonlyArray<string>): Array<string> => {
	// 2列目を解析して参加者の並び順も動的に取ろうかと思ったが、よく考えたら全員参加してないので空白があり取得できないし、
	// 範囲を舐めて解析するのも面倒すぎるので、固定の値とする。
	// また表記ブレがあるのでそれにも対応する
	const order = [
		["ゆうやみ"],
		["Marie", "まりえ"],
		["Marie（こうすけ）", "こうすけ"],
		["若丸", "ん若丸"],
		["ようじょ", "ょぅl〝ょ", "ょぅl゛ょ"],
		["源"],
		["水金", "かけちよ"],
		["あっちゃん"],
		["透"],
		["なおえ"],
		["すっちん"]
	]
	const flated_order = order.flatMap(order => order)

	// 名前のセットを作成して簡単にチェックできるようにする
	const validNamesSet = new Set(flated_order);

	// 関係のない名前が含まれていないかチェック
	randomNames.forEach(name => {
		if (!validNamesSet.has(name)) {
			throw new Error(`参加者に登録されていない名前が見つかりました。/対象名: ${name}`);
		}
	})
	imposterNames.forEach(name => {
		if (!validNamesSet.has(name)) {
			throw new Error(`インポスターに登録されていない名前が見つかりました。/対象名: ${name}`);
		}
	})

	const values = new Array(order.length).fill('')
	order.forEach((targetNames, index) => {
		targetNames.forEach(targetName => {
			const targetIndex = randomNames.indexOf(targetName)
			if (targetIndex !== -1) {
				values[index] = randomNames[targetIndex];
			}
		})
	});

	// インポスターには名前の冒頭に絵文字を追加する
	const imposterEmoji = "🔪"
	const decoratedValues = values.map(value => {
		const isImposter = imposterNames.some(imposterName => imposterName === value)
		if (isImposter) {
			return `${imposterEmoji}${value}`
		} else {
			return value
		}
	})

	return decoratedValues
}

/**
 * 動画カラムの内容を取得する.
 * 
 * 今まで手作業でリッチテキスト相当の処理をやっていたが、
 * 自動化しようとするとあまりにも面倒くさすぎるので（設定するセル等だけ別扱いで設定する必要がある）
 * やり方を変える.
 * 
 * @param infoList 動画に関するデータのリスト
 */
const getMovieColumnValume = (infoList: ReadonlyArray<MovieInfo>): string => {
	let text = ""
	infoList.forEach((info) => {
		const additionalText = `${info.contributorName}視点: ${info.urlText} \n`
		text += additionalText
	})
	return text
}


const getValues = (sheet: GoogleAppsScript.Spreadsheet.Sheet, matchInfoList: ReadonlyArray<MatchInfo>): Array<Array<(string | number | undefined)>> => {
	// ヘッダーの中身に合わせて動的に順番を入れ替えるため、内容を取得する
	const headerValues = sheet.getRange('A1:1').getValues()[0];
	// console.info(headerValues)

	const values = matchInfoList.map(info => {
		// 何日の第何試合に問題があるか把握するためにロギング
		// console.info(`日付:${info.日付} / 試合数:${info.試合数}`)

		const movieColumnValue = getMovieColumnValume(info.動画)

		const memberColumnValues = getMemberColumnValues(info.参加者, info.インポスター)
		// console.info(memberColumnValues)

		const data = [
			info.日付,
			info.試合数,
			info.モード,
			info.マップ,
			info.勝利,
			movieColumnValue,
			info.概要,
			// 人数カラムは自動抽出するので未入力
			,
			...memberColumnValues
		]
		if (data.length !== 19) { throw new Error(`データの個数が正しくありません。${data.length}のデータがあります。`) }

		return data
	})
	return values
}



export const write = (spreadsheetId: string, matchInfoList: ReadonlyArray<MatchInfo>, rowCount: number): void => {
	const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
	const targetSheetName = "試合ログ"
	const sheet = spreadsheet.getSheetByName(targetSheetName);
	if (sheet === null) { throw new Error(`${targetSheetName}が取得できませんでした`) }
	const values = getValues(sheet, matchInfoList)
	// console.info(values)

	const range = sheet.getRange(rowCount, 2, values.length, values[0].length);

	// // データを書き込み
	range.setValues(values);
}