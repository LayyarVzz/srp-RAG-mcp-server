import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { TextSplitterOptions } from '../types/index.js';

// 默认切分配置，后续可以更加细致的优化切分规则
const defaultSplitterOptions: Required<TextSplitterOptions> = {
    chunkSize: 400,
    chunkOverlap: 40,
    keepSeparator: true,
    separators: ["\n\n", "\n", " ", ""]
}

const splitter = new RecursiveCharacterTextSplitter(defaultSplitterOptions);

// 文本切分器工具类,使用递归字符切分策略，优先按段落、句子、单词切分
export class TextSplitter {
    /**
     * 将输入文本按照预定义的策略进行切分
     * 
     * 使用 RecursiveCharacterTextSplitter 进行文本切分，按照段落、换行符等分隔符进行递归切分，
     * 默认配置为：块大小 400 字符，重叠 40 字符，保留分隔符
     * 
     * @param text 需要切分的原始文本
     * @returns 切分后的文本块数组
     */
    static async split(text: string): Promise<string[]> {
        return splitter.splitText(text);
    }

    // 可以自己定义新的方法...
}