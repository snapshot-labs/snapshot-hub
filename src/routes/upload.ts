import express from 'express';
import multer from 'multer';
import fs from 'fs';
import pinataSDK from '@pinata/sdk';
import { sendError } from '../helpers/utils';

const router = express.Router();

const fileSize = 1000 * 1000;
const upload = multer({ dest: 'uploads/', limits: { fileSize } });
const pinata = pinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_API_KEY
);

router.post('/upload', upload.single('file'), async (req, res) => {
  const path = `${req.file.destination}${req.file.filename}`;
  const readableStreamForFile = fs.createReadStream(path);
  try {
    const result = await pinata.pinFileToIPFS(readableStreamForFile);
    const file = {
      ipfs_hash: result.IpfsHash,
      mimetype: req.file.mimetype,
      size: req.file.size
    };
    res.json({ file });
  } catch (error) {
    console.log('[upload]', error);
    return sendError(res, 'upload failed');
  }
  await fs.unlinkSync(path);
});

export default router;
