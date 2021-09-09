import express from 'express';
import {
  spaces,
  spacesActiveProposals,
  spaceFollowers
} from '../helpers/spaces';
import relayer from '../helpers/relayer';
import { sendError } from '../helpers/utils';
import { addOrUpdateSpace, loadSpace } from '../helpers/adapters/mysql';
import ingestor from '../ingestor';
import pkg from '../../package.json';

const router = express.Router();
const network = process.env.NETWORK || 'testnet';

router.get('/', (req, res) => {
  return res.json({
    name: pkg.name,
    network,
    version: pkg.version,
    tag: 'alpha',
    relayer: relayer.address
  });
});

router.get('/explore', (req, res) => {
  const spacesMetadata = {};
  const networks = {};
  const strategies = {};
  const plugins = {};
  const skins = {};
  Object.entries(spaces).forEach(([id, space]: any) => {
    if (space.skin)
      skins[space.skin] = skins[space.skin] ? skins[space.skin] + 1 : 1;

    networks[space.network] = networks[space.network]
      ? networks[space.network] + 1
      : 1;

    space.strategies.forEach(strategy => {
      strategies[strategy.name] = strategies[strategy.name]
        ? strategies[strategy.name] + 1
        : 1;
    });

    Object.keys(space.plugins || {}).forEach(plugin => {
      plugins[plugin] = plugins[plugin] ? plugins[plugin] + 1 : 1;
    });

    if (!space.private) {
      spacesMetadata[id] = {
        name: space.name,
        avatar: space.avatar || undefined,
        skin: space.skin || undefined,
        activeProposals: spacesActiveProposals[id] || undefined,
        followers: spaceFollowers[id] || undefined,
        validation: space.validation
      };
    }
  });

  return res.json({
    spaces: spacesMetadata,
    networks,
    strategies,
    skins,
    plugins
  });
});

router.get('/spaces/:key?', (req, res) => {
  const { key } = req.params;
  return res.json(key ? spaces[key] : spaces);
});

router.get('/spaces/:key/poke', async (req, res) => {
  const { key } = req.params;
  const space = await loadSpace(key);
  if (space) {
    await addOrUpdateSpace(key, space);
    spaces[key] = space;
  }
  return res.json(space);
});

router.post('/message', async (req, res) => {
  try {
    const result = await ingestor(req.body, 'personal-sign');
    return res.json(result);
  } catch (e) {
    return sendError(res, e);
  }
});

router.post('/msg', async (req, res) => {
  try {
    const result = await ingestor(req.body, 'typed-data');
    return res.json(result);
  } catch (e) {
    return sendError(res, e);
  }
});

export default router;
