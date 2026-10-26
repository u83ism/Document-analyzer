// 手作業で崩れたドキュメントの見出しスタイルを直す.
// パーサー側で崩れを吸収するとバグの元になるので、元データ側を直す方針.
// 本文の文字は変えず、見出しレベルの変更と、見出しにする行の前後にある段落内改行（Shift+Enter）の整理だけを行う.

type Fix = {
	paragraph: GoogleAppsScript.Document.Paragraph,
	from: GoogleAppsScript.Document.ParagraphHeading,
	to: GoogleAppsScript.Document.ParagraphHeading,
	dateText: string,
	text: string,
	// 見出しにする行の前にある空白・改行の文字数
	leadingLength: number,
	// 見出しにする行の文字列（前後の空白は除く）
	headingText: string,
	// 見出しにする行の後ろに、同じ段落のまま続く本文があるか
	hasRest: boolean
}

// 「インポスター」は勝利欄の値（普通の段落）と区別できないので対象外
const itemHeadingTexts = ["モード", "マップ", "参加者", "勝利", "概要", "動画"]

// 段落内改行はgetText()で\rとして返ってくるが、念のため\nと\vも含める
const lineBreakPattern = /[\r\n\v]/

/**
 * 段落の本文から、本来あるべき見出しレベルを返す.
 * 判定できない段落はnullを返し、変更対象にしない.
 */
const getExpectedHeading = (text: string): GoogleAppsScript.Document.ParagraphHeading | null => {
	const trimmed = text.trim()
	if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(trimmed)) { return DocumentApp.ParagraphHeading.HEADING2 }
	// 「第●試合（テンプレート）」は数字でないので対象外
	if (/^第\d+試合$/.test(trimmed)) { return DocumentApp.ParagraphHeading.HEADING3 }
	if (itemHeadingTexts.includes(trimmed)) { return DocumentApp.ParagraphHeading.HEADING4 }
	return null
}

const collectFixes = (body: GoogleAppsScript.Document.Body): Array<Fix> => {
	const fixes: Array<Fix> = []
	let inMatchLog = false
	let dateText = ""
	// 表やリストの中は見ない（試合の見出しは本文直下の段落にしかない）
	for (let i = 0; i < body.getNumChildren(); i++) {
		const child = body.getChild(i)
		if (child.getType() !== DocumentApp.ElementType.PARAGRAPH) { continue }
		const paragraph = child.asParagraph()
		const heading = paragraph.getHeading()
		const text = paragraph.getText()

		if (heading === DocumentApp.ParagraphHeading.HEADING1) {
			inMatchLog = text.includes("試合ログ")
			continue
		}
		if (!inMatchLog) { continue }

		// 先頭の空白・改行を飛ばした最初の行で判定する
		const leadingLength = text.length - text.trimStart().length
		const [firstLine, ...restLines] = text.slice(leadingLength).split(lineBreakPattern)
		const headingText = firstLine.trim()
		const hasRest = restLines.join("").trim() !== ""

		let expected = getExpectedHeading(headingText)
		// 中身が空の見出しは普通の段落に戻す（消すと前後の段落がくっつくおそれがあるので消さない）
		if (expected === null && text.trim() === "" && heading !== DocumentApp.ParagraphHeading.NORMAL) {
			expected = DocumentApp.ParagraphHeading.NORMAL
		}
		if (expected === null) { continue }
		if (expected === DocumentApp.ParagraphHeading.HEADING2) {
			dateText = headingText
		}
		const needsTextChange = expected !== DocumentApp.ParagraphHeading.NORMAL && (leadingLength > 0 || hasRest)
		if (expected !== heading || needsTextChange) {
			fixes.push({ paragraph, from: heading, to: expected, dateText, text, leadingLength, headingText, hasRest })
		}
	}
	return fixes
}

const describeFix = (fix: Fix): string => {
	if (fix.to === DocumentApp.ParagraphHeading.NORMAL) { return "見出しを解除" }
	if (fix.hasRest) { return `「${fix.headingText}」だけを${fix.to}の段落に分け、残りは${fix.from}のまま` }
	if (fix.leadingLength > 0) { return `前の空白・改行${fix.leadingLength}文字を消して${fix.to}` }
	return `${fix.to}`
}

const applyFix = (fix: Fix): void => {
	if (fix.to === DocumentApp.ParagraphHeading.NORMAL) {
		fix.paragraph.setHeading(fix.to)
		return
	}
	if (fix.hasRest) {
		// 見出しの行を新しい段落として前に挿入し、元の段落からはその行と直後の改行を消す
		const body = fix.paragraph.getParent().asBody()
		const index = body.getChildIndex(fix.paragraph)
		body.insertParagraph(index, fix.headingText).setHeading(fix.to)
		const afterFirstLine = fix.text.slice(fix.leadingLength).search(lineBreakPattern)
		const restStart = fix.leadingLength + afterFirstLine
		const restLeadingLength = fix.text.slice(restStart).length - fix.text.slice(restStart).trimStart().length
		fix.paragraph.editAsText().deleteText(0, restStart + restLeadingLength - 1)
		return
	}
	if (fix.leadingLength > 0) {
		fix.paragraph.editAsText().deleteText(0, fix.leadingLength - 1)
	}
	fix.paragraph.setHeading(fix.to)
}

const getDocumentBody = (): GoogleAppsScript.Document.Body => {
	const documentId = PropertiesService.getScriptProperties().getProperty("documentId");
	if (documentId === null) { throw new Error(`documentIdを取得できませんでした。GASの「プロジェクトの設定」→「スクリプト プロパティ」を確認してください`) }
	return DocumentApp.openById(documentId).getBody()
}

const logFixes = (fixes: ReadonlyArray<Fix>, label: string): void => {
	fixes.forEach(fix => {
		// 改行が見えるようにJSON文字列として出す
		console.info(`[${label}] ${fix.dateText} ${JSON.stringify(fix.text.slice(0, 40))}: ${fix.from} → ${describeFix(fix)}`)
	})
	console.info(`[${label}] 対象 ${fixes.length} 件`)
}

/**
 * 変更内容をログに出すだけで、ドキュメントは変更しない.
 */
export const previewFixDocumentHeadings = (): void => {
	logFixes(collectFixes(getDocumentBody()), "確認")
}

/**
 * 見出しスタイルを実際に変更する. 実行前にpreviewFixDocumentHeadingsで内容を確認すること.
 */
export const fixDocumentHeadings = (): void => {
	const fixes = collectFixes(getDocumentBody())
	fixes.forEach(applyFix)
	logFixes(fixes, "変更")
}
