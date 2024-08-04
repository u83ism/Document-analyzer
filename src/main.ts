import markdownit from "markdown-it";
import { extractMatchCountAndMode, parseToMatchRawData, getMatchInfo, type State } from "./parser";

export const test = (): void => {
	// 深夜のAmongUs会のドキュメントを取得
	const documentId = "1jaagzHsuiGC4TSTHuHBOP9cvb4io0xLNl1arlaMr-9I";

	const url = `https://docs.google.com/feeds/download/documents/export/Export?exportFormat=markdown&id=${documentId}`;
	const response = UrlFetchApp.fetch(url, {
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

	// ループを跨いで管理する必要のある状態
	// ドキュメントやスプレッドシートの項目名に合わせてあえて日本語プロパティ名にしている
	const state: State = {
		enableTag: "",
		日付: "",
		試合数: 0,
		モード: "クラシック"
	}

	matchLogTokens.forEach(token => {
		// console.debug(token)

		switch (token.type) {
			case "heading_open":
				state.enableTag = token.tag
				break;
			case "heading_close":
				state.enableTag = ""
				break;
			case "inline":
				switch (state.enableTag) {
					case "h2":
						// 日付（"6/2昼"とかあるのでstringにする必要あり注意）
						state.日付 = token.content
						break;
					case "h3":
						// 試合番号
						[state.試合数, state.モード] = extractMatchCountAndMode(token.content)
						break;
					case "":
						// 「とりまとめシートの「試合ログ」に移動しました。」部分除け
						if (state.試合数 !== 0) {
							// 試合データ
							const rawData = parseToMatchRawData(token.content)
							if (rawData === null) {
								console.warn("★解析に失敗している可能性があります★")
								console.warn(token)

							} else {
								const matchInfo = getMatchInfo(state, rawData)
								console.info(`---解析結果---`)
								console.info(matchInfo)
							}
						}
						break;
				}
				break;
		}
	})

}


// GASから参照したい関数はglobalオブジェクトに渡してあげる必要がある
(global as any).test = test;