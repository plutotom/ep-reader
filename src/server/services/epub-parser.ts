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
  async parseEpub(filePath: string): Promise<ParsedBook> {
    try {
      // Create parser instance for this file
      const parser = new EpubParser(filePath);
      // Parse the EPUB file
      const book = await parser.parse();
      
      // Extract metadata from top-level fields
      const title = book.titles?.[0] || "Untitled";
      const author = book.creators?.[0]?.name || book.creators?.[0] || undefined;
      const coverImage = book.cover?.href || undefined;

      // Parse content sections
      const sections = await this.parseContentSections(book);
      
      console.log("Parsed sections count:", sections.length);
      console.log("Total chapters:", this.countChapters(sections));
      
      // Log what's in book.items to understand the structure
      if (book.items) {
        console.log("book.items keys:", Object.keys(book.items).slice(0, 10));
        console.log("First item in book.items:", book.items[Object.keys(book.items)[0]]);
      }

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

    // Try to get items from the book
    let itemsToProcess: any[] = [];
    
    // First, try spines
    if (book.spines && book.spines.length > 0) {
      console.log("Using spines, count:", book.spines.length);
      itemsToProcess = book.spines;
    } 
    // If no spines, try all items and filter for HTML content
    else if (book.items) {
      console.log("No spines, using items");
      const items = Object.values(book.items);
      // Filter to only HTML/XHTML items
      itemsToProcess = items.filter((item: any) => 
        item.mediaType === 'application/xhtml+xml' || 
        item.mediaType === 'text/html' ||
        item.href?.endsWith('.html') ||
        item.href?.endsWith('.xhtml')
      );
      console.log("Filtered items count:", itemsToProcess.length);
    }
    
    // Process each item
    for (const item of itemsToProcess) {
      console.log("Processing item:", typeof item, Object.keys(item || {}));
      const content = await this.extractContent(item, book);
      if (!content) {
        console.log("Failed to extract content from item");
        continue;
      }
      console.log("Extracted content length:", content.length);

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

  private async extractContent(item: any, book?: any): Promise<string | null> {
    try {
      // If item is already a string (content)
      if (typeof item === 'string') {
        return item;
      }
      
      // Log the structure to understand what we have
      console.log("Item type:", typeof item);
      console.log("Item keys:", item ? Object.keys(item) : 'null');
      console.log("Item structure:", JSON.stringify(item, null, 2).substring(0, 500));
      
      // Try to read content using different methods
      if (item && typeof item === 'object') {
        // Log ALL methods/properties on the item
        const itemMethods = Object.getOwnPropertyNames(item).filter(name => typeof item[name] === 'function');
        console.log("Item has these methods:", itemMethods);
        
        // First, try to get content using the item ID from book.items
        if (book?.items && item.id) {
          console.log("Looking up item in book.items with ID:", item.id);
          const contentItem = book.items[item.id];
          console.log("Found item in book.items:", contentItem ? Object.keys(contentItem) : 'not found');
          
          // If found, log its methods too
          if (contentItem) {
            const contentItemMethods = Object.getOwnPropertyNames(contentItem).filter(name => typeof contentItem[name] === 'function');
            console.log("ContentItem has these methods:", contentItemMethods);
          }
          
          if (contentItem) {
            // Try different ways to get the content
            if (typeof contentItem === 'string') {
              console.log("Got content from book.items[id] as string");
              return contentItem;
            }
            
            if (contentItem.read) {
              try {
                const readResult = await contentItem.read();
                console.log("Got content from contentItem.read()");
                return typeof readResult === 'string' ? readResult : readResult?.toString();
              } catch (readErr) {
                console.log("contentItem.read() failed:", readErr);
              }
            }
            
            if (contentItem.file) {
              try {
                const file = await contentItem.file();
                const text = await file.text();
                console.log("Got content from contentItem.file().text()");
                return text;
              } catch (fileErr) {
                console.log("contentItem.file() failed:", fileErr);
              }
            }
            
            // Try buffer
            if (contentItem.buffer) {
              console.log("Got content from contentItem.buffer");
              return contentItem.buffer.toString('utf-8');
            }
          }
        }
        
        // Try reading the item itself using different possible methods
        if (typeof item.read === 'function') {
          try {
            const result = await item.read();
            console.log("Got content from item.read(), type:", typeof result);
            if (typeof result === 'string') {
              return result;
            }
            if (result?.toString) {
              return result.toString();
            }
            if (Buffer.isBuffer(result)) {
              return result.toString('utf-8');
            }
          } catch (readError) {
            console.log("item.read() failed:", readError);
          }
        }
        
        // Try item directly as content
        if (item.data) {
          console.log("Got content from item.data");
          return typeof item.data === 'string' ? item.data : item.data.toString();
        }
        
        // Try item as a Buffer
        if (Buffer.isBuffer(item)) {
          console.log("Got content from item as Buffer");
          return item.toString('utf-8');
        }
        
        // Try book.getContent if available
        if (book?.getContent && item.href) {
          try {
            const content = await book.getContent(item.href);
            console.log("Got content from book.getContent()");
            return content;
          } catch (getContentError) {
            console.log("book.getContent() failed:", getContentError);
          }
        }
        
        // Try different possible content locations
        if (item.content && typeof item.content === 'string') {
          console.log("Got content from item.content");
          return item.content;
        }
        
        if (item.text && typeof item.text === 'string') {
          console.log("Got content from item.text");
          return item.text;
        }
        
        if (item.html && typeof item.html === 'string') {
          console.log("Got content from item.html");
          return item.html;
        }
        
        // Try to get content from buffer
        if (item.buffer) {
          if (typeof item.buffer === 'string') {
            console.log("Got content from item.buffer (string)");
            return item.buffer;
          }
          if (Buffer.isBuffer(item.buffer)) {
            console.log("Got content from item.buffer (Buffer)");
            return item.buffer.toString('utf-8');
          }
        }
        
        // Try to access body if it's an element-like object
        if (item.body) {
          console.log("Got content from item.body");
          return item.body;
        }
        
        // Try href property - might need to fetch it
        if (item.href) {
          console.log("Item has href:", item.href);
        }
      }
      
      console.log("Could not extract content from item");
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
