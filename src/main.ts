import markdownit from "markdown-it";

type MatchInfo = {
	date: Date,
	matchCount: number,
}

function isValidDate(dateString: string) {
	// 日付フォーマットの検証をここで行います（例としてYYYY/MM/DDフォーマットを使用）
	var regex = /^\d{4}\/\d{2}\/\d{2}$/;
	return regex.test(dateString);
}

function getMatchCount(text: string) {
	var match = text.match(/^第(\d+)試合$/);
	if (match) {
		return parseInt(match[1], 10);
	}
	return null;
}

/**
 * ドキュメントのうち、試合ログ以降の部分を取得する
 * 
 * @param paragraphs 
 * @returns 
 */
const getMatchLogParagraphs = (paragraphs: ReadonlyArray<GoogleAppsScript.Document.Paragraph>): Array<GoogleAppsScript.Document.Paragraph> => {
	const matchLogIndex = paragraphs.findIndex((paragraph => {
		const heading = paragraph.getHeading();
		const text = paragraph.getText();

		return heading === DocumentApp.ParagraphHeading.HEADING1 && text.includes("試合ログ")
	}))
	const matchLogParagraphs = paragraphs.slice(matchLogIndex)
	return matchLogParagraphs
}

export const getMatchInfoList = (paragraphs: ReadonlyArray<GoogleAppsScript.Document.Paragraph>): Array<MatchInfo> => {
	const matchLogParagraphs = getMatchLogParagraphs(paragraphs)

	// 
	const headingToPurposeMap = {
		title: DocumentApp.ParagraphHeading.HEADING1,
		date: DocumentApp.ParagraphHeading.HEADING2,
		matchCount: DocumentApp.ParagraphHeading.HEADING3,
	} as const


	const matchInfoList = []

	matchLogParagraphs.filter(paragraph => {
		const heading = paragraph.getHeading();
		// 「試合ログ」そのものはいらない
		return heading !== headingToPurposeMap.title
	}).forEach(paragraph => {
		const heading = paragraph.getHeading();
		const text = paragraph.getText();
		if (heading === headingToPurposeMap.date) {

		}

		Logger.log(`heading:${heading}/text:${text}`)
	})


	// paragraphs.forEach(function (paragraph) {
	// 	// const text = paragraph.getText();
	// 	const heading = paragraph.getHeading();

	// 	if (heading === DocumentApp.ParagraphHeading.HEADING2 && isValidDate(text)) {
	// 		currentDate = text;
	// 	}

	// 	if (heading === DocumentApp.ParagraphHeading.HEADING3) {
	// 		var matchCount = getMatchCount(text);
	// 		if (matchCount !== null) {
	// 			data.push({
	// 				date: currentDate,
	// 				matchCount: matchCount
	// 			});
	// 		}
	// 	}
	// });

	const matchInfo: MatchInfo = {
		date: new Date(),
		matchCount: 1
	};

	return [matchInfo]
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
	const matchLogs = []


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

	matchLogTokens.forEach(matchLog => {
		Logger.log(matchLog)
		if (matchLog.type === "heading_open") {
			switch (matchLog.tag) {
				case "h2"://開催日

					break;
				case "h3"://試合数

					break;
			}
		}

	})

}

// GASから参照したい関数はglobalオブジェクトに渡してあげる必要がある
(global as any).getMatchInfoList = getMatchInfoList;
(global as any).test = test;