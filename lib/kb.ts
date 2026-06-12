import { promises as fs } from 'fs';
import path from 'path';

const KB_DIR = path.join(process.cwd(), 'knowledge_base', 'workflows');

export async function checkKbExists(category: string): Promise<boolean> {
  try {
    const filePath = path.join(KB_DIR, `${category.toLowerCase()}.md`);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getKbContent(category?: string): Promise<string> {
  try {
    if (category) {
      const filePath = path.join(KB_DIR, `${category.toLowerCase()}.md`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return `[CATEGORY: ${category.toUpperCase()} | FILE: ${category.toLowerCase()}.md]\n${content}`;
      } catch {
        return '';
      }
    }

    // Read all .md files
    let files: string[];
    try {
      files = await fs.readdir(KB_DIR);
    } catch {
      return '';
    }

    const mdFiles = files.filter((f) => f.endsWith('.md'));
    if (mdFiles.length === 0) return '';

    const parts: string[] = [];
    for (const file of mdFiles) {
      const filePath = path.join(KB_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const cat = file.replace('.md', '').toUpperCase();
      parts.push(`[CATEGORY: ${cat} | FILE: ${file}]\n${content}`);
    }
    return parts.join('\n\n');
  } catch {
    return '';
  }
}

export async function serveKbImage(filename: string): Promise<Buffer | null> {
  try {
    const imgPath = path.join(process.cwd(), 'knowledge_base', 'images', filename);
    return await fs.readFile(imgPath);
  } catch {
    return null;
  }
}
