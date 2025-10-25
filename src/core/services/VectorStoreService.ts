/**
 * 向量存储服务：负责向量的存储、检索和统计（全静态方法实现）
 */
export class VectorStoreService {
  // 静态Map存储文档片段及其向量和元数据，key为文档ID
  private static documents: Map<string, {
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
  }> = new Map();

  /**
   * 存储文档片段及对应向量
   * @param params 包含多个文档片段的数组，每个片段含文本、向量和元数据
   * @returns 存储结果（是否成功及可选的文档ID）
   */
  static async addDocuments(params: {
    documents: Array<{
      content: string;       // 文本片段内容
      embedding: number[];   // 文本对应的向量
      metadata: Record<string, any>; // 元数据（如来源、分块索引等）
    }>;
  }): Promise<{
    success: boolean;
    ids?: string[]; // 可选：存储后生成的文档ID数组
  }> {
    try {
      const ids: string[] = [];
      for (const doc of params.documents) {
        const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        VectorStoreService.documents.set(id, {
          content: doc.content,
          embedding: doc.embedding,
          metadata: doc.metadata,
        });
        ids.push(id);
      }
      return {
        success: true,
        ids: ids
      };
    } catch (error) {
      console.error('添加文档失败', error);
      return {
        success: false,
      };
    }
  }

  /**
   * 相似性检索：根据查询向量找最匹配的文档片段
   * @param params 检索参数（查询向量+返回数量）
   * @returns 检索结果数组（含文本、向量、元数据和相似度分数）
   */
  static async similaritySearch(params: {
    queryEmbedding: number[]; // 查询文本的向量
    topK: number; // 返回的最相似结果数量
  }): Promise<Array<{
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
    score: number; // 相似度分数（0-1，值越高越相似）
  }>> {
    try {
      const similarities: Array<{
        content: string;
        embedding: number[];
        metadata: Record<string, any>;
        score: number;
      }> = [];

      for (const [id, doc] of VectorStoreService.documents) {
        const score = VectorStoreService.cosineSimilarity(doc.embedding, params.queryEmbedding);
        similarities.push({
          content: doc.content,
          embedding: doc.embedding,
          metadata: doc.metadata,
          score: score,
        });
      }

      // 排序后取topK条结果
      return similarities
        .sort((a, b) => b.score - a.score)
        .slice(0, params.topK);

    } catch (error) {
      console.error('相似性检索失败', error);
      return [];
    }
  }

  /**
   * 统计知识库信息
   * @param detail 是否返回详细统计（如每个文档的片段数）
   * @returns 统计结果（总文档数、总片段数等）
   */
  static async getStatistics(detail: boolean = false): Promise<{
    totalDocuments: number; // 总文档数
    totalChunks: number;    // 总片段数
    totalSize?: number;     // 可选：总存储大小（字节）
    details?: Array<{       // 可选：详细统计（当detail为true时）
      source: string;       // 文档来源路径
      chunkCount: number;   // 该文档的片段数
    }>;
  }> {
    try {
      const totalDocuments = VectorStoreService.documents.size;
      let totalChunks = 0;
      let details: Array<{
        source: string;
        chunkCount: number;
      }> | undefined;

      if (detail) {
        const sourceStats = new Map<string, number>();
        for (const [id, doc] of VectorStoreService.documents) {
          const source = doc.metadata?.source || 'unknown';
          sourceStats.set(source, (sourceStats.get(source) || 0) + 1);
        }
        details = Array.from(sourceStats.entries()).map(([source, chunkCount]) => ({
          source,
          chunkCount
        }));
        totalChunks = details.reduce((sum, item) => sum + item.chunkCount, 0);
      } else {
        totalChunks = totalDocuments;
      }

      return {
        totalDocuments,
        totalChunks,
        details
      };
    } catch (error) {
      console.error('获取统计信息失败', error);
      return {
        totalDocuments: 0,
        totalChunks: 0,
      };
    }
  }

  /**
   * 计算两个向量之间的余弦相似度
   * @param vecA 向量A
   * @param vecB 向量B
   * @returns 余弦相似度值（0-1之间）
   */
  private static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('向量维度不匹配');
    }

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * 清空所有存储的文档（用于测试或重置）
   */
  static async clear(): Promise<void> {
    VectorStoreService.documents.clear();
  }

  /**
   * 根据ID获取单个文档
   * @param id 文档ID
   * @returns 文档内容或undefined（如果不存在）
   */
  static async getDocument(id: string): Promise<{
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
  } | undefined> {
    return VectorStoreService.documents.get(id);
  }

  /**
   * 删除指定ID的文档
   * @param id 要删除的文档ID
   * @returns 是否删除成功
   */
  static async deleteDocument(id: string): Promise<boolean> {
    return VectorStoreService.documents.delete(id);
  }
}