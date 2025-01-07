import { type Token } from "markdown-it";
import { MatchInfo, MovieInfo, ModeName, getAmoungUsMapName, isTeamName, isModeName, AmongUsMapName, TeamName, amongUsMapNames } from "./main";

export type State = {
	enableTag: string,
	日付: string,
	試合数: number,
	モード: ModeName,
	マップ: AmongUsMapName,
	参加者: Array<string>,
	インポスター: Array<string>,
	勝利: TeamName,
	概要: string,
	動画: Array<MovieInfo>
}

export const parseMatchCount = (text: string): number => {
	// 正規表現で「第」と「試合」の間の数字部分を抽出
	const match = text.match(/第(\d+)試合/);
	if (!match) {
		throw new Error(`"第●試合"という書式である必要があります。 text:${text}`);
	}
	const number = parseInt(match[1], 10);
	if (isNaN(number)) {
		throw new Error('試合番号が数字として取得できません');
	}
	return number;
}


const separateKeyAndValue = (text: string): [string | null, string | null] => {
	const separatorPattern = /:|：/
	const parts = text.split(separatorPattern); // コロンでキーと値を分割
	if (parts.length < 2) {
		// コロンがないか、値が空の場合は無視
		return [null, null]
	}
	const key = parts[0].trim();
	// 文中に":"が有って3つ以上に分かれた場合に備えてコロン以降の部分をすべて結合する
	const value = parts.slice(1).join(":").trim();
	return [key, value]
}

const getMovieInfoList = (text: string): Array<MovieInfo> => {
	const lines = text.split('\n'); // 改行で行を分割

	const movieInfoList: Array<MovieInfo> = []

	lines.forEach(line => {
		const [nameText, urlMarkdownText] = separateKeyAndValue(line)
		if (nameText !== null && urlMarkdownText !== null) {
			const namePattern = /^(.+?)視点/
			const nameMatch = nameText.match(namePattern);
			let contributorName: string;
			if (nameMatch) {
				contributorName = nameMatch[1]; // マッチした人名部分を返す
			} else {
				contributorName = `その他（${nameText}）`
			}
			const urlPattern = /\[.*?\]\((https?:\/\/[^\s)]+)\)/;
			const urlMatch = urlMarkdownText.match(urlPattern);
			// マッチが見つかれば、URLを返す
			// ちなみにGASにはURLクラスは存在しない
			let urlText: string;
			if (urlMatch) {
				urlText = urlMatch[1].trim();
			} else {
				throw new Error(`動画のURLが抽出できません。/文章:${urlMarkdownText}`);
			}

			movieInfoList.push({ contributorName, urlText });
		}
	})
	return movieInfoList
}


export const getMatchInfo = (state: State): MatchInfo => {

	const matchInfo: MatchInfo = {
		日付: state.日付,
		試合数: state.試合数,
		モード: state.モード,
		マップ: state.マップ,
		勝利: state.勝利,
		動画: state.動画,
		概要: state.概要,
		参加者: state.参加者,
		インポスター: state.インポスター
	}
	return matchInfo
}

// 見出し4(=h4)に来うる値
type InputMode = Exclude<keyof State, "enableTag" | "日付" | "試合数">
const isInputMode = (text: string): text is InputMode => {
	const propertyNames = ["モード", "マップ", "参加者", "インポスター", "勝利", "概要", "動画"]
	return propertyNames.some(propertyNames => propertyNames === text)
}
const parseInputMode = (text: string): InputMode => {
	if (isInputMode(text)) {
		return text
	} else {
		throw new Error(`入力モードとして受付できない値が入力されています /text:${text}`)
	}
}

export const getMatchInfoList = (tokens: ReadonlyArray<Token>): Array<MatchInfo> => {
	// ループを跨いで管理する必要のある状態
	// ドキュメントやスプレッドシートの項目名に合わせてあえて日本語プロパティ名にしている
	const initialState: State = {
		enableTag: "",
		日付: "",
		試合数: 0,
		モード: "クラシック",
		マップ: "The Skeld",
		参加者: [],
		インポスター: [],
		勝利: "クルー",
		概要: "",
		動画: []
	}

	let state: State = initialState

	// 見出し4(=h4)に関してはkey→次の行の平文がvalueになるため、ループしながら前の行のkeyが何だったかを把握する必要がある
	let inputMode: InputMode = "モード"

	const matchInfoList: Array<MatchInfo> = []

	tokens.forEach(token => {
		// console.info(token)
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
						state.試合数 = parseMatchCount(token.content)
						break;
					case "h4":
						inputMode = parseInputMode(token.content)
						break;
					case "":
						// 「とりまとめシートの「試合ログ」に移動しました。」部分除け
						if (state.試合数 !== 0) {
							// console.info(state)
							// console.info(`inputMode:${inputMode}/token.content:${token.content}`)
							switch (inputMode) {
								case "モード":
									if (isModeName(token.content)) {
										state[inputMode] = token.content
									} else {
										throw new Error(`${inputMode}として解釈できない値が入力されています/ ${token.content}`)
									}
									break;
								case "マップ":
									state[inputMode] = getAmoungUsMapName(token.content)
									break;
								case "参加者":
								case "インポスター":
									const names = token.content.split(/[,、]/);
									state[inputMode] = names;
									break;
								case "勝利":
									if (isTeamName(token.content)) {
										state[inputMode] = token.content
									} else {
										throw new Error(`${inputMode}として解釈できない値が入力されています/ ${token.content}`)
									}
									break;
								case "概要":
									// 複数段落ある可能性があるので注意
									state[inputMode] = (state[inputMode] === "") ? token.content : `\n${token.content}`
									break;
								case "動画":
									const movieInfoList = getMovieInfoList(token.content)
									state[inputMode] = movieInfoList

									// 項目の順番が固定かつ、"動画"が最後であることを前提として、データが揃ったので試合データに変換して格納
									const matchInfo: MatchInfo = getMatchInfo(state)
									console.info("---試合データ---")
									console.info(matchInfo)
									matchInfoList.push(matchInfo)
									break;
								default:
									break;
							}
						}
						break;
				}
				break;
		}
	})

	return matchInfoList
}
