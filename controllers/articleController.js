import ArticleModel from '../models/articleModel.js';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

marked.setOptions({
  gfm: true,
  breaks: true
});

function stripMarkdown(text = '') {
  return String(text)
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[`*_>#~-]/g, '')
    .replace(/\|/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getDashboard(req, res) {
  try {
    const category = String(req.query.category || '').toLowerCase();
    const q = String(req.query.q || '').trim();

    const limit = 6;
    const offset = 0;
    const page = 1;

    const allowed = new Set(['national', 'international']);
    const categorySlug = allowed.has(category) ? category : null;
    const term = q.length ? q : null;

    const [rows] = await ArticleModel.search({
      categorySlug,
      term,
      limit,
      offset
    });

    const cleanedRows = rows.map((article) => ({
      ...article,
      content_preview: stripMarkdown(article.content || '')
    }));

    const [[countRow]] = await ArticleModel.countSearch({
      categorySlug,
      term
    });

    const total = Number(countRow.total || 0);
    const hasMore = rows.length < total;

    return res.render('index', {
      title: 'Dashboard',
      articles: cleanedRows,
      q,
      category: categorySlug,
      userName: req.session?.userName || null,
      userRole: req.session?.userRole || null,
      page,
      hasMore
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
}

export async function getDashboardMore(req, res) {
  try {
    const category = String(req.query.category || '').toLowerCase();
    const q = String(req.query.q || '').trim();
    const page = Math.max(2, Number(req.query.page || 2));

    const limit = 6;
    const offset = (page - 1) * limit;

    const allowed = new Set(['national', 'international']);
    const categorySlug = allowed.has(category) ? category : null;
    const term = q.length ? q : null;

    const [rows] = await ArticleModel.search({
      categorySlug,
      term,
      limit,
      offset
    });

    const [[countRow]] = await ArticleModel.countSearch({
      categorySlug,
      term
    });

    const total = Number(countRow.total || 0);
    const hasMore = offset + rows.length < total;

    return res.json({
      articles: rows.map((a) => ({
        article_id: a.article_id,
        title: a.title,
        content_preview: stripMarkdown(a.content || ''),
        category_name: a.category_name,
        published_at: a.published_at
      })),
      hasMore,
      nextPage: hasMore ? page + 1 : null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Internal Server Error'
    });
  }
}

export async function getArticleDetail(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await ArticleModel.getById(id);

    if (!rows.length) {
      return res.status(404).send('Article not found');
    }

    const article = rows[0];

    const rawHtml = marked.parse(article.content || '');

    const articleHtml = sanitizeHtml(rawHtml, {
      allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'ul', 'ol', 'li',
        'blockquote',
        'strong', 'b', 'em', 'i',
        'code', 'pre',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
        'a', 'img'
      ],
      allowedAttributes: {
        a: ['href', 'target', 'rel', 'title'],
        img: ['src', 'alt', 'title'],
        th: ['align'],
        td: ['align']
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      allowedSchemesByTag: {
        img: ['http', 'https']
      },
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', {
          target: '_blank',
          rel: 'noopener noreferrer'
        })
      }
    });

    return res.render('articles/show', {
      title: article.title,
      article,
      articleHtml,
      userName: req.session?.userName || null,
      userRole: req.session?.userRole || null,
      hideFooter: false
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
}

export async function getCreateArticle(req, res) {
  try {
    return res.render('articles/create', {
      title: 'Write Article',
      error: null,
      success: req.query.success === '1' ? 'Article published successfully.' : null,
      userName: req.session?.userName || null,
      userEmail: req.session?.userEmail || null,
      userRole: req.session?.userRole || null,
      hideFooter: true,
      formData: {
        title: '',
        categorySlug: '',
        content: ''
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
}

export async function postCreateArticle(req, res) {
  try {
    const { title, categorySlug, content } = req.body;

    if (!title || !categorySlug || !content) {
      return res.status(400).render('articles/create', {
        title: 'Write Article',
        error: 'Title, category, and content are required.',
        success: null,
        userName: req.session?.userName || null,
        userEmail: req.session?.userEmail || null,
        userRole: req.session?.userRole || null,
        hideFooter: true,
        formData: {
          title: title || '',
          categorySlug: categorySlug || '',
          content: content || ''
        }
      });
    }

    const allowed = new Set(['national', 'international']);
    if (!allowed.has(categorySlug)) {
      return res.status(400).render('articles/create', {
        title: 'Write Article',
        error: 'Invalid category selected.',
        success: null,
        userName: req.session?.userName || null,
        userEmail: req.session?.userEmail || null,
        userRole: req.session?.userRole || null,
        hideFooter: true,
        formData: {
          title,
          categorySlug,
          content
        }
      });
    }

    await ArticleModel.create({
      title: String(title).trim(),
      content: String(content).trim(),
      categorySlug: String(categorySlug).trim(),
      editorId: req.session.userId
    });

    return res.redirect('/articles/create?success=1');
  } catch (err) {
    console.error(err);
    return res.status(500).render('articles/create', {
      title: 'Write Article',
      error: 'Failed to publish article.',
      success: null,
      userName: req.session?.userName || null,
      userEmail: req.session?.userEmail || null,
      userRole: req.session?.userRole || null,
      hideFooter: true,
      formData: {
        title: req.body.title || '',
        categorySlug: req.body.categorySlug || '',
        content: req.body.content || ''
      }
    });
  }
}

export async function deleteArticle(req, res) {
  try {
    const { id } = req.params;
    await ArticleModel.deleteById(id);
    return res.redirect('/admin');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
}
