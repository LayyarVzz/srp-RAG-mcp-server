import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx'
import { Document } from '@langchain/core/documents';
import { FileTypeResult } from 'file-type';

// 文件解析器，适用于PDF和DOCX
export class FileParser {
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

    // PDF解析函数
    private static async parsePDF(filePath: string): Promise<Document[]> {
        return await new PDFLoader(filePath).load();
    }

    private static async parseDOCX(filePath: string): Promise<Document[]> {
        return await new DocxLoader(filePath).load();
    }
}