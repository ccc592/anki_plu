import type { HeuristicToggles } from '@messaging/schemas';

export interface DetectionOptions {
  heuristics: HeuristicToggles;
  maxPairs?: number;
}

export interface DetectedPair {
  frontHtml: string;
  backHtml: string;
  confidence: number;
  strategy: 'explicit' | 'structure' | 'questionMark' | 'list';
}

type Block = {
  element: Element;
  text: string;
};

const EXPLICIT_QUESTION = /^(?:q\s*:|question\s*:|问\s*[：: ]|问题\s*[：:])/i;
const EXPLICIT_ANSWER = /^(?:a\s*:|answer\s*:|答\s*[：: ]|答案\s*[：:])/i;
// Cleanup patterns without ^ anchor - for removing markers anywhere in text
const QUESTION_MARKER_CLEANUP = /(?:q\s*:|question\s*:|问\s*[：: ]|问题\s*[：:])/gi;
const ANSWER_MARKER_CLEANUP = /(?:a\s*:|answer\s*:|答\s*[：: ]|答案\s*[：:])/gi;
const QUESTION_MARK = /[?？]\s*$/;
const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4']);
const CONFIDENCE = {
  explicit: 1,
  structure: 0.75,
  questionMark: 0.6,
  list: 0.5
} as const;

const toBlocks = (html: string): Block[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) {
    console.warn('[qaDetection] toBlocks: No container element found');
    return [];
  }

  const blocks: Block[] = [];
  
  // Helper function to process a node and extract blocks
  const processNode = (node: Node): void => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toUpperCase();
      
      // Special handling for PRE and CODE blocks - preserve them as-is
      if (tagName === 'PRE' || tagName === 'CODE') {
        const text = element.textContent?.trim() ?? '';
        if (text) {
          blocks.push({ element, text });
        }
        return;
      }
      
      // Check if element contains <br> tags - split into multiple blocks
      // But only for non-pre elements
      const brElements = element.querySelectorAll('br');
      if (brElements.length > 0 && tagName !== 'PRE') {
        // Split by <br> tags to handle Q/A pairs within single paragraph
        const html = element.innerHTML;
        const parts = html.split(/<br[^>]*>/gi);
        
        parts.forEach((part) => {
          const trimmed = part.trim();
          if (!trimmed) return;
          
          const tempDiv = doc.createElement('div');
          tempDiv.innerHTML = trimmed;
          const text = tempDiv.textContent?.trim() ?? '';
          
          if (text) {
            // Create a clone of the original element with just this part
            const partElement = element.cloneNode(false) as Element;
            partElement.innerHTML = trimmed;
            blocks.push({ element: partElement, text });
          }
        });
      } else {
        // No <br> tags, treat as single block
        const text = element.textContent?.trim() ?? '';
        if (text) {
          blocks.push({ element, text });
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      // Handle text nodes that might contain Q/A pairs
      const text = node.textContent?.trim() ?? '';
      if (text) {
        // Split by line breaks in text content
        const lines = text.split(/\n+/).filter(line => line.trim());
        lines.forEach((line) => {
          const wrapper = doc.createElement('p');
          wrapper.textContent = line;
          blocks.push({ element: wrapper, text: line });
        });
      }
    }
  };
  
  // If container has no child elements, treat entire content as blocks
  if (container.children.length === 0) {
    // No child elements - might be plain text or single text node
    const text = container.textContent?.trim() ?? '';
    if (text) {
      console.log('[qaDetection] toBlocks: No child elements, splitting by line breaks');
      // Split by line breaks
      const lines = text.split(/\n+/).filter(line => line.trim());
      lines.forEach((line) => {
        const wrapper = doc.createElement('p');
        wrapper.textContent = line;
        blocks.push({ element: wrapper, text: line });
      });
    }
  } else {
    // Process all child nodes
    container.childNodes.forEach(processNode);
  }

  console.log(`[qaDetection] toBlocks: Extracted ${blocks.length} blocks`);
  if (blocks.length > 0) {
    console.log('[qaDetection] First block text:', blocks[0].text.substring(0, 100));
  }
  
  return blocks;
};

const asHtml = (element: Element) => {
  // For PRE and CODE elements, use outerHTML to preserve structure
  const tagName = element.tagName.toUpperCase();
  if (tagName === 'PRE' || tagName === 'CODE') {
    return element.outerHTML;
  }
  return element.innerHTML || element.outerHTML;
};

/**
 * Remove Q/A markers from HTML at the DOM level
 * This handles cases where markers are interrupted by HTML tags
 * e.g., "问<strong>：</strong>" or multiple markers in nested elements
 */
const removeMarkerFromHtml = (html: string, markerPattern: RegExp): string => {
  if (!html.trim()) {
    return html;
  }

  // Parse HTML into DOM
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstElementChild;

  if (!container) {
    // Fallback: use simple string replace
    return html.replace(markerPattern, '').trim();
  }

  // Walk through all text nodes and remove markers
  const walkTextNodes = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      // Clean markers from text content
      const originalText = node.textContent || '';
      const cleanedText = originalText.replace(markerPattern, '');

      if (cleanedText !== originalText) {
        node.textContent = cleanedText;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Recursively process child nodes
      Array.from(node.childNodes).forEach(walkTextNodes);
    }
  };

  walkTextNodes(container);

  // Return cleaned HTML
  const result = container.innerHTML;
  return result.trim();
};

const dedupeBySerialized = (pairs: DetectedPair[]) => {
  // Dedupe by text content (not HTML) and keep highest confidence
  const seenByText = new Map<string, DetectedPair>();
  
  // Helper to normalize text (remove Q/A prefixes and extra whitespace for comparison)
  const normalizeText = (text: string): string => {
    return text
      .replace(EXPLICIT_QUESTION, '')
      .replace(EXPLICIT_ANSWER, '')
      .replace(/\s+/g, ' ')  // Normalize all whitespace to single space
      .trim()
      .toLowerCase();  // Case-insensitive comparison
  };
  
  pairs.forEach((pair) => {
    // Extract text content for comparison
    const parser = new DOMParser();
    const frontDoc = parser.parseFromString(pair.frontHtml, 'text/html');
    const backDoc = parser.parseFromString(pair.backHtml, 'text/html');
    const frontText = normalizeText(frontDoc.body.textContent?.trim() ?? '');
    const backText = normalizeText(backDoc.body.textContent?.trim() ?? '');
    const key = `${frontText}|||${backText}`;  // Use longer separator to avoid collision
    
    const existing = seenByText.get(key);
    // Keep the pair with higher confidence
    if (!existing || pair.confidence > existing.confidence) {
      seenByText.set(key, pair);
    }
  });
  
  console.log(`[qaDetection] dedupeBySerialized: ${pairs.length} pairs -> ${seenByText.size} unique pairs`);
  
  return Array.from(seenByText.values());
};

const runExplicitMarkers = (blocks: Block[]): DetectedPair[] => {
  const pairs: DetectedPair[] = [];
  
  console.log('[qaDetection] runExplicitMarkers: Processing', blocks.length, 'blocks');
  
  for (let i = 0; i < blocks.length; i += 1) {
    const currentBlock = blocks[i];
    
    // Find block with "问："
    if (!EXPLICIT_QUESTION.test(currentBlock.text)) {
      continue;
    }
    
    console.log('[qaDetection] Found question at block', i, ':', currentBlock.text.substring(0, 50));
    
    // Collect question blocks: from "问：" until "答："
    const questionBlocks: Block[] = [currentBlock];
    let answerStartIdx = -1;
    
    for (let j = i + 1; j < blocks.length; j += 1) {
      if (EXPLICIT_ANSWER.test(blocks[j].text)) {
        answerStartIdx = j;
        console.log('[qaDetection] Found answer at block', j, ':', blocks[j].text.substring(0, 50));
        break;
      }
      questionBlocks.push(blocks[j]);
    }
    
    // If no answer found, skip this question
    if (answerStartIdx === -1) {
      console.warn('[qaDetection] No answer found for question at block', i);
      continue;
    }
    
    // Collect answer blocks: from "答：" until next "问：" or end
    const answerBlocks: Block[] = [];
    let nextQuestionIdx = blocks.length;
    
    for (let j = answerStartIdx; j < blocks.length; j += 1) {
      // Stop if we hit another question (but not the first answer block)
      if (j > answerStartIdx && EXPLICIT_QUESTION.test(blocks[j].text)) {
        nextQuestionIdx = j;
        break;
      }
      answerBlocks.push(blocks[j]);
    }
    
    console.log('[qaDetection] Question has', questionBlocks.length, 'blocks, answer has', answerBlocks.length, 'blocks');
    
    // Build question HTML by joining all question blocks
    let questionHtml = questionBlocks
      .map(block => asHtml(block.element))
      .join('');

    // Remove all Q markers using DOM-based cleaning
    questionHtml = removeMarkerFromHtml(questionHtml, QUESTION_MARKER_CLEANUP);

    // Build answer HTML by joining all answer blocks
    let answerHtml = answerBlocks
      .map(block => asHtml(block.element))
      .join('');

    // Remove all A markers using DOM-based cleaning
    answerHtml = removeMarkerFromHtml(answerHtml, ANSWER_MARKER_CLEANUP);
    
    if (questionHtml && answerHtml) {
      pairs.push({
        frontHtml: questionHtml,
        backHtml: answerHtml,
        confidence: CONFIDENCE.explicit,
        strategy: 'explicit'
      });
      console.log('[qaDetection] Created pair - Q length:', questionHtml.length, 'A length:', answerHtml.length);
    }
    
    // Skip to next question
    i = nextQuestionIdx - 1;
  }
  
  return pairs;
};

const runStructureHints = (blocks: Block[]): DetectedPair[] => {
  const pairs: DetectedPair[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (!HEADING_TAGS.has(block.element.tagName) && block.element.tagName !== 'STRONG') {
      continue;
    }
    const answer = blocks[i + 1];
    if (!answer) {
      continue;
    }
    pairs.push({
      frontHtml: asHtml(block.element),
      backHtml: asHtml(answer.element),
      confidence: CONFIDENCE.structure,
      strategy: 'structure'
    });
  }
  return pairs;
};

const runQuestionMarkHeuristic = (blocks: Block[]): DetectedPair[] => {
  const pairs: DetectedPair[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (!QUESTION_MARK.test(block.text)) {
      continue;
    }
    const answer = blocks[i + 1];
    if (!answer) {
      continue;
    }
    pairs.push({
      frontHtml: asHtml(block.element),
      backHtml: asHtml(answer.element),
      confidence: CONFIDENCE.questionMark,
      strategy: 'questionMark'
    });
  }
  return pairs;
};

const runListHeuristic = (html: string): DetectedPair[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const pairs: DetectedPair[] = [];

  doc.querySelectorAll('ol, ul').forEach((list) => {
    const items = Array.from(list.children).filter((child) => child.textContent?.trim());
    for (let i = 0; i < items.length - 1; i += 2) {
      const question = items[i] as Element;
      const answer = items[i + 1] as Element;
      pairs.push({
        frontHtml: question.innerHTML,
        backHtml: answer.innerHTML,
        confidence: CONFIDENCE.list,
        strategy: 'list'
      });
    }
  });

  return pairs;
};

// Ultra-simple approach: split HTML string directly by Q/A markers
const detectExplicitPairsSimple = (html: string): DetectedPair[] => {
  console.log('[qaDetection] detectExplicitPairsSimple: Starting with HTML length:', html.length);
  
  const pairs: DetectedPair[] = [];
  
  // Strategy: Find all Q: and A: markers in the HTML string directly
  // Split content by these markers
  
  // First, find all Q markers
  const qPattern = /(问\s*[：:]|Q\s*:|question\s*:|问题\s*[：:])/gi;
  const aPattern = /(答\s*[：:]|A\s*:|answer\s*:|答案\s*[：:])/gi;
  
  // Find all question positions
  const qMatches: Array<{index: number; marker: string}> = [];
  let match: RegExpExecArray | null;
  
  while ((match = qPattern.exec(html)) !== null) {
    qMatches.push({ index: match.index, marker: match[0] });
  }
  
  // Find all answer positions
  const aMatches: Array<{index: number; marker: string}> = [];
  while ((match = aPattern.exec(html)) !== null) {
    aMatches.push({ index: match.index, marker: match[0] });
  }
  
  console.log(`[qaDetection] Found ${qMatches.length} Q markers, ${aMatches.length} A markers`);
  
  // For each Q, find its corresponding A, and then the next Q
  for (let i = 0; i < qMatches.length; i++) {
    const qMatch = qMatches[i];
    
    // Find first A after this Q
    const aMatch = aMatches.find(a => a.index > qMatch.index);
    if (!aMatch) {
      console.warn(`[qaDetection] No answer found for Q at position ${qMatch.index}`);
      continue;
    }
    
    // Find next Q (if exists)
    const nextQMatch = qMatches[i + 1];
    
    // Extract HTML slices
    //  Front: from Q marker to A marker
    //  Back: from A marker to next Q marker (or end)
    const frontStart = qMatch.index;
    const frontEnd = aMatch.index;
    const backStart = aMatch.index;
    const backEnd = nextQMatch ? nextQMatch.index : html.length;
    
    let frontHtml = html.substring(frontStart, frontEnd);
    let backHtml = html.substring(backStart, backEnd);

    // Remove Q/A markers using DOM-based cleaning (handles HTML tags interrupting markers)
    frontHtml = removeMarkerFromHtml(frontHtml, QUESTION_MARKER_CLEANUP);
    backHtml = removeMarkerFromHtml(backHtml, ANSWER_MARKER_CLEANUP);
    
    console.log(`[qaDetection] Pair ${i + 1}:`);
    console.log('  Front HTML preview:', frontHtml.substring(0, 80));
    console.log('  Back HTML preview:', backHtml.substring(0, 80));
    
    if (frontHtml && backHtml) {
      pairs.push({
        frontHtml,
        backHtml,
        confidence: CONFIDENCE.explicit,
        strategy: 'explicit'
      });
    }
  }
  
  return pairs;
};

export const detectQuestionAnswerPairs = (
  html: string,
  options: DetectionOptions
): DetectedPair[] => {
  console.log('[qaDetection] Starting detection with HTML length:', html.length);
  console.log('[qaDetection] Heuristics enabled:', options.heuristics);
  
  let pairs: DetectedPair[] = [];

  if (options.heuristics.explicitMarkers) {
    // Use new simple approach
    pairs = pairs.concat(detectExplicitPairsSimple(html));
    console.log(`[qaDetection] detectExplicitPairsSimple found ${pairs.length} pairs`);
  }

  // Fallback to other methods if needed
  if (pairs.length === 0) {
    const blocks = toBlocks(html);
    
    if (options.heuristics.structureHints) {
      const structurePairs = runStructureHints(blocks);
      console.log(`[qaDetection] structureHints found ${structurePairs.length} pairs`);
      pairs = pairs.concat(structurePairs);
    }

    if (options.heuristics.questionMarks) {
      const questionPairs = runQuestionMarkHeuristic(blocks);
      console.log(`[qaDetection] questionMarks found ${questionPairs.length} pairs`);
      pairs = pairs.concat(questionPairs);
    }

    if (options.heuristics.listTable) {
      const listPairs = runListHeuristic(html);
      console.log(`[qaDetection] listTable found ${listPairs.length} pairs`);
      pairs = pairs.concat(listPairs);
    }
  }

  console.log(`[qaDetection] Total pairs before deduplication: ${pairs.length}`);
  const deduped = dedupeBySerialized(pairs);
  console.log(`[qaDetection] Final pairs after deduplication: ${deduped.length}`);
  
  if (typeof options.maxPairs === 'number') {
    return deduped.slice(0, options.maxPairs);
  }
  return deduped;
};
