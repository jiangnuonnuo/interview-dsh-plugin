const proxy = new Proxy(
  {},
  {
    get(_target, key) {
      if (key === '__esModule') {
        return true;
      }
      if (key === 'default') {
        return proxy;
      }
      return typeof key === 'string' ? key : 'css';
    },
  },
);

module.exports = proxy;
