import express from 'express';

const router = express.Router();
const deprecationNotice =
  'This endpoint is deprecated, please use the GraphQL API instead.';

router.get('/:space/proposals', async (req, res) => {
  return res.json({ error: deprecationNotice });
});

router.get('/:space/proposal/:id', async (req, res) => {
  return res.json({ error: deprecationNotice });
});

router.get('/voters', async (req, res) => {
  return res.json({ error: deprecationNotice });
});

export default router;
