import markdownit from "markdown-it";
import { getMatchInfoList } from "./parser";

export const test = (): void => {
	// 深夜のAmongUs会のドキュメントを取得
	const documentId = "1jaagzHsuiGC4TSTHuHBOP9cvb4io0xLNl1arlaMr-9I";

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

	const matchInfoList = getMatchInfoList(matchLogTokens)
	const spreadSheetId = "1_3ni67C36-eeqGRbA80_5YfWghFSUAVVdtL7tU9MraM"


}


// GASから参照したい関数はglobalオブジェクトに渡してあげる必要がある
(global as any).test = test;