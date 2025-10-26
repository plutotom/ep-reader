import { EpubParser } from "@ridi/epub-parser";
import { JSDOM } from "jsdom";

export interface ParsedSection {
  title: string;
  content: string;
  wordCount: number;
  estimatedReadTime: number;
  headerLevel: number;
  chapterNumber: number;
  sectionNumber: number;
  orderIndex: number;
}

export interface ParsedBook {
  title: string;
  author?: string;
  coverImage?: string;
  sections: ParsedSection[];
  totalChapters: number;
  totalSections: number;
}

export class EpubParsingService {
  private parser: EpubParser;

  constructor() {
    this.parser = new EpubParser();
  }

  async parseEpub(filePath: string): Promise<ParsedBook> {
    try {
      // Parse the EPUB file
      const book = await this.parser.parse(filePath);
      
      // Extract metadata
      const title = book.metadata.title || "Untitled";
      const author = book.metadata.creator || book.metadata.author;
      const coverImage = book.metadata.cover;

      // Parse content sections
      const sections = await this.parseContentSections(book);

      return {
        title,
        author,
        coverImage,
        sections,
        totalChapters: this.countChapters(sections),
        totalSections: sections.length,
      };
    } catch (error) {
      console.error("Error parsing EPUB:", error);
      throw new Error(`Failed to parse EPUB: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async parseContentSections(book: any): Promise<ParsedSection[]> {
    const sections: ParsedSection[] = [];
    let orderIndex = 0;
    let chapterNumber = 1;
    let sectionNumber = 1;

    // Get all spine items (chapters)
    const spineItems = book.spine || [];
    
    for (const item of spineItems) {
      const content = await this.extractContent(item);
      if (!content) continue;

      // Parse HTML content
      const dom = new JSDOM(content);
      const document = dom.window.document;

      // Find all headers (h1, h2, h3) in order
      const headers = this.findHeaders(document);
      
      if (headers.length === 0) {
        // No headers found, treat entire content as one section
        const cleanedContent = this.cleanContent(content);
        const wordCount = this.countWords(cleanedContent);
        
        sections.push({
          title: `Chapter ${chapterNumber}`,
          content: cleanedContent,
          wordCount,
          estimatedReadTime: Math.ceil(wordCount / 200), // 200 words per minute
          headerLevel: 1,
          chapterNumber,
          sectionNumber: 1,
          orderIndex: orderIndex++,
        });
        
        chapterNumber++;
      } else {
        // Split content by headers
        const headerSections = this.splitByHeaders(document, headers);
        
        for (const section of headerSections) {
          const cleanedContent = this.cleanContent(section.content);
          const wordCount = this.countWords(cleanedContent);
          
          // If section is too long (>2000 words), try to split by next header level
          if (wordCount > 2000) {
            const subSections = this.splitLongSection(cleanedContent, section.headerLevel);
            
            for (let i = 0; i < subSections.length; i++) {
              const subSection = subSections[i];
              const subWordCount = this.countWords(subSection.content);
              
              sections.push({
                title: i === 0 ? section.title : `${section.title} (Part ${i + 1})`,
                content: subSection.content,
                wordCount: subWordCount,
                estimatedReadTime: Math.ceil(subWordCount / 200),
                headerLevel: subSection.headerLevel,
                chapterNumber,
                sectionNumber: sectionNumber++,
                orderIndex: orderIndex++,
              });
            }
          } else {
            sections.push({
              title: section.title,
              content: cleanedContent,
              wordCount,
              estimatedReadTime: Math.ceil(wordCount / 200),
              headerLevel: section.headerLevel,
              chapterNumber,
              sectionNumber: sectionNumber++,
              orderIndex: orderIndex++,
            });
          }
        }
        
        chapterNumber++;
      }
    }

    return sections;
  }

  private async extractContent(item: any): Promise<string | null> {
    try {
      // Extract content from spine item
      if (typeof item === 'string') {
        return item;
      }
      
      if (item && item.content) {
        return item.content;
      }
      
      return null;
    } catch (error) {
      console.error("Error extracting content:", error);
      return null;
    }
  }

  private findHeaders(document: Document): Array<{ element: Element; level: number; text: string }> {
    const headers: Array<{ element: Element; level: number; text: string }> = [];
    
    // Find h1, h2, h3 elements
    for (let level = 1; level <= 3; level++) {
      const elements = document.querySelectorAll(`h${level}`);
      elements.forEach((element) => {
        headers.push({
          element,
          level,
          text: element.textContent?.trim() || "",
        });
      });
    }
    
    // Sort by document order
    return headers.sort((a, b) => {
      const position = a.element.compareDocumentPosition(b.element);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  }

  private splitByHeaders(document: Document, headers: Array<{ element: Element; level: number; text: string }>): Array<{ title: string; content: string; headerLevel: number }> {
    const sections: Array<{ title: string; content: string; headerLevel: number }> = [];
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const nextHeader = headers[i + 1];
      
      // Get content between this header and the next
      let content = "";
      
      if (nextHeader) {
        // Get all content between headers
        const range = document.createRange();
        range.setStartAfter(header.element);
        range.setEndBefore(nextHeader.element);
        content = range.extractContents().textContent || "";
      } else {
        // Last header, get all content after it
        const range = document.createRange();
        range.setStartAfter(header.element);
        range.setEnd(document.body, document.body.childNodes.length);
        content = range.extractContents().textContent || "";
      }
      
      sections.push({
        title: header.text,
        content,
        headerLevel: header.level,
      });
    }
    
    return sections;
  }

  private splitLongSection(content: string, currentLevel: number): Array<{ title: string; content: string; headerLevel: number }> {
    const dom = new JSDOM(content);
    const document = dom.window.document;
    
    // Look for next header level (h2 if current is h1, h3 if current is h2)
    const nextLevel = Math.min(currentLevel + 1, 3);
    const nextHeaders = document.querySelectorAll(`h${nextLevel}`);
    
    if (nextHeaders.length === 0) {
      // No sub-headers found, return as single section
      return [{ title: "Section", content, headerLevel: currentLevel }];
    }
    
    const sections: Array<{ title: string; content: string; headerLevel: number }> = [];
    let currentContent = content;
    
    for (let i = 0; i < nextHeaders.length; i++) {
      const header = nextHeaders[i];
      const nextHeader = nextHeaders[i + 1];
      
      // Extract content for this sub-section
      const range = document.createRange();
      if (i === 0) {
        range.setStart(document.body, 0);
      } else {
        range.setStartAfter(nextHeaders[i - 1]);
      }
      
      if (nextHeader) {
        range.setEndBefore(nextHeader);
      } else {
        range.setEnd(document.body, document.body.childNodes.length);
      }
      
      const sectionContent = range.extractContents().textContent || "";
      
      sections.push({
        title: header.textContent?.trim() || `Part ${i + 1}`,
        content: sectionContent,
        headerLevel: nextLevel,
      });
    }
    
    return sections;
  }

  private cleanContent(content: string): string {
    const dom = new JSDOM(content);
    const document = dom.window.document;
    
    // Remove navigation elements
    const navElements = document.querySelectorAll('nav, .nav, .navigation, .toc, .table-of-contents');
    navElements.forEach(el => el.remove());
    
    // Remove script tags
    const scripts = document.querySelectorAll('script');
    scripts.forEach(el => el.remove());
    
    // Remove style tags (keep inline styles)
    const styles = document.querySelectorAll('style');
    styles.forEach(el => el.remove());
    
    // Resize images for mobile
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.setAttribute('style', 'max-width: 100%; height: auto;');
      img.setAttribute('loading', 'lazy');
    });
    
    // Clean up empty paragraphs
    const paragraphs = document.querySelectorAll('p');
    paragraphs.forEach(p => {
      if (!p.textContent?.trim()) {
        p.remove();
      }
    });
    
    return document.body.innerHTML;
  }

  private countWords(content: string): number {
    // Remove HTML tags and count words
    const textContent = content.replace(/<[^>]*>/g, ' ');
    const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }

  private countChapters(sections: ParsedSection[]): number {
    const chapterNumbers = new Set(sections.map(s => s.chapterNumber));
    return chapterNumbers.size;
  }
}
