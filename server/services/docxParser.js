const mammoth = require('mammoth');
const cheerio = require('cheerio');

/**
 * Parse a docx file and extract structured content
 * @param {Buffer} buffer - The docx file buffer
 * @returns {Promise<Object>} Structured document content
 */
async function parseDocx(buffer) {
  // Convert docx to HTML with embedded images
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement((image) => {
        return image.read('base64').then((imageBuffer) => {
          return {
            src: `data:${image.contentType};base64,${imageBuffer}`,
          };
        });
      }),
    }
  );

  const html = result.value;
  const $ = cheerio.load(html);

  const blocks = [];
  let blockIndex = { p: 0, t: 0, i: 0, h: 0, l: 0 };

  // Process top-level elements
  $('body').children().each((index, element) => {
    const $el = $(element);
    const tagName = element.tagName.toLowerCase();

    const block = extractBlock($, $el, tagName, blockIndex);
    if (block) {
      blocks.push(block);
    }
  });

  return { blocks };
}

/**
 * Extract a block from an element
 */
function extractBlock($, $el, tagName, blockIndex) {
  // Handle headings
  if (/^h[1-6]$/.test(tagName)) {
    const id = `h-${blockIndex.h++}`;
    const content = $el.text().trim();
    const html = $.html($el);
    return {
      type: 'heading',
      level: parseInt(tagName.charAt(1)),
      id,
      content,
      html,
    };
  }

  // Handle paragraphs
  if (tagName === 'p') {
    const id = `p-${blockIndex.p++}`;
    const content = $el.text().trim();
    const html = $.html($el);

    // Check if paragraph contains only an image
    const $img = $el.find('img');
    if ($img.length > 0 && content === '') {
      const imgId = `i-${blockIndex.i++}`;
      return {
        type: 'image',
        id: imgId,
        src: $img.attr('src'),
        html: $.html($img),
      };
    }

    return {
      type: 'paragraph',
      id,
      content,
      html,
    };
  }

  // Handle tables
  if (tagName === 'table') {
    const id = `t-${blockIndex.t++}`;
    const rows = [];

    $el.find('tr').each((rowIdx, tr) => {
      const cells = [];
      $(tr).find('td, th').each((cellIdx, td) => {
        const $td = $(td);
        cells.push({
          content: $td.text().trim(),
          html: $.html($td),
          isHeader: td.tagName.toLowerCase() === 'th',
        });
      });
      rows.push({ cells });
    });

    return {
      type: 'table',
      id,
      rows,
      html: $.html($el),
    };
  }

  // Handle unordered lists
  if (tagName === 'ul') {
    const id = `l-${blockIndex.l++}`;
    const items = [];

    $el.find('> li').each((idx, li) => {
      items.push({
        content: $(li).text().trim(),
        html: $.html(li),
      });
    });

    return {
      type: 'list',
      listType: 'unordered',
      id,
      items,
      content: items.map((i) => i.content).join('\n'),
      html: $.html($el),
    };
  }

  // Handle ordered lists
  if (tagName === 'ol') {
    const id = `l-${blockIndex.l++}`;
    const items = [];

    $el.find('> li').each((idx, li) => {
      items.push({
        content: $(li).text().trim(),
        html: $.html(li),
      });
    });

    return {
      type: 'list',
      listType: 'ordered',
      id,
      items,
      content: items.map((i) => i.content).join('\n'),
      html: $.html($el),
    };
  }

  // Handle standalone images
  if (tagName === 'img') {
    const id = `i-${blockIndex.i++}`;
    return {
      type: 'image',
      id,
      src: $el.attr('src'),
      html: $.html($el),
    };
  }

  // Fallback: treat as paragraph
  const id = `p-${blockIndex.p++}`;
  return {
    type: 'paragraph',
    id,
    content: $el.text().trim(),
    html: $.html($el),
  };
}

module.exports = { parseDocx };
