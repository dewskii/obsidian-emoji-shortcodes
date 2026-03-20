import { EditorView } from '@codemirror/view';
import { Editor } from 'obsidian';

export function checkForInputBlock(editor: Editor, line: number, ch: number): boolean {
	const lineText = editor.getLine(line);

	const beforeCursor = lineText.substring(0, ch);
	const backtickCount = (beforeCursor.match(/`/g) || []).length;
	if (backtickCount % 2 === 1) {
		return false;
	}

	let insideFence = false;
	for (let i = 0; i <= line; i++) {
		const text = editor.getLine(i);
		if (text.match(/^```/)) {
			insideFence = !insideFence;
		}
	}
	
	return !insideFence;
}

// separate checker for livepreview, uses CM6
export function checkForInputBlockEditorView(view: EditorView, pos: number): boolean {
	const doc = view.state.doc;
	const line = doc.lineAt(pos);
	const lineText = line.text;
	const ch = pos - line.from;
	
	const beforeCursor = lineText.substring(0, ch);
	const backtickCount = (beforeCursor.match(/`/g) || []).length;
	if (backtickCount % 2 === 1) {
		return false;
	}

	let insideFence = false;
	for (let i = 1; i <= line.number; i++) {
		const text = doc.line(i).text;
		if (text.match(/^```/)) {
			insideFence = !insideFence;
		}
	}
	
	return !insideFence;
}