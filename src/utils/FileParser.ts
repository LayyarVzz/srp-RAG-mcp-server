import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx'
import { Document } from '@langchain/core/documents';
import { FileTypeResult } from 'file-type';

// 文件解析器，适用于PDF和DOCX
export class FileParser {
    /**
     * 解析指定路径的文件为文档对象数组
     * 
     * 根据文件的 MIME 类型，将文件解析为 Document 对象数组。当前支持的文件类型包括：
     * - application/pdf (PDF 文件)
     * - application/vnd.openxmlformats-officedocument.wordprocessingml.document (DOCX 文件)
     * 
     * @param filePath 文件的绝对路径
     * @param mimeType 文件的 MIME 类型信息，用于确定解析方式
     * @returns 返回解析后的 Document 对象数组
     * @throws 当文件类型不受支持或解析过程中出现错误时抛出异常
     */
    static async parse(filePath: string, mimeType: FileTypeResult): Promise<Document[]> {
        try {
            switch (mimeType.mime) {
                case 'application/pdf':
                    return await this.parsePDF(filePath);
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    return await this.parseDOCX(filePath);
                default:
                    throw new Error(`不支持的文件类型${mimeType}`);
            }
        } catch (err) {
            throw new Error(`文件解析失败${err}`);
        }
    }

    // PDF解析函数，不暴露给外部使用
    private static async parsePDF(filePath: string): Promise<Document[]> {
        return await new PDFLoader(filePath).load();
    }

    private static async parseDOCX(filePath: string): Promise<Document[]> {
        return await new DocxLoader(filePath).load();
    }
}