import { FastMCP } from "fastmcp";

/**
 * 定义所有可用的提示(prompt)元信息及加载逻辑
 * 与工具保持一致的参数定义和功能描述，确保调用链路顺畅
 */
export function registerPrompts(server: FastMCP) {
  // 知识检索查询提示
  server.addPrompt({
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
    ],
    load: async (args) => {
      const context = args.context || "无额外上下文";
      const topK = args.topK || 5;
      return `基于以下信息生成检索查询词，用于调用retrieve_knowledge工具：
问题：${args.userQuestion}
上下文：${context}
返回结果数量：${topK}
要求：
1. 生成精准的检索关键词或短语，突出核心需求
2. 考虑上下文相关性，避免歧义
3. 输出格式仅保留查询词，无需额外说明`;
    }
  });

  // 检索结果总结提示
  server.addPrompt({
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
    ],
    load: async (args) => {
      return `请基于retrieve_knowledge工具的检索结果，回答用户问题：
用户问题：${args.userQuestion}
检索结果：${JSON.stringify(args.retrievalResults)}
处理规则：
1. 优先使用相似度≥0.7的结果，重要信息用引号标注
2. 标注信息来源（文档路径和片段索引）
3. 合并重复内容，按逻辑排序
4. 若结果为空或相似度均<0.7，回复"未找到足够相关的文档片段"
5. 避免编造信息，对不确定的内容需说明`;
    }
  });

  // 文档统计报告提示
  server.addPrompt({
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
    ],
    load: async (args) => {
      const detail = args.detail === "true" ? true : false;
      return `将document_statistics工具返回的统计数据转换为${detail ? '详细' : '简要'}报告：
统计数据：${JSON.stringify(args.statsData)}
报告要求：
1. ${detail ? '包含总文档数、总片段数、总存储大小及每个文档的详细信息' : '仅包含总文档数和总片段数的概览'}
2. 使用自然语言描述，避免直接罗列JSON数据
3. 格式清晰，可使用项目符号或分段说明`;
    }
  });

  // 文档上传指南提示
  server.addPrompt({
    name: "document-ingest-guide",
    description: "指导用户正确使用ingest_document工具上传文档",
    arguments: [
      {
        name: "fileType",
        description: "文档类型（如pdf、docx），用于提供对应格式的上传指引",
        required: true
      },
      {
        name: "fileUri",
        description: "文件的预签名URL示例（可选），用于生成具体的命令示例",
        required: false
      },
      {
        name: "fileBuffer",
        description: "文件的二进制数据Buffer说明（可选），用于指导直接上传场景",
        required: false
      }
    ],
    load: async (args) => {
      // 生成示例URL或Buffer占位符
      const exampleUri = args.fileUri || "https://example.com/presigned-url/document.pdf";
      const exampleBuffer = "fs.readFileSync('/path/to/your/document.pdf')";
      
      return `请指导用户使用ingest_document工具上传${args.fileType}文档：
  1. 支持两种上传方式（二选一）：
    - 预签名URL：提供文件的预签名URL（如${exampleUri}）
    - 二进制Buffer：直接传递文件的二进制数据（如${exampleBuffer}）

  2. 确认文件格式有效（仅支持PDF、DOCX）

  3. 调用示例：
  \`\`\`javascript
  // 方式1：使用预签名URL上传
  {
    "name": "ingest_document",
    "parameters": {
      "fileUri": "${exampleUri}"
    }
  }

  // 方式2：使用文件Buffer上传
  {
    "name": "ingest_document",
    "parameters": {
      "fileBuffer": ${exampleBuffer}
    }
  }
  \`\`\`

  4. 工具处理流程说明：
    - 自动获取文件内容（从URL下载或直接使用Buffer）
    - 验证文件合法性并检查是否重复上传
    - 解析文件内容并切分成片段
    - 生成向量嵌入并存储到向量数据库
    - 返回入库结果（成功/失败信息及片段数量）

  5. 常见错误处理：
    - 参数错误：必须提供fileUri或fileBuffer中的一个
    - 格式错误：确认文件未损坏且为支持的PDF/DOCX类型
    - 重复上传：相同文件无需重复入库
    - 网络错误：使用URL上传时请检查网络连接和URL有效性`;
    }
  });
}

