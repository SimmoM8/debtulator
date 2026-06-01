module.exports = {
  documentDirectory: 'file:///tmp/',
  cacheDirectory: 'file:///tmp/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: async () => {},
  getInfoAsync: async () => ({ exists: false, size: 0 }),
};
