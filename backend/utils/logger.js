const isProduction = process.env.NODE_ENV === 'production';

const write = (level, message, meta = {}) => {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (!isProduction || level !== 'debug') {
    console.log(line);
  }
};

module.exports = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
  debug: (message, meta) => write('debug', message, meta),
};
