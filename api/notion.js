const { Client } = require('@notionhq/client');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.NOTION_TOKEN) {
    return res.status(500).json({ error: 'NOTION_TOKEN not configured' });
  }

  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const { action, query, database_id, payload } = req.body || {};

  try {
    if (action === 'search') {
      const results = await notion.search({
        query: query || '',
        page_size: 5,
        sort: { direction: 'descending', timestamp: 'last_edited_time' }
      });
      return res.json({
        results: results.results.map(p => ({
          id: p.id,
          title: p.object === 'page'
            ? (p.properties?.title?.title?.[0]?.plain_text || p.properties?.Name?.title?.[0]?.plain_text || 'Untitled')
            : (p.title?.[0]?.plain_text || 'Untitled'),
          timestamp: p.last_edited_time
        }))
      });
    }

    if (action === 'query_db') {
      const results = await notion.databases.query({
        database_id,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: 100,
        ...payload
      });
      return res.json(results);
    }

    if (action === 'create_page') {
      const page = await notion.pages.create(payload);
      return res.json(page);
    }

    if (action === 'create_db') {
      const db = await notion.databases.create(payload);
      return res.json(db);
    }

    if (action === 'update_page') {
      const { page_id, ...rest } = payload;
      const page = await notion.pages.update({ page_id, ...rest });
      return res.json(page);
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
