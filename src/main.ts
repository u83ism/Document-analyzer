import markdownit from "markdown-it";

const extractMatchCount = (text: string): number => {
	// 正規表現で「第」と「試合」の間の数字部分を抽出
	const match = text.match(/第(\d+)試合/);
	if (!match) {
		throw new Error(' "第●試合"という書式である必要があります');
	}
	const number = parseInt(match[1], 10);
	if (isNaN(number)) {
		throw new Error('試合番号が数字として取得できません');
	}
	return number;
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


const separateKeyAndValue = (text: string): [string, string] => {
	const separator = ":"
	const parts = text.split(separator); // コロンでキーと値を分割
	Logger.log(`---separate Key And Value---`)
	if (parts.length < 2) {
		// コロンがないか、値が空の場合は無視
		throw new Error(`書式が間違っています。${separator}で区切ってある必要があります。 対象のテキスト:${parts}`);
	}
	Logger.log(`---1---`)
	const key = parts[0].trim();
	// 文中に":"が有って3つ以上に分かれた場合に備えてコロン以降の部分をすべて結合する
	const value = parts.slice(1).join(separator).trim();
	Logger.log(`---2---`)
	return [key, value]
}

const parseStringToObject = (text: string): any => {
	const lines = text.split('\n'); // 改行で行を分割
	const result: any = {};

	const [logParts, movieParts] = splitLogAndMovieParts(lines)

	logParts.forEach(line => {
		const [key, value] = separateKeyAndValue(line)
		result[key] = value;
	});

	// moviePart.forEach(line => {
	// 	const [key, value] = separateKeyAndValue(line)
	// 	result["動画"][key] = value;
	// })
	return result;
}

const extractMatchInfo = (text: string): MatchLog => {





	return {}
}


export const test = (): void => {
	// 深夜のAmongUs会のドキュメントを取得
	const documentId = "1jaagzHsuiGC4TSTHuHBOP9cvb4io0xLNl1arlaMr-9I";
	const doc = DocumentApp.openById(documentId);

	// const paragraphs = doc.getBody().getParagraphs();
	// paragraphs.forEach(paragraph => {
	// 	const text = paragraph.getText();
	// 	const numChildren = paragraph.getNumChildren()
	// 	Logger.log(`text: ${text}/numChildren: ${numChildren}`)

	// })

	const url = `https://docs.google.com/feeds/download/documents/export/Export?exportFormat=markdown&id=${documentId}`;
	const response = UrlFetchApp.fetch(url, {
		headers: { authorization: "Bearer " + ScriptApp.getOAuthToken() },
	});

	const mdText = response.getContentText();
	const mdi = markdownit()
	const tokens = mdi.parse(mdText, {})

	// 「試合ログ」の段落を探す
	const matchLogStartIndex = tokens.findIndex(mdInfo => mdInfo.content.includes("試合ログ"))
	const matchLogTokens = tokens.slice(matchLogStartIndex)

	const matchLogs: Array<MatchLog> = [];
	// ループを跨いで管理する必要のある状態
	type State = {
		enableTag: string,
		dateText: string,
		matchCount: number,
	}
	const state: State = {
		enableTag: "",
		dateText: "",
		matchCount: 0,
	}

	matchLogTokens.forEach(token => {
		Logger.log(token)

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
						state.matchCount = extractMatchCount(token.content)
						break;
					default:
						// 試合データ
						const object = parseStringToObject(token.content)
						Logger.log(object)
						break;
				}

				break;
			default:
				break;
		}
	})

}



const testError = () => {
	throw new Error("Error!!")
}

const testErrorInNestedFunction = () => {
	const texts = ["A", "B", "C"]
	texts.forEach(text => { testError() })
}

export const testErrorInDobleNestedFunction = () => {
	const numbers = [1, 2, 3]
	numbers.forEach((number) => testErrorInNestedFunction())
}


// GASから参照したい関数はglobalオブジェクトに渡してあげる必要がある
(global as any).test = test;
(global as any).testErrorInDobleNestedFunction = testErrorInDobleNestedFunction;