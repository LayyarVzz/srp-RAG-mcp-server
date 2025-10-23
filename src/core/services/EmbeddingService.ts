import { OpenAIEmbeddings } from '@langchain/openai';

const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDING_MODEL,
  configuration: {
    apiKey: process.env.API_KEY,
    baseURL: process.env.BASE_URL
  }
});

export class EmbeddingService {
  public name: string = embeddings.model;

  /**
     * 批量将文本片段转换为向量
     * @param chunks 分块后的文本数组
     * @returns 向量数组（每个元素对应一个文本片段的嵌入向量）
     */
  static async embedDocuments(chunks: string[]): Promise<number[][]> {
    return embeddings.embedDocuments(chunks);
  }

  /**
   * 将单个查询文本转换为向量
   * @param query 用户的查询文本
   * @returns 单个向量（查询文本的嵌入表示）
   */
  static async embedQuery(query: string): Promise<number[]> {
    return embeddings.embedQuery(query);
  }

}