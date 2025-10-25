import fs from 'fs/promises';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import axios from 'axios';

// 定义支持的MIME类型
export type SupportedMimeType = 
  | 'application/pdf' 
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export class FileService {
    // 文档存储目录
    private static DOCS_DIR = path.resolve(__dirname, '../docs');

    // 初始化：创建文档目录
    static async init() {
        await fs.mkdir(this.DOCS_DIR, { recursive: true });
    }

    // 从URL下载文件
    static async downloadFromUri(uri: string): Promise<Buffer> {
        try {
            const response = await axios.get(uri, { responseType: 'arraybuffer' });
            return Buffer.from(response.data);
        } catch (err) {
            throw new Error(`从URL下载文件失败: ${(err as Error).message}`);
        }
    }

    // 验证文件类型（仅允许PDF和DOCX）
    static async validateFile(
        buffer: Buffer
    ): Promise<{ valid: boolean; mimeType: SupportedMimeType | '' }> {
        const fileType = await fileTypeFromBuffer(buffer);
        if (!fileType) return { valid: false, mimeType: '' };
        
        const allowedTypes: SupportedMimeType[] = [
            'application/pdf', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        const isValid = allowedTypes.includes(fileType.mime as SupportedMimeType);
        return {
            valid: isValid,
            mimeType: isValid ? (fileType.mime as SupportedMimeType) : ''
        };
    }

    // 检查文件是否重复（通过哈希值判断）
    static async isDuplicate(buffer: Buffer): Promise<boolean> {
        const { createHash } = await import('crypto');
        const hash = createHash('sha256').update(buffer).digest('hex');
        const hashPath = path.join(this.DOCS_DIR, '.hashes');
        
        await fs.mkdir(hashPath, { recursive: true });
        const hashFile = path.join(hashPath, hash);
        
        if (await fs.access(hashFile).then(() => true).catch(() => false)) {
            return true; // 已存在相同文件
        }
        
        await fs.writeFile(hashFile, ''); // 记录哈希值
        return false;
    }

    // 保存文件到本地docs目录
    static async saveFile(
        buffer: Buffer, 
        mimeType: SupportedMimeType
    ): Promise<string> {
        const ext = mimeType === 'application/pdf' ? 'pdf' : 'docx';
        const filename = `${Date.now()}.${ext}`;
        const filePath = path.join(this.DOCS_DIR, filename);
        
        await fs.writeFile(filePath, buffer);
        return filePath;
    }
}