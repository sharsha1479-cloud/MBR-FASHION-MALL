const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');

const MAX_BANNERS = 3;

const getUploadedFilename = (file) => {
  if (!file) return '';
  return file.filename;
};

exports.getBanners = asyncHandler(async (req, res) => {
  const includeInactive = req.user?.role === 'admin' && req.query.all === 'true';

  const banners = await prisma.banner.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  res.json(banners);
});

exports.createBanner = asyncHandler(async (req, res) => {
  const { link, sortOrder, isActive } = req.body;
  const image = getUploadedFilename(req.file);

  const bannerCount = await prisma.banner.count();
  if (bannerCount >= MAX_BANNERS) {
    res.status(400);
    throw new Error('You can add up to 3 homepage banners.');
  }

  if (!image) {
    res.status(400);
    throw new Error('Banner image is required.');
  }

  const banner = await prisma.banner.create({
    data: {
      title: null,
      subtitle: null,
      image,
      link: link ? String(link).trim() : null,
      sortOrder: parseInt(sortOrder, 10) || 0,
      isActive: isActive === undefined ? true : String(isActive).toLowerCase() === 'true',
    },
  });

  res.status(201).json(banner);
});

exports.updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { link, sortOrder, isActive } = req.body;
  const image = getUploadedFilename(req.file);

  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) {
    res.status(404);
    throw new Error('Banner not found.');
  }

  const banner = await prisma.banner.update({
    where: { id },
    data: {
      title: null,
      subtitle: null,
      image: image || existing.image,
      link: link !== undefined ? String(link).trim() || null : existing.link,
      sortOrder: sortOrder !== undefined && sortOrder !== '' ? parseInt(sortOrder, 10) || 0 : existing.sortOrder,
      isActive: isActive === undefined ? existing.isActive : String(isActive).toLowerCase() === 'true',
    },
  });

  res.json(banner);
});

exports.deleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) {
    res.status(404);
    throw new Error('Banner not found.');
  }

  await prisma.banner.delete({ where: { id } });
  res.json({ message: 'Banner deleted successfully.' });
});
