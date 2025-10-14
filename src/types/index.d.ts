export interface TextSplitterOptions {
    chunkSize?: number;         // 每个 chunk 的最大 token/字符数
    chunkOverlap?: number;      // chunk 之间的重叠字符数（有助于上下文连贯）
    keepSeparator?: boolean;    // 是否保留分隔符
    separators?: string[];      // 自定义分隔符列表
}

