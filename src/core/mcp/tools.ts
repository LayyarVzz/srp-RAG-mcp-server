import { FastMCP, TextContent } from 'fastmcp';
import { z } from "zod";
import { fileTypeFromFile } from 'file-type';
// 引入工具和服务
import { FileParser } from '../../utils/FileParser.js';
import { TextSplitter } from '../../utils/TextSplitter.js';
import { EmbeddingService } from '../services/EmbeddingService.js';
import { VectorStoreService } from '../services/VectorStoreService.js';
import { FileService } from '../services/FileService.js';

// 注册工具函数
export function registerTools(server: FastMCP) {
    // 文档入库工具
    server.addTool({
        name: 'ingest_document',
        description: '上传 PDF/DOCX 并解析入库（支持预签名URL或文件Buffer）',
        parameters: z.object({
            fileUri: z.string().url().optional().describe("文件的预签名URL，用于下载文件"),
            fileBuffer: z.instanceof(Buffer).optional().describe("文件的二进制数据Buffer"),
        }).refine(data => data.fileUri || data.fileBuffer, {
            message: "必须提供fileUri或fileBuffer中的一个"
        }),
        execute: async (param) => {
            try {
                // 0.初始化文件服务
                await FileService.init();
                
                // 1. 获取文件Buffer
                let fileBuffer: Buffer;
                if (param.fileUri) {
                    fileBuffer = await FileService.downloadFromUri(param.fileUri);
                } else {
                    fileBuffer = param.fileBuffer!; 
                }

                // 2. 验证文件合法性
                const { valid, mimeType } = await FileService.validateFile(fileBuffer);
                if (!valid) {
                    throw new Error("不支持的文件类型，仅允许PDF和DOCX");
                }
                // 若mimeType为空（理论上valid为true时不会出现，此处做双重保障）
                if (!mimeType) {
                    throw new Error("文件类型验证异常，无法获取有效MIME类型");
                }

                // 3. 检查重复文件
                if (await FileService.isDuplicate(fileBuffer)) {
                    throw new Error("该文件已上传过，无需重复入库");
                }

                // 4. 保存文件到本地docs目录
                const localFilePath = await FileService.saveFile(fileBuffer, mimeType);

                // 5. 文档解析
                const documents = await FileParser.parse(localFilePath, mimeType);
                if (documents.length === 0) {
                    throw new Error("文件解析为空内容");
                }

                // 6. 合并文档内容并切分
                const fullText = documents.map(doc => doc.pageContent).join('\n');
                const chunks = await TextSplitter.split(fullText);
                if (chunks.length === 0) {
                    throw new Error("文本切分后无内容");
                }

                // 7. 生成向量并入库
                const embeddings = await EmbeddingService.embedDocuments(chunks);
                const docsToStore = chunks.map((content, index) => ({
                    content,
                    embedding: embeddings[index],
                    metadata: {
                        source: param.fileUri || '直接上传', // 记录原始来源
                        localPath: localFilePath,
                        chunkIndex: index,
                        totalChunks: chunks.length,
                        pageNumber: documents.find(doc => doc.pageContent.includes(content))?.metadata?.page || '未知'
                    }
                }));

                const result = await VectorStoreService.addDocuments({ documents: docsToStore });
                if (result.success) {
                    return `文档入库成功！来源：${param.fileUri || '直接上传'}，生成片段数：${chunks.length}，存储ID：${result.ids?.join(',') || '未知'}`;
                } else {
                    throw new Error("向量数据库存储失败");
                }
            } catch (err) {
                return `文档入库失败：${(err as Error).message}`;
            }
        }
    });

    // 文档检索工具
    server.addTool({
        name: 'retrieve_knowledge',
        description: '根据用户提出的问题，从内部知识库中检索最相关的文档片段，用于辅助回答。',
        parameters: z.object({
            query: z.string().describe("用户的查询问题文本"),
            topK: z.number().int().min(1).max(20).default(5).describe("返回的最相关片段数量，默认5条")
        }),
        execute: async (params) => {
            try {
                // 1. 生成查询向量
                const queryEmbedding = await EmbeddingService.embedQuery(params.query);

                // 2. 检索相似文档
                const results = await VectorStoreService.similaritySearch({
                    queryEmbedding,
                    topK: params.topK
                });

                // 3. 格式化返回结果为TextContent类型
                const content = results.map((item, index) => ({
                    序号: index + 1,
                    内容: item.content,
                    相似度: item.score.toFixed(4),
                    来源: item.metadata.source,
                    片段索引: item.metadata.chunkIndex
                }));

                return {
                    type: "text",
                    text: JSON.stringify(content, null, 2)
                } as TextContent;
            } catch (err) {
                return {
                    type: "text",
                    text: `知识检索失败：${(err as Error).message}`
                } as TextContent;
            }
        }
    });

    // 文档统计工具
    server.addTool({
        name: 'document_statistics',
        description: '获取知识库中文档的统计信息，包括总文档数、总片段数等',
        parameters: z.object({
            detail: z.boolean().default(false).describe("是否返回详细统计信息，默认false")
        }),
        execute: async (params) => {
            try {
                const stats = await VectorStoreService.getStatistics(params.detail);
                const result = {
                    统计信息: {
                        总文档数: stats.totalDocuments,
                        总片段数: stats.totalChunks,
                        总存储大小: stats.totalSize ? `${stats.totalSize} 字节` : '未统计',
                        ...(params.detail && {
                            详细信息: stats.details?.map((doc, index) => ({
                                序号: index + 1,
                                文档路径: doc.source,
                                片段数量: doc.chunkCount
                            }))
                        })
                    }
                };

                return {
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                } as TextContent;
            } catch (err) {
                return {
                    type: "text",
                    text: `统计信息获取失败：${(err as Error).message}`
                } as TextContent;
            }
        }
    });
}