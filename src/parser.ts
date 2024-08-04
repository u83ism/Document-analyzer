
type Mode = "クラシック" | "かくれんぼ"
type Team = "クルー" | "インポスター"
export type State = {
	enableTag: string,
	日付: string,
	試合数: number,
	モード: Mode,
}


export const extractMatchCountAndMode = (text: string): [number, Mode] => {
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

type MovieRawData = {
	nameText: string,
	urlMarkdownText: string
}
// Googleドキュメントで見出し等も設定されていない、普通の文章部分を構造化したもの
// ドキュメントの項目名を流用するためあえて日本語プロパティ名にしている
type MatchRawData = {
	"マップ": string,
	// 配列化する必要あり
	"参加者": string,
	"インポスター": string,
	"勝利": Team,
	"概要": string,
	//【動画】は必ずあるが、その後が空
	"動画": ReadonlyArray<MovieRawData>
}

const isMatchRawData = (data: any): data is MatchRawData => {
	const propertyNames = ["マップ", "参加者", "インポスター", "勝利", "概要"]
	const result = propertyNames.every((propertyNames: string) => {
		return (data?.[propertyNames] !== undefined && typeof data[propertyNames] === "string")
	})
	if (result === false) { return false }

	if (data?.動画 === undefined || Array.isArray(data.動画) === false) { return false }
	if (data.動画.length >= 1) {
		const result2 = data.動画.every((movieRawData: any) => {
			const existsNameText = (movieRawData?.nameText !== undefined && typeof movieRawData.nameText === "string")
			const existsUrlMarkdownText = (movieRawData?.urlMarkdownText !== undefined && typeof movieRawData.urlMarkdownText === "string")
			if (existsNameText === false || existsUrlMarkdownText === false) { return false }
			return true
		})
		if (result2 === false) { return false }
	}

	return result
}

export const parseToMatchRawData = (text: string): MatchRawData | null => {
	const lines = text.split('\n'); // 改行で行を分割

	const [logParts, movieParts] = splitLogAndMovieParts(lines)
	const result: any = {
		"動画": []
	};
	logParts.forEach(line => {
		const [key, value] = separateKeyAndValue(line)
		if (key !== null && value !== null) { result[key] = value; }
	});

	movieParts.forEach(line => {
		const [nameText, urlMarkdownText] = separateKeyAndValue(line)
		if (nameText !== null && urlMarkdownText !== null) {
			result["動画"].push({ nameText, urlMarkdownText });
		}
	})
	if (isMatchRawData(result)) {
		return result
	} else {
		return null
	}
}


type MovieInfo = {
	contributorName: string,
	urlText: string
}

// ループ回しながら組み立てるしかないので全部Optionalにせざるを得ない
// スプシのカラム名と被せるためにあえて日本語プロパティ名にしている
type MatchInfo = {
	// ●/●昼という表記もあるのでいったんstringで……
	日付: string,
	試合数: number,
	モード: string,
	マップ: string,
	勝利: Team,
	動画: ReadonlyArray<MovieInfo>,
	概要: string,
	参加メンバー: Array<string>
	インポスター: Array<string>,
}

const getMovieInfo = (rawData: MovieRawData): MovieInfo => {
	console.info(rawData);
	const namePattern = /^(.+?)視点/
	const nameMatch = rawData.nameText.match(namePattern);
	let contributorName: string;
	if (nameMatch) {
		contributorName = nameMatch[1]; // マッチした人名部分を返す
	} else {
		throw new Error(`動画のデータから投稿者名が抽出できません。「●●視点」という表記である必要があります。/文章:${rawData.nameText}`);
	}
	const urlPattern = /\[.*?\]\((https?:\/\/[^\s)]+)\)/;
	const urlMatch = rawData.urlMarkdownText.match(urlPattern);
	// マッチが見つかれば、URLを返す
	let urlText: string;
	if (urlMatch) {
		urlText = urlMatch[1].trim();
	} else {
		throw new Error(`動画のURLが抽出できません。/文章:${rawData.urlMarkdownText}`);
	}
	const info: MovieInfo = { contributorName, urlText }
	return info
}


export const getMatchInfo = (state: State, rawData: MatchRawData): MatchInfo => {
	// 生データは文字ベースなので配列やオブジェクトに変換
	const movieInfoList = rawData.動画.map((movieRawData) => {
		return getMovieInfo(movieRawData)
	})
	const memberNames = rawData.参加者.split(',');
	const imposterNames = rawData.インポスター.split(',');


	const matchInfo: MatchInfo = {
		日付: state.日付,
		試合数: state.試合数,
		モード: state.モード,
		マップ: rawData.マップ,
		勝利: rawData.勝利,
		動画: movieInfoList,
		概要: rawData.概要,
		参加メンバー: memberNames,
		インポスター: imposterNames
	}
	return matchInfo
}