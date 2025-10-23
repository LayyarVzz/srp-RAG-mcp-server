/**
 * 向量存储服务：负责向量的存储、检索和统计
 */
export class VectorStoreService {
  // 使用Map来存储文档片段及其向量和元数据,key为文档ID，值为包含内容、向量和元数据的对象
  private documents:Map<string, {
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
  }>=new Map();

  /**
   * 存储文档片段及对应向量
   * @param params 包含多个文档片段的数组，每个片段含文本、向量和元数据
   * @returns 存储结果（是否成功及可选的文档ID）
   */
  async addDocuments(params: {
    documents: Array<{
      content: string;       // 文本片段内容
      embedding: number[];   // 文本对应的向量
      metadata: Record<string, any>; // 元数据（如来源、分块索引等）
    }>;
  }): Promise<{
    success: boolean;
    ids?: string[]; // 可选：存储后生成的文档ID数组
  }> {
    // 实现逻辑：对接向量数据库（如Qdrant）的插入接口
    try{
      // 创建一个数组存储文档ID
      const ids:string[]=[];
      // 遍历传入的文档片段
      for(const doc of params.documents){
        // 为每一个文档生成随机ID,时间+数字or字母组合
        const id= `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 将文档存储到Map中
        this.documents.set(id,{
          content: doc.content,
          embedding: doc.embedding,
          metadata: doc.metadata,
        });

        // 将文档ID添加到ID数组中
        ids.push(id);
      }

      // 返回存储成功及文档ID数组
      return {
        success: true,
        ids:ids
      };
    }catch (error){
      console.error('添加文档失败',error);
      // throw new Error("addDocuments 方法未实现");
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
  async similaritySearch(params: {
    queryEmbedding: number[]; // 查询文本的向量
    topK: number; // 返回的最相似结果数量
  }): Promise<Array<{
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
    score: number; // 相似度分数（0-1，值越高越相似）
  }>> {
    // 实现逻辑：调用向量数据库的相似性搜索接口
    try{
      // 创建数组存储文档及其相似度分数
      const similarities:Array<{ 
        content: string;
        embedding: number[];
        metadata: Record<string, any>;
        score: number;
      }> = [];

      // 遍历所有文档
      for(const [id, doc] of this.documents){
        // 计算文档向量与查询向量的相似度分数
        const score = this.cosineSimilarity(doc.embedding, params.queryEmbedding);

        // 将文档及其相似度分数添加到结果数组中
        similarities.push({
          content: doc.content,
          embedding: doc.embedding,
          metadata: doc.metadata,
          score: score,
        });
      }

      // 根据相似度分数对结果进行排序,降序
      similarities.sort((a, b) => b.score - a.score);

      // 返回相似度排序后的结果
      return similarities;


    }catch (error){
      console.error('相似性检索失败',error);
      // throw new Error("similaritySearch 方法未实现");
      return [];
    }
    
  }

  /**
   * 统计知识库信息
   * @param detail 是否返回详细统计（如每个文档的片段数）
   * @returns 统计结果（总文档数、总片段数等）
   */
  async getStatistics(detail: boolean = false): Promise<{
    totalDocuments: number; // 总文档数
    totalChunks: number;    // 总片段数
    totalSize?: number;     // 可选：总存储大小（字节）
    details?: Array<{       // 可选：详细统计（当detail为true时）
      source: string;       // 文档来源路径
      chunkCount: number;   // 该文档的片段数
    }>;
  }> {
    try{
      // 获取文档总数
      const totalDocuments = this.documents.size;
      // 初始化总片段数
      let totalChunks = 0;
      // 初始化详细统计数组
      let details: Array<{
        source: string;
        chunkCount: number;      
    }>|undefined;

    // 如果需要详细统计
    if(detail){
      // 创建一个Map来统计每个文档的片段数
      const sourceStats = new Map<string, number>();
      
      // 遍历所有文档
      for(const [id, doc] of this.documents){
        // 从元数据中获取来源信息
        const source = doc.metadata?.source || 'unknown';

        // 更新该来源的片段计数
        sourceStats.set(source, (sourceStats.get(source) || 0) + 1);
      }

      // Map转换为数组形式
      details = Array.from(sourceStats.entries()).map(([source, chunkCount]) => ({
        source: source,
        chunkCount: chunkCount,
      }));

      // 计算片段数
      totalChunks = details.reduce((sum,item)=>sum+item.chunkCount,0);
    }
    else{
      //不需要详细信息的情况下,总片段数等于文档总数
      totalChunks = totalDocuments;
    }

    // 返回统计结果
    return{
      totalDocuments: totalDocuments,
      totalChunks: totalChunks,
      details: details,
    };
  }catch (error){
    console.error('获取统计信息失败',error);
    // throw new Error("getStatistics 方法未实现");
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
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    // 检查向量维度是否一致
    if (vecA.length !== vecB.length) {
      throw new Error('向量维度不匹配');
    }
    
    // 计算点积（两个向量对应元素相乘后求和）
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    
    // 计算向量A的模长（各元素平方和的平方根）
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    
    // 计算向量B的模长（各元素平方和的平方根）
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    
    // 处理零向量的情况（避免除零错误）
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    // 返回余弦相似度（点积除以两向量模长的乘积）
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * 清空所有存储的文档（用于测试或重置）
   */
  async clear(): Promise<void> {
    // 清空 Map 中的所有文档
    this.documents.clear();
  }

  /**
   * 根据ID获取单个文档
   * @param id 文档ID
   * @returns 文档内容或undefined（如果不存在）
   */
  async getDocument(id: string): Promise<{
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
  } | undefined> {
    // 从 Map 中获取指定ID的文档
    return this.documents.get(id);
  }

  /**
   * 删除指定ID的文档
   * @param id 要删除的文档ID
   * @returns 是否删除成功
   */
  async deleteDocument(id: string): Promise<boolean> {
    // 从 Map 中删除指定ID的文档，返回是否删除成功
    return this.documents.delete(id);
  }
}

