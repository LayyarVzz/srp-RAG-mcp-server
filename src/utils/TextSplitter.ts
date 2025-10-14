import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { TextSplitterOptions } from '../types/index.js';
// 默认切分配置
const defaultSplitterOptions: Required<TextSplitterOptions> = {
    chunkSize: 400,
    chunkOverlap: 40,
    keepSeparator: true,
    separators: ["\n\n", "\n", " ", ""]
}

// 文本切分器工具类,使用递归字符切分策略，优先按段落、句子、单词切分
export class TextSplitter {
    private static splitter: RecursiveCharacterTextSplitter;

    private constructor() { }

    static async split(text: string, options: TextSplitterOptions = defaultSplitterOptions): Promise<string[]> {
        if (!this.splitter) {
            this.splitter = new RecursiveCharacterTextSplitter(options);
        }
        return this.splitter.splitText(text);
    }
}