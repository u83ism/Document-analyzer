import markdownit from "markdown-it";

type Mode = "クラシック" | "かくれんぼ"


const extractMatchCountAndMode = (text: string): [number, Mode] => {
	// 正規表現で「第」と「試合」の間の数字部分を抽出
	const match = text.match(/第(\d+)試合/);
	if (!match) {
		throw new Error(`"第●試合"という書式である必要があります。 text:${text}`);
	}
	const number = parseInt(match[1], 10);
	if (isNaN(number)) {
		throw new Error('試合番号が数字として取得できません');
	}

	const mode: Mode = text.includes("かくれんぼ") ? "かくれんぼ" : "クラシック"

	return [number, mode];
}


type MovieInfo = {
	contributorName: string,
	url: URL
}

// ループ回しながら組み立てるしかないので全部Optionalにせざるを得ない
type MatchLog = {
	date?: Date,
	matchCount?: number,
	mapName?: string,
	memberNames?: ReadonlyArray<string>
	imposterNames?: ReadonlyArray<string>,
	winner?: "クルー" | "インポスター",
	overview?: string,
	movieInfoList?: ReadonlyArray<MovieInfo>
}


const splitLogAndMovieParts = (texts: Array<string>): Array<Array<string>> => {
	const moviePartKeyword = "【動画】"
	const index = texts.findIndex(text => text.includes(moviePartKeyword));
	if (index === -1) {
		// キーワードが見つからなかった場合、元の配列をそのまま返す
		return [texts, []];
	}
	const beforeKeyword = texts.slice(0, index);
	const afterKeyword = texts.slice(index + 1);
	return [beforeKeyword, afterKeyword];
}


const separateKeyAndValue = (text: string): [string | null, string | null] => {
	const separator = ":"
	const parts = text.split(separator); // コロンでキーと値を分割
	if (parts.length < 2) {
		// コロンがないか、値が空の場合は無視
		return [null, null]
	}
	const key = parts[0].trim();
	// 文中に":"が有って3つ以上に分かれた場合に備えてコロン以降の部分をすべて結合する
	const value = parts.slice(1).join(separator).trim();
	return [key, value]
}


// Googleドキュメントで見出し等も設定されていない、普通の文章部分を構造化したもの
type MatchRawData = {
	"マップ": string,
	// 配列化する必要あり
	"参加者": string,
	"インポスター": string,
	"勝敗": string,
	"概要": string,
	//【動画】は必ずあるが、その後が空
	"動画": {
		[key in string]: string
	} | null
}

const isMatchRawData = (data: any): data is MatchRawData => {
	const propertyNames = ["マップ", "参加者", "インポスター", "勝敗", "概要"]
	const result = propertyNames.every((propertyNames: string) => {
		return (data?.[propertyNames] !== undefined && typeof data[propertyNames] === "string")
	})
	return result
}

const parseToMatchRawData = (text: string): MatchRawData | null => {
	const lines = text.split('\n'); // 改行で行を分割

	const [logParts, movieParts] = splitLogAndMovieParts(lines)
	const result: any = {};
	logParts.forEach(line => {
		const [key, value] = separateKeyAndValue(line)
		if (key !== null && value !== null) { result[key] = value; }
	});

	movieParts.forEach(line => {
		const [key, value] = separateKeyAndValue(line)
		if (key !== null && value !== null) {
			result["動画"] = result["動画"] ?? {};
			result["動画"][key] = value;
		}
	})

	if (isMatchRawData(result)) {
		return result
	} else {
		return null
	}
}

const getMatchInfo = (date: string, matchcount): MatchLog => {
	return {}
}


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

	const matchLogs: Array<MatchLog> = [];
	// ループを跨いで管理する必要のある状態
	type State = {
		enableTag: string,
		dateText: string,
		matchCount: number,
		mode: Mode,
	}
	const state: State = {
		enableTag: "",
		dateText: "",
		matchCount: 0,
		mode: "クラシック"
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
						state.dateText = token.content
						break;
					case "h3":
						// 試合番号
						[state.matchCount, state.mode] = extractMatchCountAndMode(token.content)
						break;
					case "":
						// 「とりまとめシートの「試合ログ」に移動しました。」部分除け
						if (state.matchCount !== 0) {
							// 試合データ
							const rawData = parseToMatchRawData(token.content)
							console.info(`---解析結果---`)
							console.info(rawData)
							if (rawData === null) {
								console.warn("★解析に失敗している可能性があります★")
								console.warn(token)
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