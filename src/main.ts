type MatchInfo = {
	date: Date,
	matchCount: number,
}


function isValidDate(dateString) {
	// 日付フォーマットの検証をここで行います（例としてYYYY/MM/DDフォーマットを使用）
	var regex = /^\d{4}\/\d{2}\/\d{2}$/;
	return regex.test(dateString);
}

function getMatchCount(text) {
	var match = text.match(/^第(\d+)試合$/);
	if (match) {
		return parseInt(match[1], 10);
	}
	return null;
}


const getMatchLogParagraphs = (paragraphs: ReadonlyArray<GoogleAppsScript.Document.Paragraph>): Array<GoogleAppsScript.Document.Paragraph> => {
	// 試合ログ以降の部分を取得する
	const matchLogIndex = paragraphs.findIndex((paragraph => {
		const heading = paragraph.getHeading();
		const text = paragraph.getText();

		return heading === DocumentApp.ParagraphHeading.HEADING1 && text.includes("試合ログ")
	}))
	const matchLogParagraphs = paragraphs.slice(matchLogIndex)
	return matchLogParagraphs
}


const getMatchInfoList = (paragraphs: ReadonlyArray<GoogleAppsScript.Document.Paragraph>): Array<MatchInfo> => {
	const matchLogParagraphs = getMatchLogParagraphs(paragraphs)
	matchLogParagraphs.forEach(paragraph => {
		const text = paragraph.getText();
		const heading = paragraph.getHeading();

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