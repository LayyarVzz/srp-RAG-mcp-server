import { FastMCP } from 'fastmcp';
import { z } from "zod";

// 注册工具函数
export function registerTools(server: FastMCP) {

    // 文档入库工具
    server.addTool({
        name: 'ingest_document',
        description: '上传 PDF/DOCX 并解析入库',
        parameters: z.object({
            filePath: z.string().describe("文档文件的路径"),
        }),
        execute: async param => {

        }
    });

    // 文档检索工具
    server.addTool({
        name: 'retrieve_knowledge',
        description: '根据用户提出的问题，从内部知识库中检索最相关的文档片段，用于辅助回答。',
        parameters: z.object({
            name: z.string(),
            age: z.number()
        }),
        execute: async params => { }
    })

    // 文档统计工具
    server.addTool({
        name: '',
        description: '',
        parameters: z.string(),
        execute: async params => { }
    })
}