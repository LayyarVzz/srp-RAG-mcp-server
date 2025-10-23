/**
 * 嵌入服务：负责将文本转换为向量表示
 */
import axios from "axios";
export class EmbeddingService {
  private apiUrl:'http://localhost:3000/v1';//设置API基础URL
  private model:'nomic-embed-text'//设置模型名称

  /**
   * 批量将文本片段转换为向量
   * @param chunks 分块后的文本数组
   * @returns 向量数组（每个元素对应一个文本片段的嵌入向量）
   */
  async embedDocuments(chunks: string[]): Promise<number[][]> {
    // 实现逻辑：调用嵌入模型（如通过OneAPI对接OpenAI/本地模型）
    try{
      // 发送POST请求
      const response = await axios.post("http://localhost:3000/v1/embeddings", {
        // 
        input: chunks,
        model: "向量化模型的名称",
      }, {
        headers: {
          // 指定内容为JSON格式
          'Content-Type': "application/json",
        },
      });

      // 返回一个数组
      // 获取返回的响应数据中提取data里面的embedding字段
      // 用map() 方法用于将每个响应项转换为其嵌入向量
      return response.data.data.map((item: any) => item.embedding);
    }
    catch (error) {
    // 捕获 try 块中可能发生的异常
    
      // 在控制台输出错误信息
      console.error('Embedding documents failed:', error);
      throw new Error(`嵌入文档失败: ${(error as Error).message}`);
      // 抛出自定义错误，包含原始错误信息
    }
    
  }

  /**
   * 将单个查询文本转换为向量
   * @param query 用户的查询文本
   * @returns 单个向量（查询文本的嵌入表示）
   */
  async embedQuery(query: string): Promise<number[]> {
    // 实现逻辑：调用嵌入模型处理单条查询
    try{
      const response = await axios.post("http://localhost:3000/v1/embeddings", {
        input: query,
        model: "向量化模型的名称",
      },
       {
        //请求配置项
        headers: {
          'Content-Type': "application/json",
        },
      });
      // 提取第一个元素的嵌入向量
      return response.data.data[0].embedding;
  }catch (error) {
    console.error('Embedding query failed:', error);
    throw new Error(`嵌入查询失败: ${(error as Error).message}`);
  }
}
}