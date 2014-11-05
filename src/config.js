var config = {
  isWindow: (typeof window !== 'undefined'),
  protocol: (typeof location !== 'undefined' && location.protocol === "https:")? "https" : "http",
  version: '2'
};
config.appbaseApiServer = config.protocol + "://api.appbase.io";

module.exports = config;