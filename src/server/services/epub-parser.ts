import { parseEpub } from "@gxl/epub-parser";
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
      // Parse the EPUB file
      const epubObj = await parseEpub(filePath, {
        type: "path",
      });

      // Extract metadata
      const title = epubObj.info?.title || "Untitled";
      const author = epubObj.info?.author || undefined;
      // const coverImage = epubObj.info?. || undefined;
      const coverImage = undefined;

      console.log("EPUB metadata:", { title, author, coverImage });
      // console.log("Full epubObj keys:", Object.keys(epubObj));
      // console.log("epubObj.sections:", epubObj.sections);
      console.log("epubObj.structure:", epubObj.structure);

      // Parse content sections from the structure (TOC)
      const sections = await this.parseContentSections(epubObj);

      console.log("Parsed sections count:", sections.length);
      console.log("Total chapters:", this.countChapters(sections));

      // Verify sections before returning
      console.log("Sections array length in return:", sections.length);
      if (sections.length > 0) {
        console.log(
          "First section in return:",
          sections[0]?.title,
          sections[0]?.wordCount,
        );
      }

      const result = {
        title,
        author,
        coverImage,
        sections,
        totalChapters: this.countChapters(sections),
        totalSections: sections.length,
      };

      console.log("Result object sections count:", result.sections.length);
      return result;
    } catch (error) {
      console.error("Error parsing EPUB:", error);
      throw new Error(
        `Failed to parse EPUB: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async parseContentSections(epubObj: any): Promise<ParsedSection[]> {
    const sections: ParsedSection[] = [];
    let orderIndex = 0;
    let chapterNumber = 1;
    let sectionNumber = 1;

    // Get sections from the EPUB object
    const epubSections = epubObj.sections || [];
    const structure = epubObj.structure || [];

    console.log("EPUB sections count:", epubSections.length);
    console.log("EPUB structure count:", structure.length);
    console.log(
      "First section IDs:",
      epubSections.slice(0, 3).map((s: any) => s.id),
    );
    console.log(
      "Structure sample:",
      JSON.stringify(structure[0], null, 2).substring(0, 500),
    );

    // Traverse the structure (TOC) to get sections in order
    const processNavPoints = (navPoints: any[], level: number = 1) => {
      for (const navPoint of navPoints) {
        const sectionId = navPoint.sectionId;
        const name = navPoint.name;
        console.log(
          `Processing nav point: ${name}, sectionId: ${sectionId}, level: ${level}`,
        );

        if (sectionId) {
          // Find the section by ID
          const section = epubSections.find((s: any) => s.id === sectionId);
          console.log(
            `Found section: ${!!section}, section has toHtmlObjects: ${!!section?.toHtmlObjects}`,
          );

          if (section) {
            try {
              let htmlContent = "";

              // Try toHtmlObjects first
              if (typeof section.toHtmlObjects === "function") {
                const htmlObjects = section.toHtmlObjects();
                for (const obj of htmlObjects) {
                  if (obj.html) {
                    htmlContent += obj.html;
                  }
                }
              }

              // Fallback to section's raw HTML
              if (!htmlContent && section.htmlString) {
                htmlContent = section.htmlString;
              }

              // Try markdown conversion as another fallback
              if (!htmlContent && typeof section.toMarkdown === "function") {
                const markdown = section.toMarkdown();
                // Convert markdown to HTML (basic conversion)
                htmlContent = `<div>${markdown.content}</div>`;
              }

              if (htmlContent) {
                const cleanedContent = this.cleanContent(htmlContent);
                const wordCount = this.countWords(cleanedContent);

                // Determine section title
                const sectionTitle = name || `Section ${sectionNumber}`;

                console.log(
                  `Adding section: ${sectionTitle}, wordCount: ${wordCount}`,
                );

                sections.push({
                  title: sectionTitle,
                  content: cleanedContent,
                  wordCount,
                  estimatedReadTime: Math.ceil(wordCount / 200),
                  headerLevel: level,
                  chapterNumber:
                    level === 1
                      ? chapterNumber
                      : Math.floor(sectionNumber / 10) || 1,
                  sectionNumber: sectionNumber++,
                  orderIndex: orderIndex++,
                });

                if (level === 1) {
                  chapterNumber++;
                }
              } else {
                console.log(`No HTML content for section ${name || sectionId}`);
              }
            } catch (error) {
              console.error(`Error processing section ${sectionId}:`, error);
            }
          }
        }

        // Process children recursively
        if (navPoint.children && navPoint.children.length > 0) {
          processNavPoints(navPoint.children, level + 1);
        }
      }
    };

    // Start processing from the root structure
    if (structure.length > 0) {
      console.log("Starting to process structure");
      processNavPoints(structure);
      console.log(`Processed ${sections.length} sections from structure`);
    }

    // If structure produced nothing, or there was no structure, fall back to spine sections
    if (sections.length === 0) {
      console.log("Falling back to processing sections directly from spine");
      // Fallback: process sections directly if no structure
      for (const section of epubSections) {
        try {
          const htmlObjects = section.toHtmlObjects?.() || [];
          let htmlContent = "";

          for (const obj of htmlObjects) {
            if (obj.html) {
              htmlContent += obj.html;
            }
          }

          if (!htmlContent && section.html) {
            htmlContent = section.html;
          }
          if (!htmlContent && section.htmlString) {
            htmlContent = section.htmlString;
          }

          if (htmlContent) {
            const cleanedContent = this.cleanContent(htmlContent);
            const wordCount = this.countWords(cleanedContent);

            // try to infer a title: first h1/h2/h3 text, else fallback
            const dom = new JSDOM(cleanedContent);
            const doc = dom.window.document;
            const inferredTitle =
              doc.querySelector("h1, h2, h3")?.textContent?.trim() ||
              `Section ${sectionNumber}`;

            sections.push({
              title: inferredTitle,
              content: cleanedContent,
              wordCount,
              estimatedReadTime: Math.ceil(wordCount / 200),
              headerLevel: 1,
              chapterNumber: chapterNumber++,
              sectionNumber: sectionNumber++,
              orderIndex: orderIndex++,
            });
          }
        } catch (error) {
          console.error("Error processing section:", error);
        }
      }
    }

    console.log(
      `Returning ${sections.length} sections from parseContentSections`,
    );
    return sections;
  }

  private cleanContent(content: string): string {
    const dom = new JSDOM(content);
    const document = dom.window.document;

    // Remove navigation elements
    const navElements = document.querySelectorAll(
      "nav, .nav, .navigation, .toc, .table-of-contents",
    );
    navElements.forEach((el) => el.remove());

    // Remove script tags
    const scripts = document.querySelectorAll("script");
    scripts.forEach((el) => el.remove());

    // Remove style tags (keep inline styles)
    const styles = document.querySelectorAll("style");
    styles.forEach((el) => el.remove());

    // Resize images for mobile
    const images = document.querySelectorAll("img");
    images.forEach((img) => {
      img.setAttribute("style", "max-width: 100%; height: auto;");
      img.setAttribute("loading", "lazy");
    });

    // Clean up empty paragraphs
    const paragraphs = document.querySelectorAll("p");
    paragraphs.forEach((p) => {
      if (!p.textContent?.trim()) {
        p.remove();
      }
    });

    return document.body.innerHTML;
  }

  private countWords(content: string): number {
    // Remove HTML tags and count words
    const textContent = content.replace(/<[^>]*>/g, " ");
    const words = textContent
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    return words.length;
  }

  private countChapters(sections: ParsedSection[]): number {
    const chapterNumbers = new Set(sections.map((s) => s.chapterNumber));
    return chapterNumbers.size;
  }
}
