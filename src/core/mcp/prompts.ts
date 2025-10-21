import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

/**
 * 定义所有可用的提示(prompt)元信息集合
 * 与工具保持一致的参数定义和功能描述，确保调用链路顺畅
 */
const PROMPTS = {
  "knowledge-retrieval-query": {
    name: "knowledge-retrieval-query",
    description: "基于用户问题生成检索关键词，用于调用retrieve_knowledge工具",
    arguments: [
      {
        name: "userQuestion",
        description: "用户的原始问题，将用于生成检索查询词",
        required: true
      },
      {
        name: "context",
        description: "对话上下文（可选），用于优化检索关键词的准确性",
        required: false
      },
      {
        name: "topK",
        description: "返回的最相关片段数量，默认5条（1-20之间）",
        required: false
      }
    ]
  },
  "retrieval-result-summary": {
    name: "retrieval-result-summary",
    description: "将retrieve_knowledge工具返回的文档片段整理为自然语言回答",
    arguments: [
      {
        name: "retrievalResults",
        description: "retrieve_knowledge工具返回的文档片段列表（包含内容、相似度和来源）",
        required: true
      },
      {
        name: "userQuestion",
        description: "用户的原始问题，用于聚焦回答重点",
        required: true
      }
    ]
  },
  "document-statistics-report": {
    name: "document-statistics-report",
    description: "将document_statistics工具返回的统计数据格式化为可读报告",
    arguments: [
      {
        name: "statsData",
        description: "document_statistics工具返回的原始统计数据",
        required: true
      },
      {
        name: "detail",
        description: "是否需要详细报告（true/false），与工具参数保持一致",
        required: false
      }
    ]
  },
  "document-ingest-guide": {
    name: "document-ingest-guide",
    description: "指导用户正确使用ingest_document工具上传文档",
    arguments: [
      {
        name: "fileType",
        description: "文档类型（如pdf、docx），用于提供对应格式的上传指引",
        required: true
      },
      {
        name: "filePath",
        description: "文档的绝对路径（可选），用于生成具体的命令示例",
        required: false
      }
    ]
  }
};

/**
 * 创建 Server 实例，配置服务基本信息和能力
 * - 与工具服务保持功能对齐，明确支持文档处理全流程
 */
const server = new Server({
  name: "document-qa-prompts-server",
  version: "1.0.0"
}, {
  capabilities: {
    prompts: {}
  }
});

/**
 * 设置列表提示请求处理器
 * 返回所有可用提示，客户端可据此选择合适的提示模板
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: Object.values(PROMPTS)
  };
});

/**
 * 设置获取单个提示请求处理器
 * 根据工具特性动态生成提示内容，确保参数和格式匹配
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const promptName = request.params.name;
  const prompt = PROMPTS[promptName as keyof typeof PROMPTS];
  
  if (!prompt) {
    throw new Error(`未找到 prompt: ${promptName}`);
  }

  const args = request.params.arguments || {};

  switch (promptName) {
    case "knowledge-retrieval-query":
      // 与retrieve_knowledge工具参数对齐，增加topK配置
      const context = args.context || "无额外上下文";
      const topK = args.topK || 5;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `基于以下信息生成检索查询词，用于调用retrieve_knowledge工具：
问题：${args.userQuestion}
上下文：${context}
返回结果数量：${topK}
要求：
1. 生成精准的检索关键词或短语，突出核心需求
2. 考虑上下文相关性，避免歧义
3. 输出格式仅保留查询词，无需额外说明`
            }
          }
        ]
      };

    case "retrieval-result-summary":
      // 适配retrieve_knowledge返回的结构化数据（包含序号、相似度、来源等）
      return {
        messages: [
          {
            role: "system",
            content: {
              type: "text",
              text: `请基于retrieve_knowledge工具的检索结果，回答用户问题：
用户问题：${args.userQuestion}
检索结果：${JSON.stringify(args.retrievalResults)}
处理规则：
1. 优先使用相似度≥0.7的结果，重要信息用引号标注
2. 标注信息来源（文档路径和片段索引）
3. 合并重复内容，按逻辑排序
4. 若结果为空或相似度均<0.7，回复"未找到足够相关的文档片段"
5. 避免编造信息，对不确定的内容需说明`
            }
          }
        ]
      };

    case "document-statistics-report":
      // 与document_statistics工具的detail参数联动
      const detail = args.detail === "true" ? true : false;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `将document_statistics工具返回的统计数据转换为${detail ? '详细' : '简要'}报告：
统计数据：${JSON.stringify(args.statsData)}
报告要求：
1. ${detail ? '包含总文档数、总片段数、总存储大小及每个文档的详细信息' : '仅包含总文档数和总片段数的概览'}
2. 使用自然语言描述，避免直接罗列JSON数据
3. 格式清晰，可使用项目符号或分段说明`
            }
          }
        ]
      };

    case "document-ingest-guide":
      // 适配ingest_document工具的文件处理流程
      const examplePath = args.filePath || "/path/to/your/document.pdf";
      return {
        messages: [
          {
            role: "system",
            content: {
              type: "text",
              text: `请指导用户使用ingest_document工具上传${args.fileType}文档：
1. 确保文件路径为绝对路径，例如：${examplePath}
2. 确认文件格式有效（支持PDF、DOCX）
3. 调用示例：
\`\`\`javascript
// 工具调用参数
{
  "name": "ingest_document",
  "parameters": {
    "filePath": "${examplePath}"
  }
}
\`\`\`
4. 工具处理流程说明：
   - 自动识别文件类型并解析内容
   - 文本切分后生成向量嵌入
   - 存储到向量数据库并返回片段数量
5. 常见错误处理：
   - 路径错误：检查文件是否存在及权限
   - 格式错误：确认文件未损坏且为支持类型`
            }
          }
        ]
      };

    default:
      throw new Error("未实现的 prompt");
  }
});

// 导出 server 实例
export { server as promptServer };