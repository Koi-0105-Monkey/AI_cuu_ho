// src/__mocks__/leaflet.js
// Manual mock for leaflet to prevent JSDOM hang issues with Leaflet ESM

const vi = globalThis.vi || { fn: () => () => {} };

const divIcon = () => ({ options: {}, _leaflet_id: 1, className: '', html: '' });

function DefaultIcon() {}
DefaultIcon.prototype._getIconUrl = () => '';
DefaultIcon.mergeOptions = () => {};

const Icon = { Default: DefaultIcon };

const L = {
  Icon,
  divIcon,
  map: () => ({
    setView: () => ({}),
    on: () => {},
    remove: () => {},
  }),
};

module.exports = L;
module.exports.default = L;
module.exports.Icon = Icon;
module.exports.divIcon = divIcon;
